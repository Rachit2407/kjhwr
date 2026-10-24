import pytest
from fastapi.testclient import TestClient
from api.main import app as serverless_app

client = TestClient(serverless_app)

def test_serverless_api_routes():
    # Both /health and /api/health should resolve with 200 OK
    res1 = client.get("/health")
    assert res1.status_code == 200
    assert res1.json()["status"] == "healthy"

    res2 = client.get("/api/health")
    assert res2.status_code == 200
    assert res2.json()["status"] == "healthy"

    # Test day-ahead endpoint
    res3 = client.get("/api/day-ahead?date=2026-01-15&cutoff=11")
    assert res3.status_code == 200
    data = res3.json()
    assert data["deliveryDate"] == "2026-01-15"
    assert len(data["hourly"]) == 24
