"""
Builds the pre-computed, aligned dataset for Day-Ahead trading decisions,
accuracy evaluation, rolling out-of-sample risk buffers, and baselines.
"""

import json
import os
from datetime import datetime, timedelta, timezone

DATA_DIR = os.path.dirname(os.path.abspath(__file__))

def build_aligned_dataset():
    with open(os.path.join(DATA_DIR, "raw_fuelhh_wind.json")) as f:
        fuelhh_raw = json.load(f)
    with open(os.path.join(DATA_DIR, "raw_windfor.json")) as f:
        windfor_raw = json.load(f)

    # 1. Dedup FUELHH (latest publishTime wins)
    fuelhh_by_st = {}
    for r in fuelhh_raw:
        st = r['startTime']
        if st not in fuelhh_by_st or r['publishTime'] > fuelhh_by_st[st]['publishTime']:
            fuelhh_by_st[st] = r

    # 2. Hourly actuals (strict pair averaging; if only 1 SP exists, NaN)
    hourly_actuals = {}
    half_hourly_actuals = {}
    for st, r in fuelhh_by_st.items():
        dt = datetime.fromisoformat(st.replace('Z', '+00:00'))
        hour_dt = dt.replace(minute=0, second=0)
        hour_key = hour_dt.strftime('%Y-%m-%dT%H:%M:%SZ')
        hourly_actuals.setdefault(hour_key, {})[dt.minute] = r['generation']
        half_hourly_actuals[st] = r['generation']

    valid_actuals = {}
    for k, v in hourly_actuals.items():
        if 0 in v and 30 in v:
            valid_actuals[k] = (v[0] + v[30]) / 2.0
        else:
            valid_actuals[k] = None

    # 3. Organize WINDFOR by startTime
    # For each startTime, keep a list of (publishTime, generation)
    windfor_by_st = {}
    lead_time_records = []
    
    for r in windfor_raw:
        st = r['startTime']
        pt = r['publishTime']
        gen = r['generation']
        windfor_by_st.setdefault(st, []).append({
            'publishTime': pt,
            'generation': gen
        })
        
        # Also record for lead-time analysis if actual exists
        if st in valid_actuals and valid_actuals[st] is not None:
            st_dt = datetime.fromisoformat(st.replace('Z', '+00:00'))
            pt_dt = datetime.fromisoformat(pt.replace('Z', '+00:00'))
            lead_h = (st_dt - pt_dt).total_seconds() / 3600.0
            if lead_h >= 0:
                act = valid_actuals[st]
                lead_time_records.append({
                    'startTime': st,
                    'publishTime': pt,
                    'leadTimeHours': round(lead_h, 1),
                    'forecastMW': gen,
                    'actualMW': round(act, 1),
                    'errorMW': round(gen - act, 1)
                })

    # Sort forecasts by publishTime ascending
    for st in windfor_by_st:
        windfor_by_st[st].sort(key=lambda x: x['publishTime'])

    # 4. Generate Day-Ahead table
    # For target delivery dates Jan 1, 2026 to Feb 1, 2026 (plus warm-up Dec 28 to Dec 31)
    # Target hours t:
    all_hours = sorted(valid_actuals.keys())
    cutoff_hours = [9, 11, 12, 14, 17, 23] # common cutoff options
    
    aligned_day_ahead = []
    
    for h_str in all_hours:
        act = valid_actuals[h_str]
        if act is None:
            continue
            
        h_dt = datetime.fromisoformat(h_str.replace('Z', '+00:00'))
        delivery_date = h_dt.strftime('%Y-%m-%d')
        hour_of_day = h_dt.hour
        
        # Decision day D-1
        decision_date = (h_dt.date() - timedelta(days=1)).strftime('%Y-%m-%d')
        
        # Baselines:
        # Baseline 1: y(t - 48h)
        t_minus_48 = (h_dt - timedelta(hours=48)).strftime('%Y-%m-%dT%H:%M:%SZ')
        b1 = valid_actuals.get(t_minus_48)
        
        # Baseline 2: 7-day historical mean of same hour (t - 48h, t - 72h, ..., t - 192h)
        b2_vals = []
        for d in range(2, 9):
            past_t = (h_dt - timedelta(days=d)).strftime('%Y-%m-%dT%H:%M:%SZ')
            val = valid_actuals.get(past_t)
            if val is not None:
                b2_vals.append(val)
        b2 = round(sum(b2_vals) / len(b2_vals), 1) if b2_vals else None
        
        # Forecasts by cutoff
        available_forecasts = windfor_by_st.get(h_str, [])
        cutoffs_dict = {}
        
        for c in cutoff_hours:
            # Cutoff timestamp on Day D-1
            cutoff_dt = datetime(h_dt.year, h_dt.month, h_dt.day, c, 0, tzinfo=timezone.utc) - timedelta(days=1)
            cutoff_iso = cutoff_dt.strftime('%Y-%m-%dT%H:%M:%SZ')
            
            # Find latest forecast published on or before cutoff
            eligible = [f for f in available_forecasts if f['publishTime'] <= cutoff_iso]
            if eligible:
                latest = eligible[-1]
                pt = latest['publishTime']
                pt_dt = datetime.fromisoformat(pt.replace('Z', '+00:00'))
                lead_h = (h_dt - pt_dt).total_seconds() / 3600.0
                cutoffs_dict[str(c)] = {
                    'forecastMW': latest['generation'],
                    'publishTime': pt,
                    'leadTimeHours': round(lead_h, 1),
                    'errorMW': round(latest['generation'] - act, 1)
                }
            else:
                cutoffs_dict[str(c)] = None
                
        aligned_day_ahead.append({
            'startTime': h_str,
            'deliveryDate': delivery_date,
            'decisionDate': decision_date,
            'hourOfDay': hour_of_day,
            'actualMW': round(act, 1),
            'baseline48h': round(b1, 1) if b1 is not None else None,
            'baseline7dMean': b2,
            'cutoffs': cutoffs_dict
        })

    # Save aligned dataset
    out_aligned = os.path.join(DATA_DIR, "aligned_day_ahead.json")
    with open(out_aligned, "w") as f:
        json.dump(aligned_day_ahead, f)
    print(f"Saved {len(aligned_day_ahead)} aligned hourly rows to {out_aligned} ({os.path.getsize(out_aligned)/1024:.1f} KB)")
    
    out_lead = os.path.join(DATA_DIR, "lead_time_records.json")
    with open(out_lead, "w") as f:
        json.dump(lead_time_records, f)
    print(f"Saved {len(lead_time_records)} lead-time records to {out_lead} ({os.path.getsize(out_lead)/1024:.1f} KB)")

    # Save raw half-hourly actuals for granular display
    out_hh = os.path.join(DATA_DIR, "half_hourly_actuals.json")
    with open(out_hh, "w") as f:
        json.dump(half_hourly_actuals, f)
    print(f"Saved {len(half_hourly_actuals)} half-hourly actuals to {out_hh} ({os.path.getsize(out_hh)/1024:.1f} KB)")

if __name__ == "__main__":
    build_aligned_dataset()
