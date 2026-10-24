import pytest
import copy
import numpy as np
from backend.app.metrics import compute_rolling_risk_buffer, load_aligned_data

def test_rolling_buffer_zero_leakage_from_future():
    """
    Core Rigor Test:
    For target delivery day D, the risk buffer MUST NOT change if we alter
    actuals on Day D-1 or Day D.
    """
    raw_data = load_aligned_data()
    target_day = "2026-01-15"
    cutoff = "11"
    
    # 1. Base run
    base_res = compute_rolling_risk_buffer(raw_data, cutoff=cutoff)
    day_entry = next(d for d in base_res['daily'] if d['date'] == target_day)
    base_buffers = [h['bufferMW'] for h in day_entry['hours']]
    
    # 2. Perturb actuals on Day D-1 (2026-01-14) and Day D (2026-01-15)
    perturbed_data = copy.deepcopy(raw_data)
    for r in perturbed_data:
        if r['deliveryDate'] in ["2026-01-14", "2026-01-15"]:
            r['actualMW'] += 50000.0 # Huge shock
            # Update errorMW for that cutoff as well
            if r['cutoffs'].get(cutoff):
                r['cutoffs'][cutoff]['errorMW'] = r['cutoffs'][cutoff]['forecastMW'] - r['actualMW']
                
    perturbed_res = compute_rolling_risk_buffer(perturbed_data, cutoff=cutoff)
    perturbed_day_entry = next(d for d in perturbed_res['daily'] if d['date'] == target_day)
    perturbed_buffers = [h['bufferMW'] for h in perturbed_day_entry['hours']]
    
    # Assert buffers are 100% IDENTICAL
    assert base_buffers == perturbed_buffers, "LEAKAGE DETECTED: Buffer changed when D-1 or D actuals were perturbed!"

def test_cutoff_vintage_isolation():
    """
    Ensure forecasts published after cutoff are never selected.
    """
    raw_data = load_aligned_data()
    cutoff_hour = 11
    
    for r in raw_data:
        c_info = r['cutoffs'].get(str(cutoff_hour))
        if c_info:
            pub_time = c_info['publishTime']
            # Target delivery date and decision date
            dec_date = r['decisionDate']
            # Cutoff timestamp was dec_date + 11:00:00Z
            cutoff_iso = f"{dec_date}T{cutoff_hour:02d}:00:00Z"
            assert pub_time <= cutoff_iso, f"Leakage: publishTime {pub_time} > cutoff {cutoff_iso}!"
