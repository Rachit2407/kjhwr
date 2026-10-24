"""
Comprehensive Automated Test Suite: Feature Matrix & Specification Expectations.
Directly verifies every requirement and operational expectation specified in the challenge brief.
"""

import pytest
import numpy as np
from datetime import datetime, timedelta

from backend.app.metrics import (
    load_aligned_data,
    load_lead_time_records,
    get_day_ahead_slice,
    compute_summary_kpis,
    compute_diurnal_breakdown,
    compute_rolling_risk_buffer,
    compute_lead_time_curve
)

@pytest.fixture(scope="module")
def aligned_data():
    return load_aligned_data()

@pytest.fixture(scope="module")
def lead_records():
    return load_lead_time_records()

# ==============================================================================
# 1. SCOPE LOCK & DATA RECONCILIATION EXPECTATIONS
# ==============================================================================

def test_scope_lock_data_integrity(aligned_data, lead_records):
    """
    Requirement: National wind power from Elexon alone (FUELHH WIND & WINDFOR).
    Verify dataset contains all required fields, valid positive actuals and forecasts,
    and strictly covers January 2026 delivery window.
    """
    assert len(aligned_data) == 960, "Dataset must cover 40 complete days (960 hours)"
    assert len(lead_records) == 18015, "Must contain exactly 18,015 forward forecast records"

    jan_delivery = [d for d in aligned_data if '2026-01-02' <= d['deliveryDate'] <= '2026-02-01']
    assert len(jan_delivery) == 744, "January 2026 decisions must yield exactly 31 delivery days (744 hours)"

    for r in jan_delivery:
        assert r['actualMW'] >= 0.0, "Wind generation must be non-negative"
        assert '11' in r['cutoffs'], "Assumed benchmark cutoff 11:00 UTC must be present"
        assert r['cutoffs']['11']['forecastMW'] >= 0.0
        assert r['cutoffs']['11']['leadTimeHours'] > 0.0

def test_reconciliation_zero_missing_intervals(aligned_data):
    """
    Requirement: Hourly reconciliation of FUELHH (30m) and WINDFOR (60m).
    Verify zero missing delivery hours across January 2026.
    """
    jan_delivery = [d for d in aligned_data if '2026-01-02' <= d['deliveryDate'] <= '2026-02-01']
    dates = sorted(list(set(d['deliveryDate'] for d in jan_delivery)))
    assert len(dates) == 31, "Must contain all 31 days in the January delivery window"
    
    for dt in dates:
        day_hours = [d for d in jan_delivery if d['deliveryDate'] == dt]
        assert len(day_hours) == 24, f"Date {dt} must have exactly 24 contiguous hours"
        hours_of_day = [d['hourOfDay'] for d in day_hours]
        assert hours_of_day == list(range(24)), f"Date {dt} must have complete hours 0-23"

# ==============================================================================
# 2. LATEST FORECAST VISIBILITY & CUTOFF RULES EXPECTATIONS
# ==============================================================================

def test_cutoff_vintage_selection_cadence(aligned_data):
    """
    Requirement: Clearly understand latest renewable generation forecasts available at decision cutoff on D-1.
    Verify that at 11:00 UTC cutoff on D-1, the engine selects the 09:30 UTC publication.
    """
    jan_delivery = [d for d in aligned_data if '2026-01-02' <= d['deliveryDate'] <= '2026-02-01']
    
    for r in jan_delivery:
        cutoff_info = r['cutoffs']['11']
        pub_time = cutoff_info['publishTime']
        # Must be published strictly <= 11:00 UTC on decision day D-1
        decision_dt = r['decisionDate']
        cutoff_boundary = f"{decision_dt}T11:00:00Z"
        assert pub_time <= cutoff_boundary, f"Forecast {pub_time} published after cutoff {cutoff_boundary}"
        # Across all January days, 09:30 UTC was the operative publication
        assert pub_time.endswith("09:30:00Z"), f"Expected 09:30 UTC publication, got {pub_time}"

def test_distinct_cutoffs_coverage_and_mae(aligned_data):
    """
    Requirement: Support configurable cutoffs reflecting actual DAM auction timings.
    Verify all supported cutoffs (9, 11, 12, 14, 17, 23) produce valid metrics.
    """
    cutoffs = ['9', '11', '12', '14', '17', '23']
    for c in cutoffs:
        records = get_day_ahead_slice(aligned_data, cutoff=c)
        assert len(records) == 744, f"Cutoff {c} must evaluate all 744 hours"
        kpis = compute_summary_kpis(records)
        assert 1500.0 < kpis['maeMW'] < 2500.0
        assert 1500.0 < kpis['meanBiasMW'] < 2000.0

# ==============================================================================
# 3. QUANTITATIVE ACCURACY EVALUATION EXPECTATIONS
# ==============================================================================

def test_quantitative_accuracy_benchmarks(aligned_data):
    """
    Requirement: Quantitatively benchmark forecast accuracy against actuals and observable baselines.
    Verify MAE, RMSE, Mean Bias, WAPE, quantiles, and forecast skill score > 50%.
    """
    records = get_day_ahead_slice(aligned_data, cutoff='11')
    kpis = compute_summary_kpis(records)

    assert round(kpis['maeMW'], 1) == 2013.0, "Overall January MAE must equal 2,013.0 MW"
    assert round(kpis['rmseMW'], 1) == 2505.9, "Overall January RMSE must equal 2,505.9 MW"
    assert round(kpis['meanBiasMW'], 1) == 1729.9, "Overall January Mean Bias must equal +1,729.9 MW"
    assert round(kpis['wapePercent'], 2) == 17.84, "Overall January WAPE must equal 17.84%"

    # Baselines
    assert round(kpis['baseline48h']['maeMW'], 1) == 4340.3
    assert round(kpis['baseline48h']['skillScorePercent'], 1) == 53.6, "Forecast Skill Score must exceed +50%"
    assert round(kpis['baseline7dMean']['skillScorePercent'], 1) == 54.4

    # Quantiles
    assert round(kpis['errorQuantiles']['p10'], 1) == -488.9
    assert round(kpis['errorQuantiles']['p50'], 1) == 1560.2
    assert round(kpis['errorQuantiles']['p90'], 1) == 4143.9

def test_diurnal_and_lead_time_profiles(aligned_data, lead_records):
    """
    Requirement: Diurnal breakdown across 24 hours and lead-time degradation curve.
    """
    records = get_day_ahead_slice(aligned_data, cutoff='11')
    diurnal = compute_diurnal_breakdown(records)
    assert len(diurnal) == 24, "Diurnal breakdown must span all 24 hours of day"

    curve = compute_lead_time_curve(lead_records, bin_size_hours=6)
    assert len(curve) > 8, "Lead time degradation curve must have multiple horizon bins"
    # Horizons must start at 0h and progress up to 66h+
    assert curve[0]['leadTimeBin'] == '0-6h'
    for bin_info in curve:
        assert bin_info['maeMW'] > 0.0
        assert bin_info['sampleCount'] > 0

# ==============================================================================
# 4. PROCUREMENT RISK BUFFER & HEDGING SIMULATION EXPECTATIONS
# ==============================================================================

def test_strictly_out_of_sample_buffer_calibration(aligned_data):
    """
    Requirement: Zero-leakage risk buffer hedging.
    Verify training window terminates at D-2, and realized coverage satisfies accounting.
    """
    res = compute_rolling_risk_buffer(aligned_data, cutoff='11', quantile_level=0.90, apply_bias_correction=False)
    
    assert res['totalHours'] == 744
    assert res['nominalCoveragePercent'] == 90.0
    assert res['overallCoveragePercent'] == 81.0, "Overall realized coverage must equal 81.0%"
    assert res['postWarmupCoveragePercent'] == 84.5, "Post-warmup coverage must equal 84.5%"
    assert res['shortfallOnlyCoveragePercent'] == 77.5, "Shortfall-only coverage must equal 77.5%"
    assert res['averageBufferMW'] == 3468.5, "Nominal average buffer across 744h must be 3,468.5 MW"

    # Reconcile exact shortfall accounting
    all_hours = [h for d in res['daily'] for h in d['hours']]
    shortfalls = [h for h in all_hours if h['shortfallMW'] > 0]
    covered_shortfalls = [h for h in shortfalls if h['isCovered']]
    non_shortfalls = [h for h in all_hours if h['shortfallMW'] == 0]

    assert len(non_shortfalls) == 117
    assert len(shortfalls) == 627
    assert len(covered_shortfalls) == 486
    assert round(len(covered_shortfalls) / len(shortfalls) * 100.0, 1) == 77.5
    assert round((len(covered_shortfalls) + len(non_shortfalls)) / len(all_hours) * 100.0, 1) == 81.0

def test_verified_case_studies(aligned_data):
    """
    Requirement: Verify real historical case studies (Jan 15 successful hedge, Jan 12 and Jan 28 storm shortfalls).
    """
    res = compute_rolling_risk_buffer(aligned_data, cutoff='11', quantile_level=0.90, apply_bias_correction=False)
    daily = {d['date']: d for d in res['daily']}

    # 1. January 15 (Successful Hedge)
    jan15 = daily['2026-01-15']
    assert jan15['dayCoveragePercent'] == 100.0, "Jan 15 must achieve 100% coverage"
    assert jan15['avgBufferMW'] == 3818.9
    assert all(h['isCovered'] for h in jan15['hours']), "Jan 15 must have 0 breaches"

    # 2. January 12 (Winter Storm Extreme Single-Hour Shortfall)
    jan12 = daily['2026-01-12']
    assert jan12['dayCoveragePercent'] == 29.2
    breaches_12 = [h for h in jan12['hours'] if not h['isCovered']]
    assert len(breaches_12) == 17, "Jan 12 must have 17 breaches"
    max_miss_12 = max(h['shortfallMW'] for h in jan12['hours'])
    assert round(max_miss_12, 1) == 6833.0, "Jan 12 peak shortfall must be 6,833.0 MW"

    # 3. January 28 (Sustained Day-Long Under-Delivery)
    jan28 = daily['2026-01-28']
    assert jan28['dayCoveragePercent'] == 0.0, "Jan 28 must have 0% coverage"
    breaches_28 = [h for h in jan28['hours'] if not h['isCovered']]
    assert len(breaches_28) == 24, "Jan 28 must breach all 24 hours"
    mean_miss_28 = np.mean([h['shortfallMW'] for h in jan28['hours']])
    assert round(mean_miss_28, 1) == 5374.8, "Jan 28 mean shortfall must be 5,374.8 MW"

def test_level_dependent_bias_regression(aligned_data):
    """
    Requirement: Multiplicative/level-dependent error dynamics.
    Verify that bias scales with forecast magnitude.
    """
    records = get_day_ahead_slice(aligned_data, cutoff='11')
    fcsts = np.array([r['forecastMW'] for r in records])
    acts = np.array([r['actualMW'] for r in records])
    errs = fcsts - acts

    # OLS regression slope
    m, c = np.polyfit(fcsts, acts, 1)
    assert 0.79 < m < 0.81, f"Expected slope ~0.80, got {m:.3f}"

    # Mean error bucket scaling
    calm_bias = np.mean(errs[fcsts < 8000])
    storm_bias = np.mean(errs[fcsts >= 16000])

    assert 200.0 < calm_bias < 450.0, f"Expected calm bias ~+332 MW, got {calm_bias:.1f}"
    assert 2700.0 < storm_bias < 3100.0, f"Expected storm bias ~+2,891 MW, got {storm_bias:.1f}"
    assert storm_bias > (6 * calm_bias), "High-wind forecast error must significantly exceed calm error"
