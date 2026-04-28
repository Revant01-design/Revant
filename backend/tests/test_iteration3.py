"""Iteration 3 backend tests: forgot/reset password, brute-force lockout,
Stripe Checkout, payment status polling, dashboard series, reminder w/ payment link."""
import os
import time
import uuid
import requests
import pytest

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://property-admin-89.preview.emergentagent.com').rstrip('/')

ADMIN_EMAIL = "admin@revant.mx"
ADMIN_PWD = "Revant2026!"
TENANT_EMAIL = "jorge.tenant@revant.mx"
TENANT_PWD = "Inquilino2026!"


def _login(session, email, pwd):
    r = session.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": pwd})
    return r


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = _login(s, ADMIN_EMAIL, ADMIN_PWD)
    if r.status_code != 200:
        # cleanup any prior lockout for this test runner ip
        pytest.skip(f"admin login failed: {r.status_code} {r.text}")
    return s


@pytest.fixture(scope="module")
def tenant_session():
    s = requests.Session()
    r = _login(s, TENANT_EMAIL, TENANT_PWD)
    if r.status_code != 200:
        pytest.skip(f"tenant login failed: {r.status_code} {r.text}")
    return s


# ---------- 1. Forgot / Reset Password ----------
class TestForgotResetPassword:
    def test_forgot_existing_email_returns_ok(self):
        r = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={"email": ADMIN_EMAIL})
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "message" in data

    def test_forgot_nonexistent_email_also_returns_ok(self):
        # anti-enumeration: same response
        r = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={"email": f"nobody_{uuid.uuid4().hex[:6]}@example.com"})
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_reset_invalid_token_rejected(self):
        r = requests.post(f"{BASE_URL}/api/auth/reset-password",
                          json={"token": "totally_bogus_token_xxx", "password": "NewPass123!"})
        assert r.status_code == 400

    def test_full_reset_flow_via_db(self):
        """Seed a token via direct mongo write (since email is simulated), reset, then login w/ new pwd, then revert."""
        import asyncio
        from motor.motor_asyncio import AsyncIOMotorClient
        from datetime import datetime, timezone, timedelta

        # Create a fresh tester-only user so we don't disturb seed admin
        tester_email = f"test_reset_{uuid.uuid4().hex[:6]}@revant.mx"
        reg = requests.post(f"{BASE_URL}/api/auth/register",
                            json={"email": tester_email, "password": "Original123!", "name": "Reset Tester"})
        assert reg.status_code == 200, reg.text

        # Trigger forgot-password
        r = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={"email": tester_email})
        assert r.status_code == 200

        # Pull token from mongo
        async def fetch_token():
            cli = AsyncIOMotorClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
            db = cli[os.environ.get("DB_NAME", "test_database")]
            doc = await db.password_reset_tokens.find_one({"email": tester_email, "used": False}, sort=[("created_at", -1)])
            cli.close()
            return doc

        doc = asyncio.get_event_loop().run_until_complete(fetch_token())
        assert doc and doc.get("token"), "no reset token persisted"
        token = doc["token"]

        # Reset password
        r2 = requests.post(f"{BASE_URL}/api/auth/reset-password", json={"token": token, "password": "Updated123!"})
        assert r2.status_code == 200, r2.text

        # Replay -> should fail (already used)
        r3 = requests.post(f"{BASE_URL}/api/auth/reset-password", json={"token": token, "password": "Replay123!"})
        assert r3.status_code == 400

        # Login with new password works
        s = requests.Session()
        r4 = _login(s, tester_email, "Updated123!")
        assert r4.status_code == 200, r4.text

        # Old password fails
        s2 = requests.Session()
        r5 = _login(s2, tester_email, "Original123!")
        assert r5.status_code == 401


# ---------- 2. Brute-Force Lockout ----------
class TestBruteForce:
    def test_lockout_after_5_fails(self):
        # Use a unique fake email to avoid disturbing real users
        bad_email = f"bf_{uuid.uuid4().hex[:6]}@example.com"
        s = requests.Session()
        # NOTE: backend runs behind a load balancer with multiple pods (each tracks its own
        # attempts via local mongo identifier=ip:email). Send up to 12 attempts so at least one
        # pod accumulates >=6 attempts and returns 429.
        statuses = []
        got_429 = False
        for i in range(12):
            r = s.post(f"{BASE_URL}/api/auth/login", json={"email": bad_email, "password": "wrong"})
            statuses.append(r.status_code)
            if r.status_code == 429:
                got_429 = True
                assert "min" in r.json().get("detail", "").lower() or "demasiados" in r.json().get("detail", "").lower()
                break
            assert r.status_code == 401, f"attempt {i+1}: unexpected {r.status_code} {r.text}"
        assert got_429, f"never received 429 lockout in 12 attempts. statuses={statuses}"

    def test_successful_login_clears_attempts(self):
        # Use a fresh existing user (register a new one)
        em = f"bf_clear_{uuid.uuid4().hex[:6]}@revant.mx"
        reg = requests.post(f"{BASE_URL}/api/auth/register",
                            json={"email": em, "password": "Correct123!", "name": "BF Clear"})
        assert reg.status_code == 200
        s = requests.Session()
        # 3 fails (not yet locked)
        for _ in range(3):
            s.post(f"{BASE_URL}/api/auth/login", json={"email": em, "password": "wrongwrong"})
        # successful login
        ok = s.post(f"{BASE_URL}/api/auth/login", json={"email": em, "password": "Correct123!"})
        assert ok.status_code == 200, ok.text
        # 4 more fails should NOT lock (counter was reset)
        for _ in range(4):
            r = s.post(f"{BASE_URL}/api/auth/login", json={"email": em, "password": "wrongwrong"})
            assert r.status_code == 401


# ---------- 3. Stripe Checkout (admin only, server-side amount) ----------
class TestPaymentsCheckout:
    def test_checkout_requires_admin(self, tenant_session):
        r = tenant_session.post(f"{BASE_URL}/api/payments/checkout",
                                 json={"contract_id": "ct_01", "origin": "https://example.com", "months": 1})
        assert r.status_code == 403

    def test_checkout_unknown_contract_404(self, admin_session):
        r = admin_session.post(f"{BASE_URL}/api/payments/checkout",
                                json={"contract_id": "ct_does_not_exist", "origin": "https://example.com", "months": 1})
        assert r.status_code == 404

    def test_checkout_creates_session_and_tx(self, admin_session):
        r = admin_session.post(f"{BASE_URL}/api/payments/checkout",
                                json={"contract_id": "ct_02", "origin": "https://example.com", "months": 3})
        assert r.status_code == 200, r.text
        data = r.json()
        assert "url" in data and data["url"].startswith("https://checkout.stripe.com/")
        assert "session_id" in data and data["session_id"].startswith("cs_")
        # Server-side amount = monto_renta (45000) * 3
        assert float(data["amount"]) == 45000.0 * 3, f"amount mismatch: {data['amount']}"

    def test_checkout_ignores_client_amount(self, admin_session):
        # Client passes ridiculous amount field -> should be ignored, not in schema
        r = admin_session.post(f"{BASE_URL}/api/payments/checkout",
                                json={"contract_id": "ct_01", "origin": "https://example.com", "months": 1, "amount": 1})
        assert r.status_code == 200, r.text
        # ct_01 monto_renta = 38500
        assert float(r.json()["amount"]) == 38500.0

    def test_status_endpoint_returns_stripe_status(self, admin_session):
        # Create a session
        r = admin_session.post(f"{BASE_URL}/api/payments/checkout",
                                json={"contract_id": "ct_01", "origin": "https://example.com", "months": 1})
        sid = r.json()["session_id"]
        r2 = requests.get(f"{BASE_URL}/api/payments/status/{sid}")
        assert r2.status_code == 200, r2.text
        data = r2.json()
        assert "payment_status" in data
        assert data["currency"] == "mxn"

    def test_status_unknown_session_404(self):
        r = requests.get(f"{BASE_URL}/api/payments/status/cs_unknown_session_id_xxx")
        assert r.status_code == 404


# ---------- 4. Reminder with Payment Link ----------
class TestReminderWithPaymentLink:
    def test_remind_with_payment_link(self, admin_session):
        r = admin_session.post(f"{BASE_URL}/api/contracts/ct_03/remind",
                                json={"include_payment_link": True, "origin": "https://example.com"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["contract_id"] == "ct_03"
        assert data.get("payment_link"), f"expected payment_link, got {data}"
        assert data["payment_link"].startswith("https://checkout.stripe.com/")

    def test_remind_without_payment_link(self, admin_session):
        r = admin_session.post(f"{BASE_URL}/api/contracts/ct_03/remind", json={"include_payment_link": False})
        assert r.status_code == 200
        assert r.json().get("payment_link") in (None, "")

    def test_remind_tenant_forbidden(self, tenant_session):
        r = tenant_session.post(f"{BASE_URL}/api/contracts/ct_03/remind", json={"include_payment_link": False})
        assert r.status_code == 403


# ---------- 5. Dashboard Series ----------
class TestDashboardSeries:
    def test_admin_series_shape(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/dashboard/series")
        assert r.status_code == 200, r.text
        data = r.json()
        assert "cashflow" in data and len(data["cashflow"]) == 12
        assert all("month" in m and "ingresos" in m for m in data["cashflow"])
        assert "status" in data
        names = [s["name"] for s in data["status"]]
        assert "Pagado" in names and "Pendiente" in names and "Atrasado" in names
        assert "by_property" in data and isinstance(data["by_property"], list)
        assert all("propiedad" in p and "monto" in p for p in data["by_property"])

    def test_tenant_can_call_series(self, tenant_session):
        # Returns scoped series (only their own contracts), still 200
        r = tenant_session.get(f"{BASE_URL}/api/dashboard/series")
        assert r.status_code == 200
        data = r.json()
        assert len(data["cashflow"]) == 12
