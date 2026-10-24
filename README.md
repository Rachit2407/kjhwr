# WindCast UK: Day-Ahead Wind Decision & Accuracy Platform

> **A customized decision support and quantitative forecast accuracy engine for UK Day-Ahead wholesale power procurement.**  
> Built for the **REint Full Stack SWE Challenge**.

[![Pytest Tests](https://img.shields.io/badge/pytest-24%20passed-emerald)](tests/)
[![Docker](https://img.shields.io/badge/docker-ready-blue)](Dockerfile)
[![License](https://img.shields.io/badge/license-MIT-slate)](LICENSE)

---

## 1. Problem & Operational Context

A UK energy utility trading on the Day-Ahead Market (DAM) must submit wholesale electricity purchase orders on day **$D-1$** for delivery across all 48 half-hour settlement periods of day **$D$**. 

To meet consumer demand without over-procuring thermal generation or being caught short in the Balancing Mechanism, the trading desk relies on wind generation forecasts. However, wind generation is intermittent and forecasts carry systematic bias and volatility.

### Core Objectives
1. **Latest Day-Ahead Forecast Visibility**: Clearly understand the latest renewable generation forecasts available at trading decision cutoff on Day $D-1$ vs actual generation on Day $D$.
2. **Quantitative Accuracy Evaluation**: Rigorously benchmark forecast performance against actuals and observable baselines across January 2026.
3. **Actionable Procurement Hedging**: Translate quantified forecast error into a strictly out-of-sample rolling risk buffer that protects the utility against wind shortfalls while avoiding excessive thermal over-procurement.

---

## 2. Key Architecture & File Structure

```
.
├── api/
│   ├── index.py                 # Vercel serverless ASGI entrypoint
│   └── requirements.txt         # Serverless runtime dependencies (FastAPI, NumPy)
├── backend/
│   ├── app/
│   │   ├── main.py              # Unified FastAPI application (REST API & static file serving)
│   │   └── metrics.py           # Vectorized metrics engine, baselines & rolling risk buffer
│   ├── requirements.txt         # Backend dependencies (FastAPI, Uvicorn, NumPy)
│   └── __init__.py
├── data/
│   ├── etl_pipeline.py          # Data ingestion script from Elexon BMRS API
│   ├── build_aligned_dataset.py # Hourly alignment & cutoff vintage precomputation script
│   ├── aligned_day_ahead.json   # Pre-computed aligned dataset for Jan 2026 decisions (~780 KB)
│   ├── lead_time_records.json   # 18,015 forward forecast observations (0.5h to 66.5h)
│   └── half_hourly_actuals.json # Granular 48-period settlement actuals
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── DayAheadView.jsx   # Day-Ahead timeline, vintage badge & hourly settlement table
│   │   │   ├── AccuracyLab.jsx    # Monthly KPIs, skill scores, diurnal & lead-time curves
│   │   │   └── ProcurementSim.jsx # Interactive demand slider, rolling buffer & imbalance view
│   │   ├── App.jsx              # Main tabbed layout & compliance disclosures
│   │   ├── api.js               # REST client
│   │   └── index.css            # Tailwind CSS styling
│   ├── package.json
│   └── vite.config.js
├── tests/
│   ├── test_metrics.py          # Unit tests for statistical formulas & test vectors
│   ├── test_leakage.py          # Strict out-of-sample zero-leakage perturbation tests
│   ├── test_lead_time_and_boundaries.py # Forward lead-time bounds, boundary exclusion, dedup
│   ├── test_edge_cases.py       # Calm zero-wind hours & missing interval handling
│   ├── test_hourly_aggregation.py # Half-hour pair aggregation logic tests
│   ├── test_procurement_and_coverage.py # Coverage ratio, procurement arithmetic & window start
│   └── test_api.py              # API endpoint smoke tests
├── Dockerfile                   # Multi-stage production build (Node 22 + Python 3.12)
├── docker-compose.yml           # Single-command container runner
├── vercel.json                  # Vercel deployment routing configuration
└── README.md                    # System documentation & AI tools disclosure
```

---

## 3. Data Ingestion, Reconciliation & Exact Accounting

### Primary Data Sources (Elexon BMRS)
- **Actual Generation**: `FUELHH/stream` filtered strictly to `fuelType == 'WIND'` (2025-12-25 to 2026-02-03).
- **Forecast Generation**: `WINDFOR/stream` (National Grid ESO wind forecasts, 2025-12-25 to 2026-02-03).
- **Scope Lock**: National GB wind only. Zero external weather feeds, pricing, or grid maps.

### Exact Row Accounting & Deduplication
1. **`FUELHH` (1,940 raw rows $\rightarrow$ 1,921 unique 30-min settlement intervals)**:
   - 19 duplicate rows occurred strictly due to 2-day ingestion chunk boundaries overlapping at midnight (`00:00Z`).
   - Deduplication rule: latest `publishTime` wins. Generation values across duplicates were 100% identical.
   - Continuity: Zero missing intervals across the entire 40-day window.
2. **`WINDFOR` (23,360 raw rows $\rightarrow$ 18,015 forward forecast records)**:
   - **4,801 rows** have `startTime < publishTime` (negative lead times between -5.5h and -25.5h, median -12.5h). In the Elexon WINDFOR feed, each run includes startTimes beginning at 21:00 UTC of the prior day. These retrospective rows are discarded because they are historical relative to the run's publication time.
   - **544 rows** have `startTime` extending past February 2 into February 3–4 (beyond our fetched actuals window).
   - **18,015 rows** are strictly valid forward forecasts ($0.5\text{h} \le \text{leadTimeHours} \le 66.5\text{h}$) with matched actuals.  
   - Sum: $4,801 + 544 + 18,015 = 23,360$ rows exactly.

### Temporal Reconciliation & Time-Shift Sensitivity Analysis
- `FUELHH` publishes at **30-minute intervals** (`:00` and `:30`). `WINDFOR` publishes strictly at **60-minute intervals** (`:00`).
- Each hourly actual is computed as the strict mean: $(\text{SP}_{2h+1} + \text{SP}_{2h+2}) / 2$. If either half-hour is missing, the hour evaluates to `NaN` (tested in `tests/test_edge_cases.py`).
- **Extended Time-Shift Sensitivity Audit (-180 min to +180 min in 30m steps)**:
  - Shifting by -180m: MAE = 1,975.3 MW | Bias = +1,686.8 MW
  - Shifting by -120m: MAE = 1,927.7 MW | Bias = +1,701.6 MW (Minimum MAE point)
  - Shifting by -60m:  MAE = 1,942.4 MW | Bias = +1,716.0 MW
  - Unshifted (0m):    MAE = 2,013.0 MW | Bias = +1,729.9 MW
  - Shifting by +60m:  MAE = 2,101.4 MW | Bias = +1,743.1 MW
  - Shifting by +180m: MAE = 2,302.0 MW | Bias = +1,769.6 MW
- **Conclusion**: The Mean Bias remains persistently between +1,686 MW and +1,770 MW across the entire 6-hour shift spectrum.  
  *Finding*: The +1.7 GW offset is not a temporal alignment bug. Its exact root cause cannot be proven under the challenge's strict scope lock without external metering data; it likely reflects a definition mismatch (e.g. system-wide ESO forecast visibility vs transmission-only settlement metering in FUELHH). We report it transparently as an empirical constant offset.

---

## 4. Statistical Rigor & Leakage-Free Methodology

### 1. Naive Baselines & Forecast Skill Scores
- **Baseline 1 (t - 48h Persistence)**: Same-hour actual observed on Day $D-2$ ($y_{t-48\text{h}}$). MAE = 4,340.3 MW $\rightarrow$ **+53.6% Forecast Skill Score**.
- **Baseline 2 (7-Day Rolling Mean)**: Average of the same hour across past 7 observable days. MAE = 4,411.1 MW $\rightarrow$ **+54.4% Forecast Skill Score**.
- *Note on Baselines*: Both baselines exhibit high MAE (~4.3–4.4 GW) due to the high day-to-day volatility of UK winter wind regimes, making high skill scores standard for numerical weather prediction models over persistence.

### 2. Strictly Out-of-Sample Rolling Risk Buffer & Realized Coverage
- For delivery Day $D$, training data ends strictly at **$D-2$** using forecasts produced under the **identical cutoff rule**.
- **Nominal Target vs Realized Coverage**:
  - Target: **P90 Nominal**.
  - Overall Realized Coverage (all 31 delivery days, N=744 hours): **81.0%** (Shortfall-only: **77.5%**, N=649 shortfall hours).
  - Post-Warmup Coverage (Jan 9 – Feb 1, N=576 hours): **84.5%**.
- **Weekly Learning Curve** (as training history expands):
  - Week 1 Warm-up (Jan 2 – Jan 8, N=168h): **69.0%** Realized Coverage (Avg Buffer: 2,787 MW)
  - Week 2 (Jan 9 – Jan 15, N=168h): **77.4%** Realized Coverage (Avg Buffer: 3,923 MW)
  - Week 3 (Jan 16 – Jan 22, N=168h): **86.3%** Realized Coverage (Avg Buffer: 4,054 MW)
  - Week 4 (Jan 23 – Jan 29, N=168h): **85.1%** Realized Coverage (Avg Buffer: 3,467 MW)
  - Week 5 (Jan 30 – Feb 1, N=72h): **95.8%** Realized Coverage (Avg Buffer: 2,674 MW) — *note: 3-day sample with high autocorrelation*.
- **Diagnostic De-biasing Separation**: When rolling mean bias is subtracted, the buffer shrinks from **3,906 MW to 2,840 MW**, while base procurement increases by the same amount. Total hedged volume and realized coverage remain identical by construction (tested in `tests/test_procurement_and_coverage.py`). This is a diagnostic reframing that separates constant offset from residual volatility, not an energy cost saving.

### 3. Verified Case Studies
- **January 15, 2026 (Successful Hedge)**: Peak Actual Wind: 14,456.5 MW. Max Shortfall: 1,941.5 MW; Mean Shortfall: 1,110.3 MW. Buffer Held: 3,818.9 MW $\rightarrow$ **100.0% Coverage (0 / 24 breaches)**.
- **January 12, 2026 (Worst Single-Hour Shortfall Event)**: ESO forecasted ~18 GW; actual output was ~11 GW. Max Shortfall: **6,833.0 MW**; Mean Shortfall: 4,900.9 MW. Buffer Held: 4,062.3 MW $\rightarrow$ **17 / 24 hours breached** (Coverage: 29.2%).
- **January 28, 2026 (Worst Full-Day Shortfall / Complete Buffer Breach)**: ESO forecasted ~17 GW; actual output was ~10.5 GW across the full day. Max Shortfall: 6,271.0 MW; **Mean Shortfall: 5,374.8 MW**. Buffer Held: 3,286.7 MW $\rightarrow$ **24 / 24 hours breached (Coverage: 0.0%)**.

---

## 5. How to Start the Application

### Option A: Local Development

1. **Backend**:
   ```bash
   pip install -r backend/requirements.txt
   uvicorn backend.app.main:app --reload --port 8000
   ```
   API runs at `http://localhost:8000` (docs at `http://localhost:8000/docs`).

2. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Interactive UI runs at `http://localhost:5173`.

### Option B: Unified Production (FastAPI Serving Built Frontend)

```bash
cd frontend && npm install && npm run build && cd ..
uvicorn backend.app.main:app --port 8000
```
Visit `http://localhost:8000`.

### Option C: Docker (Single Command)

```bash
docker compose up --build
```
Access the application at `http://localhost:8000`.

---

## 6. Running Automated Tests

```bash
python -m pytest
```

24 passing unit tests:
- `tests/test_leakage.py`: Zero-leakage perturbation test (50,000 MW perturbation) and cutoff vintage isolation.
- `tests/test_lead_time_and_boundaries.py`: Forward lead-time bounds assertion, exact cutoff boundary test, post-cutoff perturbation invariance, and FUELHH deduplication.
- `tests/test_procurement_and_coverage.py`: Mathematical coverage ratio verification, procurement arithmetic, de-biasing volume preservation identity, and $D-2$ window termination test.
- `tests/test_edge_cases.py`: Calm zero-wind handling and missing interval NaN checks.
- `tests/test_metrics.py`: Mathematical verification of formulas against hand-calculated test vectors.
- `tests/test_hourly_aggregation.py`: Settlement period pair averaging.
- `tests/test_gateway_proxy.py`: API Gateway proxy route handling and resilience.
- `tests/test_api.py`: FastAPI endpoint smoke tests.

---

## 7. Cloud Deployment & Public Repository

- **GitHub Repository**: [https://github.com/Rachit2407/kjhwr](https://github.com/Rachit2407/kjhwr)
- **Live Deployed App**: [https://kjhwr-five.vercel.app](https://kjhwr-five.vercel.app) (Deployed on Vercel)
---

## 8. AI Tools Disclosure

As explicitly permitted and required by the challenge guidelines:
- **AI Tool Used**: **Google DeepMind Antigravity** (Gemini 3.8 Flash High agent).
- **Scope & Role**: Assisted with ETL scripting, Elexon BMRS endpoint inspection, statistical calculation design, unit test construction, and React UI scaffolding. All statistical formulas, time-shift sensitivity analyses, and out-of-sample leakage constraints were independently verified and audited against raw Elexon BMRS data.
