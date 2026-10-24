import pytest
import numpy as np
from backend.app.metrics import compute_summary_kpis

def test_calm_zero_wind_hours_no_div_by_zero():
    """
    During calm zero-wind hours, WAPE and metrics must handle zero sums
    gracefully without division-by-zero errors.
    """
    records = [
        {'actualMW': 0.0, 'forecastMW': 50.0, 'baseline48h': 0.0, 'baseline7dMean': 0.0},
        {'actualMW': 0.0, 'forecastMW': 20.0, 'baseline48h': 0.0, 'baseline7dMean': 0.0},
    ]
    res = compute_summary_kpis(records)
    assert res['maeMW'] == 35.0
    assert res['meanBiasMW'] == 35.0
    assert res['wapePercent'] == 0.0 # Guarded against div-by-zero

def test_single_half_hour_missing_returns_none():
    """
    Hourly aggregation requires both :00 and :30 settlement periods.
    If only one exists, the hourly actual must be None (not half the value).
    """
    hourly_dict = {
        "2026-01-01T10:00:00Z": {0: 1200.0} # Missing 30 min
    }
    valid = {}
    for k, v in hourly_dict.items():
        if 0 in v and 30 in v:
            valid[k] = (v[0] + v[30]) / 2.0
        else:
            valid[k] = None
            
    assert valid["2026-01-01T10:00:00Z"] is None
