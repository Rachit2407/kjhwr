import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_api_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["totalHourlyRows"] == 960

def test_api_day_ahead_valid():
    res = client.get("/api/day-ahead?date=2026-01-15&cutoff=11")
    assert res.status_code == 200
    data = res.json()
    assert data["deliveryDate"] == "2026-01-15"
    assert data["decisionDate"] == "2026-01-14"
    assert len(data["hourly"]) == 24
    assert len(data["halfHourlyActuals"]) == 48

def test_api_day_ahead_invalid_cutoff():
    res = client.get("/api/day-ahead?date=2026-01-15&cutoff=99")
    assert res.status_code == 400

def test_api_accuracy_summary():
    res = client.get("/api/accuracy/summary?cutoff=11")
    assert res.status_code == 200
    data = res.json()
    assert "summary" in data
    assert data["summary"]["count"] == 744 # 31 days * 24 hours
    assert "diurnalProfile" in data
    assert len(data["diurnalProfile"]) == 24

def test_api_accuracy_lead_time():
    res = client.get("/api/accuracy/lead-time")
    assert res.status_code == 200
    data = res.json()
    assert "curve" in data
    assert len(data["curve"]) > 0

def test_api_procurement_simulate():
    res = client.get("/api/procurement/simulate?cutoff=11&demand_mw=30000&quantile=0.90")
    assert res.status_code == 200
    data = res.json()
    assert "overallCoveragePercent" in data
    assert "averageBufferMW" in data
    assert len(data["dailySummary"]) == 31

def test_api_procurement_simulate_single_day():
    res = client.get("/api/procurement/simulate?cutoff=11&demand_mw=30000&quantile=0.90&date=2026-01-15")
    assert res.status_code == 200
    data = res.json()
    assert data["date"] == "2026-01-15"
    assert len(data["hours"]) == 24
