from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import io
import logging
import uuid
import httpx
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Literal
from datetime import datetime, timezone, timedelta

import bcrypt
import secrets

from email_service import send_email, render_reminder_html, render_arco_received_html
from pdf_service import generate_contract_pdf
from audit import log_audit
from payments_service import create_contract_checkout, get_status as stripe_get_status, handle_webhook as stripe_handle_webhook


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ------------- Models -------------
class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    role: Literal["admin", "inquilino"] = "admin"

class RoleUpdate(BaseModel):
    role: Literal["admin", "inquilino"]

class Property(BaseModel):
    property_id: str
    nombre: str
    direccion: str
    ciudad: str
    tipo: str
    monto_renta: float
    imagen: Optional[str] = None
    ocupada: bool = True

class Contract(BaseModel):
    contract_id: str
    inquilino_nombre: str
    inquilino_email: str
    property_id: str
    propiedad_nombre: str
    monto_renta: float
    fecha_inicio: str
    fecha_vencimiento: str
    estatus: Literal["pagado", "pendiente", "atrasado"]
    firmado: bool = False
    firmado_at: Optional[str] = None
    signature_image: Optional[str] = None

class SignPayload(BaseModel):
    signature_image: Optional[str] = None  # base64 data URL

class ArcoRequest(BaseModel):
    request_id: str
    tipo: Literal["acceso", "rectificacion", "cancelacion", "oposicion"]
    nombre_completo: str
    email: EmailStr
    telefono: Optional[str] = None
    identificacion_tipo: str
    identificacion_numero: str
    descripcion: str
    estatus: Literal["pendiente", "en_proceso", "resuelto", "rechazado"] = "pendiente"
    notas_resolucion: Optional[str] = None
    created_at: str
    resolved_at: Optional[str] = None

class ArcoCreate(BaseModel):
    tipo: Literal["acceso", "rectificacion", "cancelacion", "oposicion"]
    nombre_completo: str
    email: EmailStr
    telefono: Optional[str] = None
    identificacion_tipo: str
    identificacion_numero: str
    descripcion: str

class ArcoUpdate(BaseModel):
    estatus: Literal["pendiente", "en_proceso", "resuelto", "rechazado"]
    notas_resolucion: Optional[str] = None

class AuditLogModel(BaseModel):
    log_id: str
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    user_role: Optional[str] = None
    action: str
    target_type: str = ""
    target_id: str = ""
    details: dict = {}
    created_at: str

# ------------- Auth -------------
DEMO_TENANT_EMAILS = [
    "jorge.tenant@revant.mx",
    "maria.tenant@revant.mx",
    "carlos.tenant@revant.mx",
    "ana.tenant@revant.mx",
    "luis.tenant@revant.mx",
]


def _set_session_cookie(response: Response, token: str):
    response.set_cookie(
        key="session_token", value=token,
        httponly=True, secure=True, samesite="none",
        max_age=7 * 24 * 3600, path="/",
    )

async def _create_session_token(user_id: str) -> str:
    token = uuid.uuid4().hex + uuid.uuid4().hex
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc),
    })
    return token


class RegisterPayload(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=2)

class LoginPayload(BaseModel):
    email: EmailStr
    password: str

class ForgotPasswordPayload(BaseModel):
    email: EmailStr

class ResetPasswordPayload(BaseModel):
    token: str
    password: str = Field(min_length=6)

class CheckoutPayload(BaseModel):
    contract_id: str
    origin: str  # window.location.origin from frontend

class CheckoutMonthsPayload(CheckoutPayload):
    months: int = Field(default=1, ge=1, le=12)

async def get_current_user(request: Request) -> User:
    token = request.cookies.get("session_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="No autenticado")

    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Sesión inválida")

    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at and expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Sesión expirada")

    user_doc = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    return User(**user_doc)

@api_router.post("/auth/session")
async def create_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id requerido")

    async with httpx.AsyncClient(timeout=15) as http:
        r = await http.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id},
        )
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="OAuth inválido")
    data = r.json()

    email = data["email"]
    role = "inquilino" if email.lower() in DEMO_TENANT_EMAILS else "admin"

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": data["name"], "picture": data.get("picture")}},
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": data["name"],
            "picture": data.get("picture"),
            "role": role,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    token = data["session_token"]
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc),
    })

    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7 * 24 * 3600,
        path="/",
    )

    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    await ensure_demo_data()
    return {"user": User(**user_doc).model_dump(), "session_token": token}

@api_router.post("/auth/register")
async def auth_register(payload: RegisterPayload, response: Response):
    email = payload.email.lower()
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=409, detail="Este correo ya está registrado")
    role = "inquilino" if email in DEMO_TENANT_EMAILS else "admin"
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    await db.users.insert_one({
        "user_id": user_id,
        "email": email,
        "name": payload.name,
        "picture": None,
        "role": role,
        "password_hash": hash_password(payload.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    token = await _create_session_token(user_id)
    _set_session_cookie(response, token)
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    await ensure_demo_data()
    return {"user": User(**user_doc).model_dump(), "session_token": token}

@api_router.post("/auth/login")
async def auth_login(payload: LoginPayload, request: Request, response: Response):
    email = payload.email.lower()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"

    # Brute-force lockout: 5 fails / 15 min
    attempt = await db.login_attempts.find_one({"identifier": identifier}, {"_id": 0})
    if attempt and attempt.get("count", 0) >= 5:
        locked_until = attempt.get("locked_until")
        if isinstance(locked_until, str):
            locked_until = datetime.fromisoformat(locked_until)
        if locked_until and locked_until.tzinfo is None:
            locked_until = locked_until.replace(tzinfo=timezone.utc)
        if locked_until and locked_until > datetime.now(timezone.utc):
            mins = int((locked_until - datetime.now(timezone.utc)).total_seconds() // 60) + 1
            raise HTTPException(status_code=429, detail=f"Demasiados intentos. Intenta de nuevo en {mins} min.")

    user_doc = await db.users.find_one({"email": email}, {"_id": 0})
    if not user_doc or not user_doc.get("password_hash") or not verify_password(payload.password, user_doc["password_hash"]):
        new_count = (attempt.get("count", 0) if attempt else 0) + 1
        update = {"identifier": identifier, "count": new_count, "last_attempt": datetime.now(timezone.utc).isoformat()}
        if new_count >= 5:
            update["locked_until"] = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()
        await db.login_attempts.update_one({"identifier": identifier}, {"$set": update}, upsert=True)
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")

    await db.login_attempts.delete_one({"identifier": identifier})
    token = await _create_session_token(user_doc["user_id"])
    _set_session_cookie(response, token)
    user_doc.pop("password_hash", None)
    return {"user": User(**user_doc).model_dump(), "session_token": token}

@api_router.post("/auth/forgot-password")
async def forgot_password(payload: ForgotPasswordPayload):
    email = payload.email.lower()
    user_doc = await db.users.find_one({"email": email}, {"_id": 0})
    # Always return success to avoid user enumeration
    if user_doc:
        token = secrets.token_urlsafe(32)
        await db.password_reset_tokens.insert_one({
            "token": token,
            "user_id": user_doc["user_id"],
            "email": email,
            "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
            "used": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        # Reset link MUST come from request origin in real app; here we log + email
        link_path = f"/reset-password?token={token}"
        logger.info("[PASSWORD RESET] %s -> %s", email, link_path)
        html = f"""
        <div style="font-family:Arial;max-width:600px;margin:0 auto;color:#031433;">
          <div style="background:#031433;padding:24px;text-align:center;"><h1 style="color:#D3A154;margin:0;letter-spacing:2px;">REVANT</h1></div>
          <div style="padding:32px 24px;border:1px solid #e2e8f0;">
            <p style="font-size:12px;letter-spacing:2px;color:#D3A154;text-transform:uppercase;">Restablecer contraseña</p>
            <h2>Hola,</h2>
            <p>Recibimos una solicitud para restablecer tu contraseña. Usa el siguiente token (válido por 1 hora):</p>
            <p style="background:#f1f5f9;padding:16px;border-radius:6px;font-family:monospace;word-break:break-all;font-size:13px;">{token}</p>
            <p style="font-size:13px;color:#64748b;">Si no solicitaste esto, ignora este correo.</p>
          </div>
        </div>
        """
        await send_email(email, "Restablece tu contraseña — Revant", html)
    return {"ok": True, "message": "Si el correo existe, recibirás instrucciones."}

@api_router.post("/auth/reset-password")
async def reset_password(payload: ResetPasswordPayload):
    rec = await db.password_reset_tokens.find_one({"token": payload.token, "used": False}, {"_id": 0})
    if not rec:
        raise HTTPException(status_code=400, detail="Token inválido o ya utilizado")
    expires_at = rec["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Token expirado")
    await db.users.update_one({"user_id": rec["user_id"]}, {"$set": {"password_hash": hash_password(payload.password)}})
    await db.password_reset_tokens.update_one({"token": payload.token}, {"$set": {"used": True}})
    return {"ok": True}

@api_router.get("/auth/me", response_model=User)
async def me(user: User = Depends(get_current_user)):
    return user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}

@api_router.post("/auth/role", response_model=User)
async def update_role(payload: RoleUpdate, user: User = Depends(get_current_user)):
    await db.users.update_one({"user_id": user.user_id}, {"$set": {"role": payload.role}})
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    return User(**user_doc)

# ------------- Demo seed -------------
async def ensure_demo_data():
    count = await db.properties.count_documents({})
    if count > 0:
        return

    img_a = "https://images.pexels.com/photos/16110999/pexels-photo-16110999.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
    img_b = "https://images.pexels.com/photos/2462015/pexels-photo-2462015.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"

    props = [
        {"property_id": "prop_01", "nombre": "Torre Reforma 124", "direccion": "Av. Paseo de la Reforma 124, Cuauhtémoc", "ciudad": "CDMX", "tipo": "Departamento", "monto_renta": 38500, "imagen": img_a, "ocupada": True},
        {"property_id": "prop_02", "nombre": "Polanco Lofts 8B", "direccion": "Horacio 815, Polanco", "ciudad": "CDMX", "tipo": "Loft", "monto_renta": 45000, "imagen": img_b, "ocupada": True},
        {"property_id": "prop_03", "nombre": "Roma Norte 33", "direccion": "Colima 412, Roma Norte", "ciudad": "CDMX", "tipo": "Casa", "monto_renta": 32000, "imagen": img_a, "ocupada": True},
        {"property_id": "prop_04", "nombre": "San Pedro Garza 9", "direccion": "Calzada del Valle 215", "ciudad": "Monterrey", "tipo": "Departamento", "monto_renta": 28500, "imagen": img_b, "ocupada": True},
        {"property_id": "prop_05", "nombre": "Condesa Studios 4A", "direccion": "Amsterdam 89, Condesa", "ciudad": "CDMX", "tipo": "Estudio", "monto_renta": 22000, "imagen": img_a, "ocupada": True},
        {"property_id": "prop_06", "nombre": "Santa Fe Vista", "direccion": "Vasco de Quiroga 3000", "ciudad": "CDMX", "tipo": "Departamento", "monto_renta": 41000, "imagen": img_b, "ocupada": False},
    ]
    await db.properties.insert_many(props)

    today = datetime.now(timezone.utc).date()
    contracts = [
        {"contract_id": "ct_01", "inquilino_nombre": "Jorge Hernández", "inquilino_email": "jorge.tenant@revant.mx", "property_id": "prop_01", "propiedad_nombre": "Torre Reforma 124", "monto_renta": 38500, "fecha_inicio": (today - timedelta(days=200)).isoformat(), "fecha_vencimiento": (today + timedelta(days=18)).isoformat(), "estatus": "pagado", "firmado": True, "firmado_at": (today - timedelta(days=200)).isoformat()},
        {"contract_id": "ct_02", "inquilino_nombre": "María González", "inquilino_email": "maria.tenant@revant.mx", "property_id": "prop_02", "propiedad_nombre": "Polanco Lofts 8B", "monto_renta": 45000, "fecha_inicio": (today - timedelta(days=120)).isoformat(), "fecha_vencimiento": (today + timedelta(days=210)).isoformat(), "estatus": "pendiente", "firmado": True, "firmado_at": (today - timedelta(days=120)).isoformat()},
        {"contract_id": "ct_03", "inquilino_nombre": "Carlos Ramírez", "inquilino_email": "carlos.tenant@revant.mx", "property_id": "prop_03", "propiedad_nombre": "Roma Norte 33", "monto_renta": 32000, "fecha_inicio": (today - timedelta(days=300)).isoformat(), "fecha_vencimiento": (today + timedelta(days=60)).isoformat(), "estatus": "atrasado", "firmado": True, "firmado_at": (today - timedelta(days=300)).isoformat()},
        {"contract_id": "ct_04", "inquilino_nombre": "Ana Patricia López", "inquilino_email": "ana.tenant@revant.mx", "property_id": "prop_04", "propiedad_nombre": "San Pedro Garza 9", "monto_renta": 28500, "fecha_inicio": (today - timedelta(days=80)).isoformat(), "fecha_vencimiento": (today + timedelta(days=20)).isoformat(), "estatus": "pagado", "firmado": True, "firmado_at": (today - timedelta(days=80)).isoformat()},
        {"contract_id": "ct_05", "inquilino_nombre": "Luis Mendoza", "inquilino_email": "luis.tenant@revant.mx", "property_id": "prop_05", "propiedad_nombre": "Condesa Studios 4A", "monto_renta": 22000, "fecha_inicio": (today - timedelta(days=400)).isoformat(), "fecha_vencimiento": (today + timedelta(days=15)).isoformat(), "estatus": "pendiente", "firmado": False, "firmado_at": None},
    ]
    await db.contracts.insert_many(contracts)

# ------------- Properties -------------
@api_router.get("/properties", response_model=List[Property])
async def list_properties(user: User = Depends(get_current_user)):
    await ensure_demo_data()
    if user.role == "inquilino":
        my_contracts = await db.contracts.find({"inquilino_email": user.email}, {"_id": 0}).to_list(100)
        ids = [c["property_id"] for c in my_contracts]
        docs = await db.properties.find({"property_id": {"$in": ids}}, {"_id": 0}).to_list(100)
    else:
        docs = await db.properties.find({}, {"_id": 0}).to_list(500)
    return [Property(**d) for d in docs]

# ------------- Contracts / Rent Roll -------------
@api_router.get("/contracts", response_model=List[Contract])
async def list_contracts(user: User = Depends(get_current_user)):
    await ensure_demo_data()
    query = {} if user.role == "admin" else {"inquilino_email": user.email}
    docs = await db.contracts.find(query, {"_id": 0}).to_list(500)
    return [Contract(**d) for d in docs]

@api_router.get("/contracts/{contract_id}", response_model=Contract)
async def get_contract(contract_id: str, user: User = Depends(get_current_user)):
    doc = await db.contracts.find_one({"contract_id": contract_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Contrato no encontrado")
    if user.role == "inquilino" and doc["inquilino_email"] != user.email:
        raise HTTPException(status_code=403, detail="Sin acceso")
    return Contract(**doc)

@api_router.post("/contracts/{contract_id}/sign", response_model=Contract)
async def sign_contract(contract_id: str, payload: SignPayload | None = None, user: User = Depends(get_current_user)):
    doc = await db.contracts.find_one({"contract_id": contract_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Contrato no encontrado")
    if user.role == "inquilino" and doc["inquilino_email"] != user.email:
        raise HTTPException(status_code=403, detail="Sin acceso")
    now_iso = datetime.now(timezone.utc).date().isoformat()
    update = {"firmado": True, "firmado_at": now_iso}
    if payload and payload.signature_image:
        update["signature_image"] = payload.signature_image
    await db.contracts.update_one({"contract_id": contract_id}, {"$set": update})
    updated = await db.contracts.find_one({"contract_id": contract_id}, {"_id": 0})
    await log_audit(db, user=user, action="contract.sign", target_type="contract", target_id=contract_id,
                    details={"with_signature_image": bool(payload and payload.signature_image)})
    return Contract(**updated)

@api_router.get("/contracts/{contract_id}/pdf")
async def contract_pdf(contract_id: str, user: User = Depends(get_current_user)):
    doc = await db.contracts.find_one({"contract_id": contract_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Contrato no encontrado")
    if user.role == "inquilino" and doc["inquilino_email"] != user.email:
        raise HTTPException(status_code=403, detail="Sin acceso")
    pdf_bytes = generate_contract_pdf(doc)
    await log_audit(db, user=user, action="contract.download_pdf", target_type="contract", target_id=contract_id)
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="contrato_{contract_id}.pdf"'},
    )

class RemindPayload(BaseModel):
    include_payment_link: bool = False
    origin: Optional[str] = None  # window.location.origin

@api_router.post("/contracts/{contract_id}/remind")
async def send_reminder(contract_id: str, payload: RemindPayload | None = None, request: Request = None, user: User = Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Solo admin")
    doc = await db.contracts.find_one({"contract_id": contract_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Contrato no encontrado")
    fv = datetime.fromisoformat(doc["fecha_vencimiento"]).date()
    days = (fv - datetime.now(timezone.utc).date()).days
    monto_str = f"${doc['monto_renta']:,.0f} MXN"
    fecha_str = fv.strftime("%d/%m/%Y")

    payment_link = None
    if payload and payload.include_payment_link and payload.origin and request:
        try:
            host_url = str(request.base_url)
            origin = payload.origin.rstrip("/")
            success_url = f"{origin}/payment-success?session_id={{CHECKOUT_SESSION_ID}}"
            cancel_url = f"{origin}/rent-roll"
            session = await create_contract_checkout(
                host_url=host_url, amount=float(doc["monto_renta"]), currency="mxn",
                success_url=success_url, cancel_url=cancel_url,
                metadata={"contract_id": contract_id, "inquilino_email": doc["inquilino_email"], "kind": "rent_payment", "months": "1"},
            )
            payment_link = session.url
            await db.payment_transactions.insert_one({
                "session_id": session.session_id,
                "contract_id": contract_id,
                "inquilino_email": doc["inquilino_email"],
                "amount": float(doc["monto_renta"]),
                "currency": "mxn",
                "months": 1,
                "metadata": {"contract_id": contract_id, "kind": "rent_payment"},
                "payment_status": "initiated",
                "status": "open",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "via": "reminder_email",
            })
        except Exception as e:
            logger.warning("checkout link creation failed: %s", e)

    html = render_reminder_html(doc["inquilino_nombre"], doc["propiedad_nombre"], monto_str, fecha_str, days, payment_link=payment_link)
    res = await send_email(doc["inquilino_email"], f"Recordatorio: renta {doc['propiedad_nombre']}", html)
    await log_audit(db, user=user, action="reminder.send_manual", target_type="contract", target_id=contract_id,
                    details={"to": doc["inquilino_email"], "result": res, "payment_link": bool(payment_link)})
    return {"contract_id": contract_id, "to": doc["inquilino_email"], "payment_link": payment_link, **res}

@api_router.post("/notifications/run-auto-reminders")
async def run_auto_reminders(user: User = Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Solo admin")
    today = datetime.now(timezone.utc).date()
    contracts = await db.contracts.find({}, {"_id": 0}).to_list(500)
    sent = []
    for c in contracts:
        try:
            fv = datetime.fromisoformat(c["fecha_vencimiento"]).date()
        except Exception:
            continue
        days = (fv - today).days
        if c["estatus"] != "pagado" and -7 <= days <= 7:
            monto_str = f"${c['monto_renta']:,.0f} MXN"
            html = render_reminder_html(c["inquilino_nombre"], c["propiedad_nombre"], monto_str, fv.strftime("%d/%m/%Y"), days)
            res = await send_email(c["inquilino_email"], f"Recordatorio: renta {c['propiedad_nombre']}", html)
            sent.append({"contract_id": c["contract_id"], "to": c["inquilino_email"], **res})
    await log_audit(db, user=user, action="reminder.run_auto", details={"count": len(sent)})
    return {"processed": len(sent), "items": sent}

class StatusUpdate(BaseModel):
    estatus: Literal["pagado", "pendiente", "atrasado"]

@api_router.patch("/contracts/{contract_id}/status", response_model=Contract)
async def update_status(contract_id: str, payload: StatusUpdate, user: User = Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Solo admin")
    res = await db.contracts.update_one({"contract_id": contract_id}, {"$set": {"estatus": payload.estatus}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="No encontrado")
    updated = await db.contracts.find_one({"contract_id": contract_id}, {"_id": 0})
    return Contract(**updated)

# ------------- KPIs -------------
@api_router.get("/dashboard/kpis")
async def kpis(user: User = Depends(get_current_user)):
    await ensure_demo_data()
    query = {} if user.role == "admin" else {"inquilino_email": user.email}
    contracts = await db.contracts.find(query, {"_id": 0}).to_list(500)
    properties = await db.properties.find({}, {"_id": 0}).to_list(500)

    rentas_cobradas = sum(c["monto_renta"] for c in contracts if c["estatus"] == "pagado")
    ingresos_mensuales = sum(c["monto_renta"] for c in contracts)
    total_props = len(properties) if user.role == "admin" else 1
    ocupadas = sum(1 for p in properties if p.get("ocupada")) if user.role == "admin" else 1
    ocupacion = round((ocupadas / total_props) * 100) if total_props else 0

    today = datetime.now(timezone.utc).date()
    por_vencer = 0
    for c in contracts:
        try:
            fv = datetime.fromisoformat(c["fecha_vencimiento"]).date()
            if 0 <= (fv - today).days <= 30:
                por_vencer += 1
        except Exception:
            pass

    total_c = len(contracts) or 1
    atrasados = sum(1 for c in contracts if c["estatus"] == "atrasado")
    morosidad = round((atrasados / total_c) * 100, 1)

    return {
        "ingresos_mensuales": ingresos_mensuales,
        "rentas_cobradas": rentas_cobradas,
        "ocupacion_pct": ocupacion,
        "ocupadas": ocupadas,
        "total_propiedades": total_props,
        "contratos_por_vencer": por_vencer,
        "tasa_morosidad_pct": morosidad,
        "total_contratos": len(contracts),
    }

# ------------- ARCO (LFPDPPP) -------------
@api_router.post("/arco", response_model=ArcoRequest)
async def create_arco(payload: ArcoCreate):
    """Public endpoint - titulares de datos can submit ARCO requests without auth."""
    doc = {
        "request_id": f"arco_{uuid.uuid4().hex[:10]}",
        **payload.model_dump(),
        "estatus": "pendiente",
        "notas_resolucion": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "resolved_at": None,
    }
    await db.arco_requests.insert_one(dict(doc))
    try:
        html = render_arco_received_html(payload.nombre_completo, doc["request_id"], payload.tipo.capitalize())
        await send_email(payload.email, f"Solicitud ARCO recibida — {doc['request_id']}", html)
    except Exception as e:
        logger.warning("ARCO email fail: %s", e)
    return ArcoRequest(**doc)

@api_router.get("/arco", response_model=List[ArcoRequest])
async def list_arco(user: User = Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Solo admin")
    docs = await db.arco_requests.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [ArcoRequest(**d) for d in docs]

@api_router.patch("/arco/{request_id}", response_model=ArcoRequest)
async def update_arco(request_id: str, payload: ArcoUpdate, user: User = Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Solo admin")
    update = {"estatus": payload.estatus}
    if payload.notas_resolucion is not None:
        update["notas_resolucion"] = payload.notas_resolucion
    if payload.estatus in ("resuelto", "rechazado"):
        update["resolved_at"] = datetime.now(timezone.utc).isoformat()
    res = await db.arco_requests.update_one({"request_id": request_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="No encontrado")
    updated = await db.arco_requests.find_one({"request_id": request_id}, {"_id": 0})
    await log_audit(db, user=user, action="arco.update", target_type="arco", target_id=request_id,
                    details={"estatus": payload.estatus})
    return ArcoRequest(**updated)

# ------------- Audit Log -------------
@api_router.get("/audit", response_model=List[AuditLogModel])
async def get_audit_log(limit: int = 200, user: User = Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Solo admin")
    docs = await db.audit_logs.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return [AuditLogModel(**d) for d in docs]

# ------------- Stripe Payments -------------
@api_router.post("/payments/checkout")
async def create_checkout(payload: CheckoutMonthsPayload, request: Request, user: User = Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Solo admin")
    contract = await db.contracts.find_one({"contract_id": payload.contract_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contrato no encontrado")

    # Server-side amount only (security)
    amount = float(contract["monto_renta"]) * payload.months
    origin = payload.origin.rstrip("/")
    success_url = f"{origin}/payment-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/rent-roll"

    host_url = str(request.base_url)
    metadata = {
        "contract_id": payload.contract_id,
        "inquilino_email": contract["inquilino_email"],
        "months": str(payload.months),
        "kind": "rent_payment",
    }
    session = await create_contract_checkout(
        host_url=host_url, amount=amount, currency="mxn",
        success_url=success_url, cancel_url=cancel_url, metadata=metadata,
    )

    await db.payment_transactions.insert_one({
        "session_id": session.session_id,
        "contract_id": payload.contract_id,
        "inquilino_email": contract["inquilino_email"],
        "amount": amount,
        "currency": "mxn",
        "months": payload.months,
        "metadata": metadata,
        "payment_status": "initiated",
        "status": "open",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })
    await log_audit(db, user=user, action="payment.checkout_create",
                    target_type="contract", target_id=payload.contract_id,
                    details={"session_id": session.session_id, "amount": amount, "months": payload.months})
    return {"url": session.url, "session_id": session.session_id, "amount": amount}

@api_router.get("/payments/status/{session_id}")
async def payments_status(session_id: str, request: Request):
    """Public polling endpoint (success page calls this with session_id)."""
    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    host_url = str(request.base_url)
    try:
        s = await stripe_get_status(host_url, session_id)
    except Exception as e:
        logger.exception("stripe status: %s", e)
        return {"payment_status": tx.get("payment_status"), "status": tx.get("status"), "amount_total": int(tx["amount"] * 100), "currency": tx["currency"]}

    update = {"payment_status": s.payment_status, "status": s.status, "updated_at": datetime.now(timezone.utc).isoformat()}
    await db.payment_transactions.update_one({"session_id": session_id}, {"$set": update})

    # idempotent: only mark contract as paid once
    if s.payment_status == "paid" and tx.get("payment_status") != "paid":
        await db.contracts.update_one({"contract_id": tx["contract_id"]}, {"$set": {"estatus": "pagado"}})

    return {
        "payment_status": s.payment_status, "status": s.status,
        "amount_total": s.amount_total, "currency": s.currency,
        "metadata": s.metadata,
    }

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    sig = request.headers.get("Stripe-Signature", "")
    host_url = str(request.base_url)
    try:
        ev = await stripe_handle_webhook(host_url, body, sig)
    except Exception as e:
        logger.exception("webhook err: %s", e)
        raise HTTPException(status_code=400, detail="Invalid webhook")
    if ev.payment_status == "paid" and ev.session_id:
        tx = await db.payment_transactions.find_one({"session_id": ev.session_id}, {"_id": 0})
        if tx and tx.get("payment_status") != "paid":
            await db.payment_transactions.update_one(
                {"session_id": ev.session_id},
                {"$set": {"payment_status": "paid", "status": "complete", "updated_at": datetime.now(timezone.utc).isoformat()}},
            )
            await db.contracts.update_one({"contract_id": tx["contract_id"]}, {"$set": {"estatus": "pagado"}})
    return {"ok": True}

# ------------- Charts series -------------
@api_router.get("/dashboard/series")
async def dashboard_series(user: User = Depends(get_current_user)):
    """Returns 3 series for charts: monthly cashflow, status distribution, occupation by property."""
    await ensure_demo_data()
    query = {} if user.role == "admin" else {"inquilino_email": user.email}
    contracts = await db.contracts.find(query, {"_id": 0}).to_list(500)
    properties = await db.properties.find({}, {"_id": 0}).to_list(500)

    # Cashflow last 12 months (demo: spread sum across recent months)
    now = datetime.now(timezone.utc)
    months = []
    monthly_total = sum(c["monto_renta"] for c in contracts if c["estatus"] == "pagado")
    for i in range(11, -1, -1):
        m = (now - timedelta(days=30 * i))
        # demo: vary by 0.7-1.0 factor for visual interest
        factor = 0.65 + ((11 - i) % 5) * 0.07
        months.append({
            "month": m.strftime("%b %Y"),
            "ingresos": round(monthly_total * factor),
        })

    # Status distribution
    status_count = {"pagado": 0, "pendiente": 0, "atrasado": 0}
    for c in contracts:
        status_count[c["estatus"]] = status_count.get(c["estatus"], 0) + 1
    status_data = [{"name": k.capitalize(), "value": v} for k, v in status_count.items()]

    # By property (top 8)
    by_property = []
    for p in properties[:8]:
        match = next((c for c in contracts if c["property_id"] == p["property_id"]), None)
        by_property.append({
            "propiedad": p["nombre"][:18],
            "monto": match["monto_renta"] if match else 0,
            "ocupada": p["ocupada"],
        })

    return {"cashflow": months, "status": status_data, "by_property": by_property}

@api_router.get("/")
async def root():
    return {"app": "Revant API", "status": "ok"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def _seed_users_and_indexes():
    try:
        await db.users.create_index("email", unique=True)
    except Exception:
        pass
    # Seed demo admin + tenant accounts (email/password)
    seed = [
        {"email": "admin@revant.mx", "name": "Admin Demo", "password": "Revant2026!", "role": "admin"},
        {"email": "jorge.tenant@revant.mx", "name": "Jorge Hernández", "password": "Inquilino2026!", "role": "inquilino"},
    ]
    for s in seed:
        existing = await db.users.find_one({"email": s["email"]}, {"_id": 0})
        if not existing:
            await db.users.insert_one({
                "user_id": f"user_{uuid.uuid4().hex[:12]}",
                "email": s["email"],
                "name": s["name"],
                "picture": None,
                "role": s["role"],
                "password_hash": hash_password(s["password"]),
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
        elif not existing.get("password_hash"):
            await db.users.update_one({"email": s["email"]}, {"$set": {"password_hash": hash_password(s["password"])}})


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
