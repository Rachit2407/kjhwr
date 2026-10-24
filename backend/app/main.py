"""
FastAPI Application serving Day-Ahead Decisions, Accuracy Benchmarks,
Procurement Risk Simulator, and Static Frontend bundle.
"""

import os
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.app.metrics import (
    load_aligned_data,
    load_lead_time_records,
    get_day_ahead_slice,
    compute_summary_kpis,
    compute_diurnal_breakdown,
    compute_rolling_risk_buffer,
    compute_lead_time_curve
)

app = FastAPI(
    title="UK Wind Day-Ahead Decision & Accuracy Platform",
    description="Elexon BMRS Wind Generation Decision & Forecast Accuracy Engine for UK Day-Ahead Procurement",
    version="1.0.0"
)

# CORS for local Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory cache of aligned data (loads in ~15ms)
ALIGNED_DATA = load_aligned_data()
LEAD_TIME_RECORDS = load_lead_time_records()

# Half-hourly actuals cache
DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data"))
HH_PATH = os.path.join(DATA_DIR, "half_hourly_actuals.json")
HALF_HOURLY_ACTUALS = {}
if os.path.exists(HH_PATH):
    import json
    with open(HH_PATH, "r", encoding="utf-8") as f:
        HALF_HOURLY_ACTUALS = json.load(f)

SUPPORTED_CUTOFFS = ["9", "11", "12", "14", "17", "23"]

@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "dataset": "Elexon BMRS (FUELHH WIND & WINDFOR)",
        "scope": "National GB Wind Power (January 2026 Decisions)",
        "totalHourlyRows": len(ALIGNED_DATA),
        "leadTimeRecords": len(LEAD_TIME_RECORDS),
        "supportedCutoffs": SUPPORTED_CUTOFFS,
        "defaultCutoff": "11"
    }

@app.get("/api/day-ahead")
def get_day_ahead(
    date: str = Query("2026-01-15", description="Target delivery date (YYYY-MM-DD)"),
    cutoff: str = Query("11", description="Day-ahead cutoff hour on D-1 (e.g. 11)")
):
    if cutoff not in SUPPORTED_CUTOFFS:
        raise HTTPException(status_code=400, detail=f"Cutoff {cutoff} not supported. Use one of {SUPPORTED_CUTOFFS}")
        
    day_records = [
        d for d in ALIGNED_DATA 
        if d['deliveryDate'] == date 
        and d['cutoffs'].get(cutoff) is not None
    ]
    
    if not day_records:
        raise HTTPException(status_code=404, detail=f"No data available for delivery date {date}")
        
    day_records.sort(key=lambda x: x['hourOfDay'])
    
    # Format hourly rows
    hours_output = []
    acts = []
    fcsts = []
    errors = []
    
    for r in day_records:
        c_info = r['cutoffs'][cutoff]
        act = r['actualMW']
        fcst = c_info['forecastMW']
        err = c_info['errorMW']
        acts.append(act)
        fcsts.append(fcst)
        errors.append(err)
        
        hours_output.append({
            "hour": r['hourOfDay'],
            "startTime": r['startTime'],
            "actualMW": act,
            "forecastMW": fcst,
            "errorMW": err,
            "publishTime": c_info['publishTime'],
            "leadTimeHours": c_info['leadTimeHours'],
            "baseline48h": r['baseline48h'],
            "baseline7dMean": r['baseline7dMean']
        })
        
    # Extract granular 48 half-hour actuals for this date
    hh_points = []
    for sp in range(1, 49):
        # settlement period timestamp
        sp_hour = (sp - 1) // 2
        sp_min = 30 if (sp % 2 == 0) else 0
        iso_key = f"{date}T{sp_hour:02d}:{sp_min:02d}:00Z"
        val = HALF_HOURLY_ACTUALS.get(iso_key)
        hh_points.append({
            "settlementPeriod": sp,
            "time": f"{sp_hour:02d}:{sp_min:02d}",
            "actualMW": val
        })
        
    return {
        "deliveryDate": date,
        "decisionDate": day_records[0]['decisionDate'],
        "cutoffHour": int(cutoff),
        "cutoffRule": f"Latest forecast published <= {day_records[0]['decisionDate']}T{int(cutoff):02d}:00:00Z",
        "kpis": {
            "totalActualMWh": round(sum(acts), 1),
            "totalForecastMWh": round(sum(fcsts), 1),
            "dayMaeMW": round(sum(abs(e) for e in errors) / len(errors), 1),
            "peakActualMW": max(acts),
            "peakForecastMW": max(fcsts),
            "minActualMW": min(acts),
            "minForecastMW": min(fcsts)
        },
        "hourly": hours_output,
        "halfHourlyActuals": hh_points
    }

@app.get("/api/accuracy/summary")
def get_accuracy_summary(
    cutoff: str = Query("11", description="Day-ahead cutoff hour on D-1")
):
    if cutoff not in SUPPORTED_CUTOFFS:
        raise HTTPException(status_code=400, detail=f"Cutoff {cutoff} not supported")
        
    records = get_day_ahead_slice(ALIGNED_DATA, cutoff=cutoff)
    kpis = compute_summary_kpis(records)
    diurnal = compute_diurnal_breakdown(records)
    
    return {
        "cutoffHour": int(cutoff),
        "evaluationWindow": {
            "decisionsPeriod": "2026-01-01 to 2026-01-31 (Day D-1)",
            "deliveryPeriod": "2026-01-02 to 2026-02-01 (Day D)",
            "totalHours": len(records)
        },
        "summary": kpis,
        "diurnalProfile": diurnal
    }

@app.get("/api/accuracy/lead-time")
def get_lead_time_analysis():
    curve = compute_lead_time_curve(LEAD_TIME_RECORDS, bin_size_hours=6)
    return {
        "description": "Accuracy degradation by lead time across ALL forecast vintages in January 2026",
        "totalObservations": len(LEAD_TIME_RECORDS),
        "curve": curve
    }

@app.get("/api/procurement/simulate")
def simulate_procurement(
    cutoff: str = Query("11", description="Cutoff hour on D-1"),
    demand_mw: float = Query(30000.0, description="Illustrative consumer demand baseline (MW)"),
    quantile: float = Query(0.90, description="Risk confidence quantile (0.50 to 0.99)"),
    date: str = Query(None, description="Optional single delivery date (YYYY-MM-DD)")
):
    if cutoff not in SUPPORTED_CUTOFFS:
        raise HTTPException(status_code=400, detail=f"Cutoff {cutoff} not supported")
    if not (0.50 <= quantile <= 0.99):
        raise HTTPException(status_code=400, detail="Quantile must be between 0.50 and 0.99")
        
    buffer_res = compute_rolling_risk_buffer(ALIGNED_DATA, cutoff=cutoff, quantile_level=quantile)
    
    # If a specific date is requested, enrich with procurement math
    if date:
        day_match = next((d for d in buffer_res['daily'] if d['date'] == date), None)
        if not day_match:
            raise HTTPException(status_code=404, detail=f"Date {date} not in evaluated January delivery window")
            
        enriched_hours = []
        for h in day_match['hours']:
            act = h['actualMW']
            fcst = h['forecastMW']
            buf = h['bufferMW']
            
            base_proc = max(0.0, demand_mw - fcst)
            total_proc = base_proc + buf
            act_res = max(0.0, demand_mw - act)
            imbalance = total_proc - act_res # positive = surplus sold, negative = deficit bought
            
            enriched_hours.append({
                "hour": h['hour'],
                "startTime": h['startTime'],
                "actualWindMW": act,
                "forecastWindMW": fcst,
                "demandMW": demand_mw,
                "baseProcurementMW": round(base_proc, 1),
                "riskBufferMW": round(buf, 1),
                "totalProcuredMW": round(total_proc, 1),
                "actualResidualDemandMW": round(act_res, 1),
                "netImbalanceMW": round(imbalance, 1),
                "shortfallMW": h['shortfallMW'],
                "isCovered": h['isCovered'],
                "regime": h['regime']
            })
            
        return {
            "date": date,
            "demandMW": demand_mw,
            "riskQuantile": quantile,
            "isWarmup": day_match['isWarmup'],
            "dayCoveragePercent": day_match['dayCoveragePercent'],
            "avgBufferMW": day_match['avgBufferMW'],
            "hours": enriched_hours
        }
        
    # Return overall backtest results
    return {
        "cutoffHour": int(cutoff),
        "demandMW": demand_mw,
        "riskQuantile": quantile,
        "overallCoveragePercent": buffer_res['overallCoveragePercent'],
        "shortfallOnlyCoveragePercent": buffer_res['shortfallOnlyCoveragePercent'],
        "averageBufferMW": buffer_res['averageBufferMW'],
        "meanUncoveredShortfallMW": buffer_res['meanUncoveredShortfallMW'],
        "totalEvaluatedHours": buffer_res['totalHours'],
        "dailySummary": [
            {
                "date": d['date'],
                "isWarmup": d['isWarmup'],
                "avgBufferMW": d['avgBufferMW'],
                "coveragePercent": d['dayCoveragePercent']
            }
            for d in buffer_res['daily']
        ]
    }

# Mount static frontend build if it exists (for unified Docker and local production)
FRONTEND_DIST = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
if os.path.exists(FRONTEND_DIST):
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
