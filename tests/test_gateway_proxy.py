import pytest
from fastapi.testclient import TestClient
from api.main import app as gateway_app

gateway_client = TestClient(gateway_app)

def test_gateway_route_handling():
    # Calling gateway directly without backend running will return 502 with structured error
    res = gateway_client.get("/health")
    # Status can be 502 (if no backend running on localhost:8000) or 200 (if running)
    assert res.status_code in [200, 502]
    assert "application/json" in res.headers.get("content-type", "")
