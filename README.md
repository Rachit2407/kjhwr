# WindCast UK: Day-Ahead Wind Decision & Accuracy Platform

> **A customized decision support and quantitative forecast accuracy engine for UK Day-Ahead wholesale power procurement.**  
> Built for the **REint Full Stack SWE Challenge**.

[![Pytest Tests](https://img.shields.io/badge/pytest-19%20passed-emerald)](tests/)
[![Docker](https://img.shields.io/badge/docker-ready-blue)](Dockerfile)
[![License](https://img.shields.io/badge/license-MIT-slate)](LICENSE)

---

## 1. Problem & Operational Context

A UK energy utility trading on the Day-Ahead Market (DAM) must submit wholesale electricity purchase orders on day **$D-1$** for delivery across all 48 half-hour settlement periods of day **$D$**. 

To meet consumer demand without over-procuring expensive thermal generation or being caught short in the Balancing Mechanism, the trading desk relies on wind generation forecasts. However, wind generation is intermittent and forecasts carry systematic bias and volatility.

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
│   ├── requirements.txt         # Backend dependencies
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
   - **4,801 rows** are nowcast/backcast points with `leadTimeHours < 0` (NESO includes the preceding ~10.5 hours in each publication run for telemetry continuity).
   - **544 rows** are forward forecasts extending past February 2 into February 3–4 (beyond our verified actuals window).
   - **18,015 rows** are strictly valid forward forecasts ($0.5\text{h} \le \text{leadTimeHours} \le 66.5\text{h}$) with verified matched actuals. Sum: $4,801 + 544 + 18,015 = 23,360$ rows exactly.

### Temporal Reconciliation & Time-Shift Sensitivity Analysis
- `FUELHH` publishes at **30-minute intervals** (`:00` and `:30`). `WINDFOR` publishes strictly at **60-minute intervals** (`:00`).
- Each hourly actual is computed as the strict mean: $(\text{SP}_{2h+1} + \text{SP}_{2h+2}) / 2$. If either half-hour is missing, the hour evaluates to `NaN` (tested in `tests/test_edge_cases.py`).
- **Time-Shift Sensitivity Audit**: To verify whether the ~1,730 MW Mean Bias was an hour-start vs hour-end convention artifact, we tested shifting actuals by -60m, -30m, +30m, and +60m:
  - Shifting by -60m: Bias = +1,716.0 MW | MAE = 1,942.4 MW
  - Shifting by -30m: Bias = +1,723.1 MW | MAE = 1,975.0 MW
  - Unshifted (0m):  Bias = +1,729.9 MW | MAE = 2,013.0 MW
  - Shifting by +30m: Bias = +1,736.5 MW | MAE = 2,057.4 MW
  - Shifting by +60m: Bias = +1,743.1 MW | MAE = 2,101.4 MW
- **Conclusion**: The offset is invariant to temporal shifts. The root cause is structural: `FUELHH` measures strictly Transmission-System Metered generation (Balancing Mechanism units), while `WINDFOR` is NESO's system-wide forecast (which captures embedded operational capacity) combined with January 2026 British Isles weather model optimism.

---

## 4. Statistical Rigor & Leakage-Free Methodology

### 1. Naive Baselines & Forecast Skill Scores
- **Baseline 1 (t - 48h Persistence)**: Same-hour actual observed on Day $D-2$ ($y_{t-48\text{h}}$). MAE = 4,340.3 MW $\rightarrow$ **+53.6% Forecast Skill Score**.
- **Baseline 2 (7-Day Rolling Mean)**: Average of the same hour across past 7 observable days. MAE = 4,411.1 MW $\rightarrow$ **+54.4% Forecast Skill Score**.

### 2. Strictly Out-of-Sample Rolling Risk Buffer & Realized Coverage
- For delivery Day $D$, training data ends strictly at **$D-2$** using forecasts produced under the **identical cutoff rule**.
- **Nominal Target vs Realized Coverage**:
  - Target: **P90 Nominal**.
  - Overall Realized Coverage (all 31 delivery days): **81.0%** (Shortfall-only: **77.5%**).
  - Post-Warmup Coverage (Jan 9 – Feb 1, N=24 days): **84.5%**.
- **Weekly Learning Curve** (as training history expands):
  - Week 1 Warm-up (Jan 2 – Jan 8): **69.0%** Realized Coverage (Avg Buffer: 2,787 MW)
  - Week 2 (Jan 9 – Jan 15): **77.4%** Realized Coverage (Avg Buffer: 3,923 MW)
  - Week 3 (Jan 16 – Jan 22): **86.3%** Realized Coverage (Avg Buffer: 4,054 MW)
  - Week 4 (Jan 23 – Jan 29): **85.1%** Realized Coverage (Avg Buffer: 3,467 MW)
  - Week 5 (Jan 30 – Feb 1): **95.8%** Realized Coverage (Avg Buffer: 2,674 MW)
- **Rolling Bias Correction**: When rolling mean bias is subtracted, the required buffer drops from **3,906 MW to 2,840 MW** (saving >1,000 MW of reserve holding cost) while maintaining 85.1% coverage.

### 3. Verified Case Studies
- **January 15, 2026 (Perfect Hedge)**: DayCoverage = **100.0%** (0 / 24 breaches). Max shortfall was 1,941.5 MW; buffer held was 3,818.9 MW.
- **January 12, 2026 (Storm Shortfall Event)**: National Grid forecasted ~18 GW; storm collapsed to ~11 GW. Max shortfall was 6,833.0 MW, resulting in 17 / 24 breaches.
- **January 28, 2026 (Tail Weather Anomaly)**: Severe widespread calm anomaly where wind under-delivered by 6,271.0 MW against forecasts across all 24 hours.

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

19 passing tests:
- `tests/test_leakage.py`: Zero-leakage perturbation test (50,000 MW perturbation) and cutoff vintage isolation.
- `tests/test_lead_time_and_boundaries.py`: Forward lead-time bounds assertion, exact cutoff boundary test, post-cutoff perturbation invariance, and FUELHH deduplication.
- `tests/test_edge_cases.py`: Calm zero-wind handling and missing interval NaN checks.
- `tests/test_metrics.py`: Mathematical verification of formulas against hand-calculated test vectors.
- `tests/test_hourly_aggregation.py`: Settlement period pair averaging.
- `tests/test_api.py`: FastAPI endpoint smoke tests.

---

## 7. Cloud Deployment Link

- **Live Deployed App**: `[DEPLOYED_APP_URL_HERE]` (Configured for Vercel & Heroku)

---

## 8. AI Tools Disclosure

As explicitly permitted and required by the challenge guidelines:
- **AI Tool Used**: **Google DeepMind Antigravity** (Gemini 3.8 Flash High agent).
- **Scope & Role**: Assisted with ETL scripting, Elexon BMRS endpoint inspection, statistical calculation design, unit test construction, and React UI scaffolding. All statistical formulas, time-shift sensitivity analyses, and out-of-sample leakage constraints were independently verified and audited against raw Elexon BMRS data.
