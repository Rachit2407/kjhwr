"""
ETL Pipeline & Data Sanity Verification Script for Elexon BMRS
Fetches FUELHH (fuelType=WIND) and WINDFOR from 2025-12-25 to 2026-02-03.
Generates an auditable Data Sanity Report.
"""

import urllib.request
import urllib.error
import json
import time
import os
from datetime import datetime, timedelta, timezone

DATA_DIR = os.path.dirname(os.path.abspath(__file__))
START_DATE = datetime(2025, 12, 25, 0, 0, tzinfo=timezone.utc)
END_DATE = datetime(2026, 2, 3, 0, 0, tzinfo=timezone.utc)

def fetch_url(url, retries=5, backoff=2):
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={
                'Accept': 'application/json',
                'User-Agent': 'ElexonDataAuditor/1.0'
            })
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode('utf-8'))
        except Exception as e:
            if attempt < retries - 1:
                sleep_sec = backoff ** attempt
                print(f"Fetch failed ({e}), retrying in {sleep_sec}s...")
                time.sleep(sleep_sec)
            else:
                raise e

def fetch_fuelhh_wind(start_dt, end_dt, chunk_days=2):
    print(f"\n--- Fetching FUELHH (WIND) from {start_dt.date()} to {end_dt.date()} ---")
    current = start_dt
    all_records = []
    
    while current < end_dt:
        chunk_end = min(current + timedelta(days=chunk_days), end_dt)
        from_str = current.strftime('%Y-%m-%dT%H:%M:%SZ')
        to_str = chunk_end.strftime('%Y-%m-%dT%H:%M:%SZ')
        url = (
            f"https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream"
            f"?publishDateTimeFrom={from_str}&publishDateTimeTo={to_str}"
        )
        print(f"Fetching FUELHH: {from_str} -> {to_str} ...", end=" ", flush=True)
        data = fetch_url(url)
        # Filter strictly for fuelType WIND
        wind_records = [r for r in data if r.get('fuelType') == 'WIND']
        print(f"Total rows: {len(data)}, WIND: {len(wind_records)}")
        all_records.extend(wind_records)
        current = chunk_end
        time.sleep(0.3)
        
    return all_records

def fetch_windfor(start_dt, end_dt, chunk_days=2):
    print(f"\n--- Fetching WINDFOR from {start_dt.date()} to {end_dt.date()} ---")
    current = start_dt
    all_records = []
    
    while current < end_dt:
        chunk_end = min(current + timedelta(days=chunk_days), end_dt)
        from_str = current.strftime('%Y-%m-%dT%H:%M:%SZ')
        to_str = chunk_end.strftime('%Y-%m-%dT%H:%M:%SZ')
        url = (
            f"https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR/stream"
            f"?publishDateTimeFrom={from_str}&publishDateTimeTo={to_str}"
        )
        print(f"Fetching WINDFOR: {from_str} -> {to_str} ...", end=" ", flush=True)
        data = fetch_url(url)
        print(f"Records: {len(data)}")
        all_records.extend(data)
        current = chunk_end
        time.sleep(0.3)
        
    return all_records

def run_sanity_checks(fuelhh_raw, windfor_raw):
    print("\n=======================================================")
    print("           ELEXON DATA SANITY & INTEGRITY REPORT        ")
    print("=======================================================")
    
    # 1. Row counts & Samples
    print(f"\n1. ROW COUNTS & SAMPLE PAYLOADS:")
    print(f"Total FUELHH (WIND) raw records: {len(fuelhh_raw)}")
    print(f"Total WINDFOR raw records:        {len(windfor_raw)}")
    
    if fuelhh_raw:
        print("\nRaw FUELHH Sample [0]:")
        print(json.dumps(fuelhh_raw[0], indent=2))
    if windfor_raw:
        print("\nRaw WINDFOR Sample [0]:")
        print(json.dumps(windfor_raw[0], indent=2))

    # 2. FUELHH Dedup & Revision Analysis
    print(f"\n2. FUELHH (ACTUALS) INTEGRITY:")
    # Check if (settlementDate, settlementPeriod) or startTime has duplicates
    st_map = {}
    duplicates = 0
    revisions = 0
    for r in fuelhh_raw:
        st = r['startTime']
        if st in st_map:
            duplicates += 1
            # Check if generation changed
            if st_map[st]['generation'] != r['generation']:
                revisions += 1
            # Keep latest publishTime
            if r['publishTime'] > st_map[st]['publishTime']:
                st_map[st] = r
        else:
            st_map[st] = r
            
    print(f"Unique FUELHH startTimes: {len(st_map)}")
    print(f"Duplicate FUELHH rows found: {duplicates}")
    print(f"Revision occurrences (generation value differed): {revisions}")
    
    # Check expected startTimes across period
    all_fuelhh_st = sorted(st_map.keys())
    earliest_f = all_fuelhh_st[0]
    latest_f = all_fuelhh_st[-1]
    print(f"FUELHH startTime span: {earliest_f} -> {latest_f}")
    
    # Check for missing 30-min intervals
    dt_f = [datetime.fromisoformat(s.replace('Z', '+00:00')) for s in all_fuelhh_st]
    missing_intervals = []
    for i in range(len(dt_f) - 1):
        delta = (dt_f[i+1] - dt_f[i]).total_seconds() / 60
        if delta != 30.0:
            missing_intervals.append((dt_f[i].isoformat(), dt_f[i+1].isoformat(), delta))
            
    print(f"Missing/irregular 30-min intervals in FUELHH: {len(missing_intervals)}")
    if missing_intervals:
        for m in missing_intervals[:5]:
            print(f"  Gap: {m[0]} -> {m[1]} (gap: {m[2]} mins)")

    # 3. WINDFOR Analysis
    print(f"\n3. WINDFOR (FORECASTS) INTEGRITY:")
    pub_times = sorted(set(r['publishTime'] for r in windfor_raw))
    print(f"Total unique publish runs: {len(pub_times)}")
    print(f"Earliest publishTime: {pub_times[0]}")
    print(f"Latest publishTime:   {pub_times[-1]}")
    
    # Check average runs per day
    dt_pubs = [datetime.fromisoformat(p.replace('Z', '+00:00')) for p in pub_times]
    total_days = (dt_pubs[-1] - dt_pubs[0]).total_seconds() / 86400
    print(f"Publish runs per day: {len(pub_times) / total_days:.2f} runs/day")
    
    # Check minutes in publishTime and startTime
    pub_minutes = set(dt.minute for dt in dt_pubs)
    print(f"Unique minutes in publishTime: {pub_minutes}")
    
    st_windfor = [datetime.fromisoformat(r['startTime'].replace('Z', '+00:00')) for r in windfor_raw]
    st_minutes = set(dt.minute for dt in st_windfor)
    print(f"Unique minutes in WINDFOR startTime: {st_minutes} (Hourly strictly :00)")
    
    # Horizon analysis per publish run
    horizons = []
    for p in pub_times:
        p_dt = datetime.fromisoformat(p.replace('Z', '+00:00'))
        run_records = [r for r in windfor_raw if r['publishTime'] == p]
        run_sts = [datetime.fromisoformat(r['startTime'].replace('Z', '+00:00')) for r in run_records]
        max_st = max(run_sts)
        lead_h = (max_st - p_dt).total_seconds() / 3600
        horizons.append(lead_h)
        
    print(f"Forecast Horizon stats: Min={min(horizons):.1f}h, Median={sorted(horizons)[len(horizons)//2]:.1f}h, Max={max(horizons):.1f}h")

    # 4. Hourly Aggregation Check
    print(f"\n4. HOURLY AGGREGATION & RECONCILIATION VERIFICATION:")
    # Group FUELHH by hour
    hour_to_sps = {}
    for st, r in st_map.items():
        dt = datetime.fromisoformat(st.replace('Z', '+00:00'))
        hour_key = dt.replace(minute=0, second=0).isoformat()
        hour_to_sps.setdefault(hour_key, []).append((dt.minute, r['generation']))
        
    single_sp_hours = [k for k, sps in hour_to_sps.items() if len(sps) != 2]
    print(f"Total aggregated hours: {len(hour_to_sps)}")
    print(f"Hours with != 2 settlement periods (e.g. boundary): {len(single_sp_hours)}")
    if single_sp_hours:
        print(f"  Boundary hours with single SP: {single_sp_hours[:3]}")

    return st_map, pub_times

def main():
    fuelhh_file = os.path.join(DATA_DIR, "raw_fuelhh_wind.json")
    windfor_file = os.path.join(DATA_DIR, "raw_windfor.json")
    
    # Fetch or load
    if not os.path.exists(fuelhh_file):
        fuelhh_raw = fetch_fuelhh_wind(START_DATE, END_DATE)
        with open(fuelhh_file, "w") as f:
            json.dump(fuelhh_raw, f)
    else:
        print(f"Loading existing {fuelhh_file}...")
        with open(fuelhh_file, "r") as f:
            fuelhh_raw = json.load(f)
            
    if not os.path.exists(windfor_file):
        windfor_raw = fetch_windfor(START_DATE, END_DATE)
        with open(windfor_file, "w") as f:
            json.dump(windfor_raw, f)
    else:
        print(f"Loading existing {windfor_file}...")
        with open(windfor_file, "r") as f:
            windfor_raw = json.load(f)
            
    run_sanity_checks(fuelhh_raw, windfor_raw)

if __name__ == "__main__":
    main()
