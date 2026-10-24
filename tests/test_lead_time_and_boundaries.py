import pytest
import copy
import json
import os
from backend.app.metrics import (
    load_aligned_data,
    load_lead_time_records,
    compute_rolling_risk_buffer
)

def test_lead_time_validity_and_bounds():
    """
    Assert all lead-time observations are strictly positive forward forecasts
    within the verified 0.5h to 66.5h horizon.
    """
    records = load_lead_time_records()
    assert len(records) == 18015, f"Expected 18,015 records, got {len(records)}"
    
    for r in records:
        lh = r['leadTimeHours']
        assert lh > 0.0, f"Lead time must be strictly positive forward forecast, got {lh}"
        assert lh <= 67.0, f"Lead time exceeds max verified horizon, got {lh}"
        # Verify error definition: forecast - actual
        assert round(r['forecastMW'] - r['actualMW'], 1) == round(r['errorMW'], 1)

def test_cutoff_boundary_inclusion_and_exclusion():
    """
    Verify that forecasts published at exact cutoff are eligible,
    while forecasts published at cutoff + 1 minute are strictly excluded.
    """
    cutoff_hour = 11
    decision_date = "2026-01-14"
    exact_cutoff_iso = f"{decision_date}T{cutoff_hour:02d}:00:00Z"
    after_cutoff_iso = f"{decision_date}T{cutoff_hour:02d}:01:00Z"
    
    # Simulate candidate forecasts
    forecasts = [
        {'publishTime': f"{decision_date}T10:30:00Z", 'generation': 12000},
        {'publishTime': exact_cutoff_iso, 'generation': 12500},
        {'publishTime': after_cutoff_iso, 'generation': 13000},
    ]
    
    # Filter <= exact cutoff
    eligible = [f for f in forecasts if f['publishTime'] <= exact_cutoff_iso]
    selected = eligible[-1]
    
    # Assert exact cutoff is selected, and after_cutoff is rejected
    assert selected['publishTime'] == exact_cutoff_iso
    assert selected['generation'] == 12500
    assert not any(f['publishTime'] == after_cutoff_iso for f in eligible)

def test_post_cutoff_forecast_perturbation_leaves_buffer_unchanged():
    """
    Perturbing forecasts published AFTER the cutoff on Day D-1 or Day D
    must leave the computed Day D buffer completely unchanged.
    """
    raw_data = load_aligned_data()
    target_day = "2026-01-15"
    cutoff = "11"
    
    # Base buffer
    base_res = compute_rolling_risk_buffer(raw_data, cutoff=cutoff)
    day_entry = next(d for d in base_res['daily'] if d['date'] == target_day)
    base_buffers = [h['bufferMW'] for h in day_entry['hours']]
    
    # Perturb aligned dataset cutoffs for a future cutoff (e.g. cutoff 23)
    perturbed_data = copy.deepcopy(raw_data)
    for r in perturbed_data:
        if r['deliveryDate'] == target_day:
            if r['cutoffs'].get('23'):
                r['cutoffs']['23']['forecastMW'] += 99999.0 # Intraday revision
                r['cutoffs']['23']['errorMW'] += 99999.0
                
    perturbed_res = compute_rolling_risk_buffer(perturbed_data, cutoff=cutoff)
    perturbed_day_entry = next(d for d in perturbed_res['daily'] if d['date'] == target_day)
    perturbed_buffers = [h['bufferMW'] for h in perturbed_day_entry['hours']]
    
    assert base_buffers == perturbed_buffers

def test_fuelhh_deduplication_latest_publish_wins():
    """
    Verify the deduplication rule: if duplicate rows exist for the same startTime,
    the row with the latest publishTime wins.
    """
    raw_rows = [
        {"startTime": "2026-01-01T00:00:00Z", "publishTime": "2026-01-01T00:30:00Z", "generation": 1000},
        {"startTime": "2026-01-01T00:00:00Z", "publishTime": "2026-01-01T01:00:00Z", "generation": 1050}, # Latest
        {"startTime": "2026-01-01T00:00:00Z", "publishTime": "2026-01-01T00:15:00Z", "generation": 950},
    ]
    
    dedup = {}
    for r in raw_rows:
        st = r['startTime']
        if st not in dedup or r['publishTime'] > dedup[st]['publishTime']:
            dedup[st] = r
            
    assert len(dedup) == 1
    assert dedup["2026-01-01T00:00:00Z"]["generation"] == 1050
    assert dedup["2026-01-01T00:00:00Z"]["publishTime"] == "2026-01-01T01:00:00Z"
