"""Backend regression tests for Revant API."""
import os
import requests
import pytest

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://property-admin-89.preview.emergentagent.com').rstrip('/')
ADMIN_TOKEN = os.environ.get('ADMIN_TOKEN', 'admintok_1777390626809')
TENANT_TOKEN = os.environ.get('TENANT_TOKEN', 'tentok_1777390626869')


@pytest.fixture(scope="session")
def admin_h():
    return {"Authorization": f"Bearer {ADMIN_TOKEN}"}


@pytest.fixture(scope="session")
def tenant_h():
    return {"Authorization": f"Bearer {TENANT_TOKEN}"}


# Health
def test_root():
    r = requests.get(f"{BASE_URL}/api/")
    assert r.status_code == 200
    assert r.json().get("status") == "ok"


# Auth
def test_me_unauth():
    r = requests.get(f"{BASE_URL}/api/auth/me")
    assert r.status_code == 401


def test_me_admin(admin_h):
    r = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_h)
    assert r.status_code == 200
    d = r.json()
    assert d["email"] == "admin.test@revant.mx"
    assert d["role"] == "admin"


def test_me_tenant(tenant_h):
    r = requests.get(f"{BASE_URL}/api/auth/me", headers=tenant_h)
    assert r.status_code == 200
    assert r.json()["role"] == "inquilino"


def test_role_switch(admin_h):
    r = requests.post(f"{BASE_URL}/api/auth/role", headers=admin_h, json={"role": "inquilino"})
    assert r.status_code == 200
    assert r.json()["role"] == "inquilino"
    # restore
    r = requests.post(f"{BASE_URL}/api/auth/role", headers=admin_h, json={"role": "admin"})
    assert r.status_code == 200
    assert r.json()["role"] == "admin"


# Properties
def test_properties_admin(admin_h):
    r = requests.get(f"{BASE_URL}/api/properties", headers=admin_h)
    assert r.status_code == 200
    data = r.json()
    assert len(data) >= 6
    assert all("property_id" in p for p in data)


def test_properties_tenant_filtered(tenant_h):
    r = requests.get(f"{BASE_URL}/api/properties", headers=tenant_h)
    assert r.status_code == 200
    data = r.json()
    # jorge has 1 contract -> 1 property
    assert len(data) == 1
    assert data[0]["property_id"] == "prop_01"


# Contracts
def test_contracts_admin(admin_h):
    r = requests.get(f"{BASE_URL}/api/contracts", headers=admin_h)
    assert r.status_code == 200
    assert len(r.json()) >= 5


def test_contracts_tenant_filtered(tenant_h):
    r = requests.get(f"{BASE_URL}/api/contracts", headers=tenant_h)
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 1
    assert data[0]["inquilino_email"] == "jorge.tenant@revant.mx"


def test_contract_detail(admin_h):
    r = requests.get(f"{BASE_URL}/api/contracts/ct_01", headers=admin_h)
    assert r.status_code == 200
    assert r.json()["contract_id"] == "ct_01"


def test_contract_detail_403_for_other_tenant(tenant_h):
    r = requests.get(f"{BASE_URL}/api/contracts/ct_02", headers=tenant_h)
    assert r.status_code == 403


def test_sign_contract(admin_h):
    r = requests.post(f"{BASE_URL}/api/contracts/ct_05/sign", headers=admin_h)
    assert r.status_code == 200
    d = r.json()
    assert d["firmado"] is True
    assert d["firmado_at"] is not None
    # Verify persisted
    r2 = requests.get(f"{BASE_URL}/api/contracts/ct_05", headers=admin_h)
    assert r2.json()["firmado"] is True


def test_status_update_admin(admin_h):
    r = requests.patch(f"{BASE_URL}/api/contracts/ct_02/status", headers=admin_h, json={"estatus": "pagado"})
    assert r.status_code == 200
    assert r.json()["estatus"] == "pagado"
    # restore
    requests.patch(f"{BASE_URL}/api/contracts/ct_02/status", headers=admin_h, json={"estatus": "pendiente"})


def test_status_update_tenant_forbidden(tenant_h):
    r = requests.patch(f"{BASE_URL}/api/contracts/ct_01/status", headers=tenant_h, json={"estatus": "pagado"})
    assert r.status_code == 403


# KPIs
def test_kpis_admin(admin_h):
    r = requests.get(f"{BASE_URL}/api/dashboard/kpis", headers=admin_h)
    assert r.status_code == 200
    d = r.json()
    for k in ["ingresos_mensuales", "rentas_cobradas", "ocupacion_pct", "contratos_por_vencer", "tasa_morosidad_pct"]:
        assert k in d
    assert d["ingresos_mensuales"] > 0


def test_kpis_tenant(tenant_h):
    r = requests.get(f"{BASE_URL}/api/dashboard/kpis", headers=tenant_h)
    assert r.status_code == 200
