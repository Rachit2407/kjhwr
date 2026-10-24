"""
Core Metrics, Baselines, and Risk Buffer Engine for UK Wind Day-Ahead Decisions.
Uses pure Python and NumPy for zero-dependency, ultra-fast calculations (<15ms).
No pandas or heavy dependencies in runtime to ensure lightweight Vercel serverless deployment (<20MB).
"""

import os
import json
import numpy as np
from datetime import datetime, timedelta

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data"))

def load_aligned_data():
    path = os.path.join(DATA_DIR, "aligned_day_ahead.json")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def load_lead_time_records():
    path = os.path.join(DATA_DIR, "lead_time_records.json")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def get_day_ahead_slice(data, cutoff="11", start_date="2026-01-02", end_date="2026-02-01"):
    """
    Returns filtered records for decisions made in January 2026 
    (delivery dates 2026-01-02 to 2026-02-01).
    """
    cutoff_str = str(cutoff)
    records = []
    for d in data:
        if start_date <= d['deliveryDate'] <= end_date:
            c_info = d['cutoffs'].get(cutoff_str)
            if c_info is not None:
                records.append({
                    'startTime': d['startTime'],
                    'deliveryDate': d['deliveryDate'],
                    'decisionDate': d['decisionDate'],
                    'hourOfDay': d['hourOfDay'],
                    'actualMW': d['actualMW'],
                    'forecastMW': c_info['forecastMW'],
                    'publishTime': c_info['publishTime'],
                    'leadTimeHours': c_info['leadTimeHours'],
                    'errorMW': c_info['errorMW'],
                    'baseline48h': d['baseline48h'],
                    'baseline7dMean': d['baseline7dMean']
                })
    return records

def compute_summary_kpis(records):
    """
    Computes comprehensive accuracy KPIs for a set of day-ahead records.
    """
    if not records:
        return {}
        
    acts = np.array([r['actualMW'] for r in records], dtype=float)
    fcsts = np.array([r['forecastMW'] for r in records], dtype=float)
    errors = fcsts - acts # e = forecast - actual (over-forecast > 0)
    abs_errors = np.abs(errors)
    
    mae = float(np.mean(abs_errors))
    rmse = float(np.sqrt(np.mean(errors ** 2)))
    mean_bias = float(np.mean(errors))
    sum_actuals = float(np.sum(acts))
    wape = float((np.sum(abs_errors) / sum_actuals) * 100.0) if sum_actuals > 0 else 0.0
    
    p10 = float(np.quantile(errors, 0.10))
    p50 = float(np.quantile(errors, 0.50))
    p90 = float(np.quantile(errors, 0.90))
    
    # Baselines
    b1_records = [r for r in records if r['baseline48h'] is not None]
    if b1_records:
        b1_acts = np.array([r['actualMW'] for r in b1_records], dtype=float)
        b1_vals = np.array([r['baseline48h'] for r in b1_records], dtype=float)
        b1_mae = float(np.mean(np.abs(b1_vals - b1_acts)))
        b1_rmse = float(np.sqrt(np.mean((b1_vals - b1_acts) ** 2)))
        skill_b1 = float((1.0 - mae / b1_mae) * 100.0) if b1_mae > 0 else 0.0
    else:
        b1_mae, b1_rmse, skill_b1 = None, None, None

    b2_records = [r for r in records if r['baseline7dMean'] is not None]
    if b2_records:
        b2_acts = np.array([r['actualMW'] for r in b2_records], dtype=float)
        b2_vals = np.array([r['baseline7dMean'] for r in b2_records], dtype=float)
        b2_mae = float(np.mean(np.abs(b2_vals - b2_acts)))
        b2_rmse = float(np.sqrt(np.mean((b2_vals - b2_acts) ** 2)))
        skill_b2 = float((1.0 - mae / b2_mae) * 100.0) if b2_mae > 0 else 0.0
    else:
        b2_mae, b2_rmse, skill_b2 = None, None, None
        
    return {
        'count': len(records),
        'maeMW': round(mae, 1),
        'rmseMW': round(rmse, 1),
        'meanBiasMW': round(mean_bias, 1),
        'wapePercent': round(wape, 2),
        'errorQuantiles': {
            'p10': round(p10, 1),
            'p50': round(p50, 1),
            'p90': round(p90, 1)
        },
        'baseline48h': {
            'maeMW': round(b1_mae, 1) if b1_mae is not None else None,
            'rmseMW': round(b1_rmse, 1) if b1_rmse is not None else None,
            'skillScorePercent': round(skill_b1, 1) if skill_b1 is not None else None
        },
        'baseline7dMean': {
            'maeMW': round(b2_mae, 1) if b2_mae is not None else None,
            'rmseMW': round(b2_rmse, 1) if b2_rmse is not None else None,
            'skillScorePercent': round(skill_b2, 1) if skill_b2 is not None else None
        }
    }

def compute_diurnal_breakdown(records):
    """
    Computes hour-of-day (0 to 23) error metrics and quantiles.
    """
    by_hour = {}
    for r in records:
        by_hour.setdefault(r['hourOfDay'], []).append(r)
        
    diurnal = []
    for h in range(24):
        hrs = by_hour.get(h, [])
        if not hrs:
            continue
        acts = np.array([r['actualMW'] for r in hrs], dtype=float)
        fcsts = np.array([r['forecastMW'] for r in hrs], dtype=float)
        errs = fcsts - acts
        diurnal.append({
            'hour': h,
            'avgActualMW': round(float(np.mean(acts)), 1),
            'avgForecastMW': round(float(np.mean(fcsts)), 1),
            'maeMW': round(float(np.mean(np.abs(errs))), 1),
            'rmseMW': round(float(np.sqrt(np.mean(errs ** 2))), 1),
            'meanBiasMW': round(float(np.mean(errs)), 1),
            'p10MW': round(float(np.quantile(errs, 0.10)), 1),
            'p50MW': round(float(np.quantile(errs, 0.50)), 1),
            'p90MW': round(float(np.quantile(errs, 0.90)), 1)
        })
    return diurnal

def compute_rolling_risk_buffer(all_data, cutoff="11", quantile_level=0.90, min_sample=48, apply_bias_correction=False):
    """
    Computes the strictly out-of-sample rolling risk buffer for delivery days Jan 2 to Feb 1.
    For target day D, training window is strictly completed days <= D-2 using the same cutoff.
    """
    cutoff_str = str(cutoff)
    all_sorted = sorted(all_data, key=lambda x: x['startTime'])
    delivery_days = sorted(list(set(d['deliveryDate'] for d in all_sorted if '2026-01-02' <= d['deliveryDate'] <= '2026-02-01')))
    
    daily_results = []
    all_buffers = []
    all_shortfalls = []
    covered_all = []
    covered_shortfall_only = []
    uncovered_shortfall_mw = []
    
    for day in delivery_days:
        day_dt = datetime.strptime(day, '%Y-%m-%d')
        d_minus_2 = (day_dt - timedelta(days=2)).strftime('%Y-%m-%d')
        
        # Historical training records strictly <= D-2
        train_records = [
            d for d in all_sorted 
            if d['deliveryDate'] <= d_minus_2 
            and d['cutoffs'].get(cutoff_str) is not None
        ]
        
        train_errors = np.array([d['cutoffs'][cutoff_str]['errorMW'] for d in train_records], dtype=float)
        train_fcsts = np.array([d['cutoffs'][cutoff_str]['forecastMW'] for d in train_records], dtype=float)
        
        target_records = [
            d for d in all_sorted 
            if d['deliveryDate'] == day 
            and d['cutoffs'].get(cutoff_str) is not None
        ]
        
        day_hourly = []
        is_pooled = len(train_errors) < min_sample
        
        rolling_bias = float(np.mean(train_errors)) if len(train_errors) > 0 else 0.0
        train_calc_errors = (train_errors - rolling_bias) if apply_bias_correction else train_errors
        
        if is_pooled:
            buf_val = max(0.0, float(np.quantile(train_calc_errors, quantile_level))) if len(train_calc_errors) > 0 else 0.0
            for r in target_records:
                act = r['actualMW']
                raw_fcst = r['cutoffs'][cutoff_str]['forecastMW']
                fcst = (raw_fcst - rolling_bias) if apply_bias_correction else raw_fcst
                err = fcst - act
                shortfall = max(0.0, err)
                is_cov = shortfall <= buf_val
                
                all_buffers.append(buf_val)
                all_shortfalls.append(shortfall)
                covered_all.append(is_cov)
                if err > 0:
                    covered_shortfall_only.append(is_cov)
                    if not is_cov:
                        uncovered_shortfall_mw.append(shortfall - buf_val)
                        
                day_hourly.append({
                    'hour': r['hourOfDay'],
                    'startTime': r['startTime'],
                    'actualMW': act,
                    'forecastMW': raw_fcst,
                    'hedgedForecastMW': round(fcst, 1),
                    'bufferMW': round(buf_val, 1),
                    'shortfallMW': round(shortfall, 1),
                    'isCovered': is_cov,
                    'regime': 'Pooled (Early Warm-up)'
                })
        else:
            med_fcst = float(np.median(train_fcsts))
            low_errors = train_calc_errors[train_fcsts <= med_fcst]
            high_errors = train_calc_errors[train_fcsts > med_fcst]
            
            buf_low = max(0.0, float(np.quantile(low_errors, quantile_level))) if len(low_errors) >= 10 else max(0.0, float(np.quantile(train_calc_errors, quantile_level)))
            buf_high = max(0.0, float(np.quantile(high_errors, quantile_level))) if len(high_errors) >= 10 else max(0.0, float(np.quantile(train_calc_errors, quantile_level)))
            
            for r in target_records:
                act = r['actualMW']
                raw_fcst = r['cutoffs'][cutoff_str]['forecastMW']
                fcst = (raw_fcst - rolling_bias) if apply_bias_correction else raw_fcst
                regime = 'High Wind (>Med)' if raw_fcst > med_fcst else 'Low Wind (<=Med)'
                buf_val = buf_high if raw_fcst > med_fcst else buf_low
                err = fcst - act
                shortfall = max(0.0, err)
                is_cov = shortfall <= buf_val
                
                all_buffers.append(buf_val)
                all_shortfalls.append(shortfall)
                covered_all.append(is_cov)
                if err > 0:
                    covered_shortfall_only.append(is_cov)
                    if not is_cov:
                        uncovered_shortfall_mw.append(shortfall - buf_val)
                        
                day_hourly.append({
                    'hour': r['hourOfDay'],
                    'startTime': r['startTime'],
                    'actualMW': act,
                    'forecastMW': raw_fcst,
                    'hedgedForecastMW': round(fcst, 1),
                    'bufferMW': round(buf_val, 1),
                    'shortfallMW': round(shortfall, 1),
                    'isCovered': is_cov,
                    'regime': regime
                })
                
        daily_results.append({
            'date': day,
            'isWarmup': is_pooled,
            'avgBufferMW': round(float(np.mean([h['bufferMW'] for h in day_hourly])), 1),
            'dayCoveragePercent': round(float(np.mean([h['isCovered'] for h in day_hourly])) * 100.0, 1),
            'hours': day_hourly
        })
        
    # Weekly coverage breakdown
    weeks_def = [
        ("Week 1 (Warm-up, Jan 2 - Jan 8)", "2026-01-02", "2026-01-08"),
        ("Week 2 (Jan 9 - Jan 15)", "2026-01-09", "2026-01-15"),
        ("Week 3 (Jan 16 - Jan 22)", "2026-01-16", "2026-01-22"),
        ("Week 4 (Jan 23 - Jan 29)", "2026-01-23", "2026-01-29"),
        ("Week 5 (Jan 30 - Feb 1)", "2026-01-30", "2026-02-01"),
    ]
    weekly_breakdown = []
    for w_name, w_start, w_end in weeks_def:
        w_days = [d for d in daily_results if w_start <= d['date'] <= w_end]
        if w_days:
            w_cov = float(np.mean([d['dayCoveragePercent'] for d in w_days]))
            w_buf = float(np.mean([d['avgBufferMW'] for d in w_days]))
            weekly_breakdown.append({
                'week': w_name,
                'startDate': w_start,
                'endDate': w_end,
                'realizedCoveragePercent': round(w_cov, 1),
                'avgBufferMW': round(w_buf, 1)
            })

    post_warmup_days = [d for d in daily_results if d['date'] >= '2026-01-09']
    post_warmup_cov = float(np.mean([d['dayCoveragePercent'] for d in post_warmup_days])) if post_warmup_days else 0.0

    return {
        'nominalQuantile': quantile_level,
        'nominalCoveragePercent': round(quantile_level * 100.0, 1),
        'overallCoveragePercent': round(float(np.mean(covered_all)) * 100.0, 1) if covered_all else 0.0,
        'postWarmupCoveragePercent': round(post_warmup_cov, 1),
        'shortfallOnlyCoveragePercent': round(float(np.mean(covered_shortfall_only)) * 100.0, 1) if covered_shortfall_only else 0.0,
        'averageBufferMW': round(float(np.mean(all_buffers)), 1) if all_buffers else 0.0,
        'meanUncoveredShortfallMW': round(float(np.mean(uncovered_shortfall_mw)), 1) if uncovered_shortfall_mw else 0.0,
        'totalHours': len(covered_all),
        'weeklyBreakdown': weekly_breakdown,
        'daily': daily_results
    }

def compute_lead_time_curve(lead_time_records, bin_size_hours=6):
    """
    Computes forecast accuracy degradation curve as lead time increases.
    Population: ALL forward forecast vintages (0.5h to 66.5h) matched against actuals.
    """
    bins = {}
    for r in lead_time_records:
        lh = r['leadTimeHours']
        b_idx = int(lh // bin_size_hours) * bin_size_hours
        bins.setdefault(b_idx, []).append(r)
        
    curve = []
    for b_start in sorted(bins.keys()):
        recs = bins[b_start]
        errs = np.array([r['errorMW'] for r in recs], dtype=float)
        b_label = f"{b_start}-{b_start + bin_size_hours}h"
        curve.append({
            'leadTimeBin': b_label,
            'binStartHours': b_start,
            'sampleCount': len(recs),
            'maeMW': round(float(np.mean(np.abs(errs))), 1),
            'rmseMW': round(float(np.sqrt(np.mean(errs ** 2))), 1),
            'meanBiasMW': round(float(np.mean(errs)), 1),
            'p10MW': round(float(np.quantile(errs, 0.10)), 1),
            'p90MW': round(float(np.quantile(errs, 0.90)), 1)
        })
    return curve
