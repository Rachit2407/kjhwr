import pytest
from fastapi.testclient import TestClient
from api.main import app as gateway_app

gateway_client = TestClient(gateway_app)

def test_gateway_health():
    res = gateway_client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["gateway"] == "healthy"
    assert "backendUrl" in data
