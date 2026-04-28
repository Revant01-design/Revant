from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import httpx
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime, timezone, timedelta

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

# ------------- Auth -------------
DEMO_TENANT_EMAILS = [
    "jorge.tenant@revant.mx",
    "maria.tenant@revant.mx",
    "carlos.tenant@revant.mx",
    "ana.tenant@revant.mx",
    "luis.tenant@revant.mx",
]

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
async def sign_contract(contract_id: str, user: User = Depends(get_current_user)):
    doc = await db.contracts.find_one({"contract_id": contract_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Contrato no encontrado")
    if user.role == "inquilino" and doc["inquilino_email"] != user.email:
        raise HTTPException(status_code=403, detail="Sin acceso")
    now_iso = datetime.now(timezone.utc).date().isoformat()
    await db.contracts.update_one(
        {"contract_id": contract_id},
        {"$set": {"firmado": True, "firmado_at": now_iso}},
    )
    updated = await db.contracts.find_one({"contract_id": contract_id}, {"_id": 0})
    return Contract(**updated)

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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
