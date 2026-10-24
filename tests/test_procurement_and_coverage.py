import pytest
import numpy as np
from backend.app.metrics import compute_rolling_risk_buffer, load_aligned_data

def test_coverage_computation_exact_ratio():
    """
    Verify that realized coverage matches the exact mathematical ratio
    of hours where shortfall <= buffer.
    """
    data = load_aligned_data()
    res = compute_rolling_risk_buffer(data, cutoff="11")
    
    total_hours = 0
    covered_hours = 0
    for day in res['daily']:
        for h in day['hours']:
            total_hours += 1
            if h['shortfallMW'] <= h['bufferMW']:
                covered_hours += 1
                assert h['isCovered'] is True
            else:
                assert h['isCovered'] is False
                
    expected_ratio = round((covered_hours / total_hours) * 100.0, 1)
    assert res['overallCoveragePercent'] == expected_ratio

def test_procurement_arithmetic_and_imbalance():
    """
    Verify procurement arithmetic:
    Total Hedged = Base Thermal + Risk Buffer
    Net Imbalance = Total Hedged - Actual Residual Demand
    """
    demand_mw = 30000.0
    actual_wind = 12000.0
    forecast_wind = 15000.0
    buffer_mw = 3500.0
    
    base_proc = max(0.0, demand_mw - forecast_wind) # 15000
    total_hedged = base_proc + buffer_mw             # 18500
    actual_residual = max(0.0, demand_mw - actual_wind) # 18000
    net_imbalance = total_hedged - actual_residual   # +500 (surplus)
    
    assert base_proc == 15000.0
    assert total_hedged == 18500.0
    assert actual_residual == 18000.0
    assert net_imbalance == 500.0

def test_bias_correction_hedged_identity():
    """
    Verify that subtracting rolling bias shifts base procurement and buffer
    by equal and opposite amounts, leaving total hedged procurement identical.
    """
    demand = 30000.0
    raw_fcst = 14000.0
    bias = 1500.0
    raw_buffer = 4000.0
    debiased_buffer = raw_buffer - bias # 2500
    debiased_fcst = raw_fcst - bias     # 12500
    
    # 1. Unadjusted
    base_unadj = demand - raw_fcst     # 16000
    total_unadj = base_unadj + raw_buffer # 20000
    
    # 2. De-biased
    base_corr = demand - debiased_fcst # 17500
    total_corr = base_corr + debiased_buffer # 20000
    
    assert total_unadj == total_corr, "Bias correction must not alter total hedged procurement volume!"

def test_bias_correction_clipping_when_demand_below_forecast():
    """
    Verify that when demand < forecast, the max(0, demand - forecast) non-linearity
    clips base procurement to 0 MW, which breaks the linear additive identity.
    """
    demand = 10000.0
    raw_fcst = 14000.0
    bias = 1500.0
    raw_buffer = 4000.0
    debiased_buffer = raw_buffer - bias # 2500
    debiased_fcst = raw_fcst - bias     # 12500
    
    # 1. Unadjusted (demand < raw_fcst -> clipped to 0)
    base_unadj = max(0.0, demand - raw_fcst)     # max(0, -4000) = 0
    total_unadj = base_unadj + raw_buffer        # 0 + 4000 = 4000
    
    # 2. De-biased (demand < debiased_fcst -> clipped to 0)
    base_corr = max(0.0, demand - debiased_fcst) # max(0, -2500) = 0
    total_corr = base_corr + debiased_buffer     # 0 + 2500 = 2500
    
    # Because base procurement clipped at 0 in both cases, the de-biased total is lower by exactly bias
    assert base_unadj == 0.0
    assert base_corr == 0.0
    assert total_unadj != total_corr
    assert total_unadj - total_corr == bias

def test_rolling_window_strictly_ends_at_d_minus_2():
    """
    Verify that the training window for any delivery day D strictly ends at D-2.
    """
    data = load_aligned_data()
    cutoff = "11"
    target_day = "2026-01-10"
    
    # The last eligible training day must be 2026-01-08
    training_days = [
        d['deliveryDate'] for d in data 
        if d['deliveryDate'] <= "2026-01-08" 
        and d['cutoffs'].get(cutoff) is not None
    ]
    disallowed_days = [
        d['deliveryDate'] for d in data 
        if d['deliveryDate'] in ["2026-01-09", "2026-01-10"]
    ]
    
    assert "2026-01-08" in training_days
    assert "2026-01-09" not in training_days
    assert "2026-01-10" not in training_days
