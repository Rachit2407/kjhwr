import pytest
import numpy as np
from backend.app.metrics import compute_summary_kpis, compute_diurnal_breakdown, compute_lead_time_curve

def test_summary_kpis_hand_calculated_vector():
    # 4 synthetic periods
    records = [
        {'actualMW': 1000, 'forecastMW': 1200, 'baseline48h': 900, 'baseline7dMean': 950},  # e = +200, ae = 200, b1_err = 100
        {'actualMW': 2000, 'forecastMW': 1800, 'baseline48h': 2100, 'baseline7dMean': 2050}, # e = -200, ae = 200, b1_err = 100
        {'actualMW': 1500, 'forecastMW': 1500, 'baseline48h': 1400, 'baseline7dMean': 1450}, # e = 0, ae = 0, b1_err = 100
        {'actualMW': 2500, 'forecastMW': 2900, 'baseline48h': 2300, 'baseline7dMean': 2400}, # e = +400, ae = 400, b1_err = 200
    ]
    
    # Expected:
    # errors = [+200, -200, 0, +400]
    # abs_errors = [200, 200, 0, 400] -> sum = 800, mean = 200.0
    # squared_errors = [40000, 40000, 0, 160000] -> mean = 60000 -> rmse = sqrt(60000) = 244.948...
    # bias = (200 - 200 + 0 + 400) / 4 = 100.0
    # sum_actuals = 7000 -> WAPE = 800 / 7000 * 100 = 11.428...
    # b1 errors = [-100, 100, -100, -200] -> b1_mae = 125.0 -> skill = (1 - 200/125)*100 = -60.0%
    
    res = compute_summary_kpis(records)
    
    assert res['count'] == 4
    assert res['maeMW'] == 200.0
    assert abs(res['rmseMW'] - 244.9) <= 0.1
    assert res['meanBiasMW'] == 100.0
    assert abs(res['wapePercent'] - 11.43) <= 0.05
    assert res['baseline48h']['maeMW'] == 125.0
    assert abs(res['baseline48h']['skillScorePercent'] - (-60.0)) <= 0.1

def test_diurnal_breakdown():
    records = [
        {'hourOfDay': 10, 'actualMW': 1000, 'forecastMW': 1100},
        {'hourOfDay': 10, 'actualMW': 1200, 'forecastMW': 1250},
        {'hourOfDay': 11, 'actualMW': 2000, 'forecastMW': 1900},
    ]
    diurnal = compute_diurnal_breakdown(records)
    
    assert len(diurnal) == 2
    h10 = next(d for d in diurnal if d['hour'] == 10)
    assert h10['avgActualMW'] == 1100.0
    assert h10['avgForecastMW'] == 1175.0
    assert h10['maeMW'] == 75.0

def test_lead_time_curve():
    records = [
        {'leadTimeHours': 5.0, 'errorMW': 100},
        {'leadTimeHours': 5.5, 'errorMW': 150},
        {'leadTimeHours': 14.0, 'errorMW': 300},
        {'leadTimeHours': 15.0, 'errorMW': 400},
    ]
    curve = compute_lead_time_curve(records, bin_size_hours=6)
    
    assert len(curve) == 2
    bin_0_6 = next(c for c in curve if c['binStartHours'] == 0)
    assert bin_0_6['sampleCount'] == 2
    assert bin_0_6['maeMW'] == 125.0
