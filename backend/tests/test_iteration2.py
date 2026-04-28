"""Iteration 2 backend tests: email/password auth, sign w/ signature, PDF, reminders, ARCO, audit."""
import os
import uuid
import requests
import pytest

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
ADMIN = {"email": "admin@revant.mx", "password": "Revant2026!"}
TENANT = {"email": "jorge.tenant@revant.mx", "password": "Inquilino2026!"}


def _login(creds):
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json=creds, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    return s, data["session_token"], data["user"]


@pytest.fixture(scope="session")
def admin_session():
    s, tok, user = _login(ADMIN)
    return {"session": s, "token": tok, "user": user, "headers": {"Authorization": f"Bearer {tok}"}}


@pytest.fixture(scope="session")
def tenant_session():
    s, tok, user = _login(TENANT)
    return {"session": s, "token": tok, "user": user, "headers": {"Authorization": f"Bearer {tok}"}}


# ---------------- AUTH ----------------
class TestAuth:
    def test_register_creates_user_and_returns_session(self):
        email = f"test_{uuid.uuid4().hex[:8]}@revant.mx"
        s = requests.Session()
        r = s.post(f"{BASE_URL}/api/auth/register",
                   json={"email": email, "password": "Test123456!", "name": "Test User"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert "user" in d and "session_token" in d
        assert d["user"]["email"] == email
        assert d["user"]["role"] == "admin"  # not in tenant emails
        assert "session_token" in s.cookies
        # Validate /me works with that cookie
        r2 = s.get(f"{BASE_URL}/api/auth/me")
        assert r2.status_code == 200
        assert r2.json()["email"] == email

    def test_register_duplicate_email_returns_409(self):
        # Re-register admin@revant.mx (seeded)
        r = requests.post(f"{BASE_URL}/api/auth/register",
                          json={"email": "admin@revant.mx", "password": "anyPass99", "name": "Dup"})
        assert r.status_code == 409, r.text

    def test_login_admin_seeded(self):
        s, tok, user = _login(ADMIN)
        assert user["role"] == "admin"
        assert user["email"] == "admin@revant.mx"
        assert isinstance(tok, str) and len(tok) > 20
        assert "session_token" in s.cookies

    def test_login_wrong_password_401(self):
        r = requests.post(f"{BASE_URL}/api/auth/login",
                          json={"email": "admin@revant.mx", "password": "wrong"})
        assert r.status_code == 401

    def test_login_tenant_role(self):
        s, tok, user = _login(TENANT)
        assert user["role"] == "inquilino"
        assert user["email"] == "jorge.tenant@revant.mx"

    def test_me_works_with_cookie(self):
        s, _, _ = _login(ADMIN)
        r = s.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 200
        assert r.json()["email"] == "admin@revant.mx"


# ---------------- SIGN + PDF ----------------
class TestContractSignAndPDF:
    SIG_B64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="

    def test_sign_with_signature_image_persists(self, admin_session):
        h = admin_session["headers"]
        r = requests.post(f"{BASE_URL}/api/contracts/ct_05/sign", headers=h,
                          json={"signature_image": self.SIG_B64})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["firmado"] is True
        assert d.get("signature_image", "").startswith("data:image")
        # GET to verify persistence
        r2 = requests.get(f"{BASE_URL}/api/contracts/ct_05", headers=h)
        assert r2.json().get("signature_image", "").startswith("data:image")

    def test_sign_without_signature_image_still_works(self, admin_session):
        h = admin_session["headers"]
        r = requests.post(f"{BASE_URL}/api/contracts/ct_03/sign", headers=h, json={})
        assert r.status_code == 200
        assert r.json()["firmado"] is True

    def test_pdf_admin(self, admin_session):
        h = admin_session["headers"]
        r = requests.get(f"{BASE_URL}/api/contracts/ct_01/pdf", headers=h)
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("application/pdf")
        assert r.content[:4] == b"%PDF"

    def test_pdf_tenant_owner_can_download(self, tenant_session):
        h = tenant_session["headers"]
        r = requests.get(f"{BASE_URL}/api/contracts/ct_01/pdf", headers=h)
        assert r.status_code == 200
        assert r.content[:4] == b"%PDF"

    def test_pdf_tenant_other_contract_403(self, tenant_session):
        h = tenant_session["headers"]
        r = requests.get(f"{BASE_URL}/api/contracts/ct_02/pdf", headers=h)
        assert r.status_code == 403


# ---------------- REMINDERS ----------------
class TestReminders:
    def test_remind_admin_simulated(self, admin_session):
        h = admin_session["headers"]
        r = requests.post(f"{BASE_URL}/api/contracts/ct_01/remind", headers=h)
        assert r.status_code == 200, r.text
        d = r.json()
        # GMAIL not configured -> simulated
        assert d.get("simulated") is True
        assert d.get("to") == "jorge.tenant@revant.mx"

    def test_remind_tenant_403(self, tenant_session):
        h = tenant_session["headers"]
        r = requests.post(f"{BASE_URL}/api/contracts/ct_01/remind", headers=h)
        assert r.status_code == 403

    def test_run_auto_reminders_admin(self, admin_session):
        h = admin_session["headers"]
        r = requests.post(f"{BASE_URL}/api/notifications/run-auto-reminders", headers=h)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "processed" in d and "items" in d
        assert isinstance(d["items"], list)

    def test_run_auto_reminders_tenant_403(self, tenant_session):
        h = tenant_session["headers"]
        r = requests.post(f"{BASE_URL}/api/notifications/run-auto-reminders", headers=h)
        assert r.status_code == 403


# ---------------- ARCO ----------------
class TestArco:
    created_id = None

    def test_create_arco_no_auth(self):
        payload = {
            "tipo": "acceso",
            "nombre_completo": "TEST_Juan Pérez",
            "email": "test_arco@example.com",
            "telefono": "5555555555",
            "identificacion_tipo": "INE",
            "identificacion_numero": "ABC123",
            "descripcion": "Solicito acceso a mis datos personales (TEST)."
        }
        r = requests.post(f"{BASE_URL}/api/arco", json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["request_id"].startswith("arco_")
        assert d["estatus"] == "pendiente"
        assert d["tipo"] == "acceso"
        TestArco.created_id = d["request_id"]

    def test_list_arco_admin(self, admin_session):
        h = admin_session["headers"]
        r = requests.get(f"{BASE_URL}/api/arco", headers=h)
        assert r.status_code == 200
        items = r.json()
        assert any(i["request_id"] == TestArco.created_id for i in items)

    def test_list_arco_tenant_403(self, tenant_session):
        h = tenant_session["headers"]
        r = requests.get(f"{BASE_URL}/api/arco", headers=h)
        assert r.status_code == 403

    def test_update_arco_admin(self, admin_session):
        assert TestArco.created_id, "create test must run first"
        h = admin_session["headers"]
        r = requests.patch(f"{BASE_URL}/api/arco/{TestArco.created_id}", headers=h,
                           json={"estatus": "resuelto", "notas_resolucion": "TEST: resuelto via test"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["estatus"] == "resuelto"
        assert d["notas_resolucion"] == "TEST: resuelto via test"
        assert d["resolved_at"] is not None

    def test_update_arco_tenant_403(self, tenant_session):
        assert TestArco.created_id
        h = tenant_session["headers"]
        r = requests.patch(f"{BASE_URL}/api/arco/{TestArco.created_id}", headers=h,
                           json={"estatus": "rechazado"})
        assert r.status_code == 403


# ---------------- AUDIT ----------------
class TestAudit:
    def test_audit_admin_returns_logs(self, admin_session):
        h = admin_session["headers"]
        r = requests.get(f"{BASE_URL}/api/audit", headers=h)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        # After running other tests we should have logs
        actions = {i["action"] for i in items}
        # Sign, pdf download, reminder, arco update should have been logged
        for expected in ["contract.sign", "contract.download_pdf", "reminder.send_manual", "arco.update"]:
            assert expected in actions, f"Missing audit action: {expected}. Got: {actions}"
        # Verify desc order
        ts = [i["created_at"] for i in items]
        assert ts == sorted(ts, reverse=True)

    def test_audit_tenant_403(self, tenant_session):
        h = tenant_session["headers"]
        r = requests.get(f"{BASE_URL}/api/audit", headers=h)
        assert r.status_code == 403
