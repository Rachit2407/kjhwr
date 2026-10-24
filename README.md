# WindCast UK: Day-Ahead Wind Decision & Accuracy Platform

> **A customized decision support and quantitative forecast accuracy engine for UK Day-Ahead wholesale power procurement.**  
> Built for the **Full Stack SWE Challenge**.

[![Pytest Tests](https://img.shields.io/badge/pytest-25%20passed-emerald)](tests/)
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
│   ├── data/                    # Aligned JSON datasets for zero-latency serverless serving
│   ├── index.py                 # Vercel serverless ASGI entrypoint
│   ├── main.py                  # Self-contained FastAPI application with dual-route handling
│   ├── metrics.py               # Vectorized metrics engine, baselines & rolling risk buffer
│   └── requirements.txt         # Serverless runtime dependencies (FastAPI, NumPy)
├── backend/
│   ├── app/
│   │   ├── main.py              # Unified FastAPI application (REST API & static file serving)
│   │   └── metrics.py           # Vectorized metrics engine, baselines & rolling risk buffer
│   ├── data/                    # Aligned datasets for local backend execution
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
│   ├── test_gateway_proxy.py    # Serverless API routes and resilience tests
│   └── test_api.py              # FastAPI endpoint smoke tests
├── Dockerfile                   # Multi-stage production build (Node 22 + Python 3.12)
├── docker-compose.yml           # Single-command container runner
├── vercel.json                  # Vercel deployment routing configuration
├── LICENSE                      # MIT Open Source License
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
- Each hourly actual is computed as the strict mean: `(SP_{2h+1} + SP_{2h+2}) / 2`. If either half-hour is missing, the hour evaluates to `NaN` (tested in `tests/test_edge_cases.py`).
- **Complete Time-Shift Sensitivity Audit (-180 min to +180 min in 30m steps)**:

| Shift (min) | MAE (MW) | Mean Bias (MW) | RMSE (MW) |
| :---: | :---: | :---: | :---: |
| -180m | 1,975.3 | +1,686.8 | 2,571.8 |
| -150m | 1,945.8 | +1,694.2 | 2,532.3 |
| -120m | 1,927.7 | +1,701.6 | 2,504.8 |
| -90m  | 1,927.7 | +1,708.9 | 2,487.7 |
| -60m  | 1,942.4 | +1,716.0 | 2,482.7 |
| -30m  | 1,975.0 | +1,723.1 | 2,488.2 |
| **0m (Unshifted)** | **2,013.0** | **+1,729.9** | **2,505.9** |
| +30m  | 2,057.4 | +1,736.5 | 2,533.6 |
| +60m  | 2,101.4 | +1,743.1 | 2,573.2 |
| +90m  | 2,147.5 | +1,749.8 | 2,621.1 |
| +120m | 2,195.0 | +1,756.4 | 2,679.6 |
| +150m | 2,244.7 | +1,763.1 | 2,744.8 |
| +180m | 2,302.0 | +1,769.6 | 2,817.6 |

*Audit Notes*:
1. Minimum MAE occurs at -120m (1,927.66 MW) and -90m (1,927.73 MW), which both round to 1,927.7 MW to one decimal place.
2. Across the entire 6-hour shift spectrum, Mean Bias remains invariant between +1,686.8 MW and +1,769.6 MW. This proves that the +1.7 GW offset is not a temporal alignment bug. Under the challenge's scope lock, the exact root cause remains **unexplained** without external boundary metering; it likely reflects a definition mismatch (e.g. system-wide ESO forecast visibility including embedded generation vs transmission-only settlement metering in FUELHH). We report it transparently as an empirical constant offset.

### Multiplicative & Level-Dependent Error Analysis
The forecast bias is **proportional/level-dependent** rather than purely a constant offset:
- **Linear Fit**: $\text{actual} = 0.8014 \times \text{forecast} + 854.4\text{ MW}$ ($R^2 = 0.82$).
- **Overall Generation Ratio**: $\sum \text{actuals} / \sum \text{forecasts} = 0.8671$ (actuals deliver 86.7% of forecasted energy).
- **Mean Error by Forecast Magnitude**:
  - $<8\text{ GW}$ ($N=137\text{ hours}$): Mean Error = **+332.1 MW** (MAE: 1,241.8 MW)
  - $8–12\text{ GW}$ ($N=213\text{ hours}$): Mean Error = **+1,379.9 MW** (MAE: 1,670.2 MW)
  - $12–16\text{ GW}$ ($N=126\text{ hours}$): Mean Error = **+1,372.8 MW** (MAE: 1,557.4 MW)
  - $>16\text{ GW}$ ($N=268\text{ hours}$): Mean Error = **+2,890.6 MW** (MAE: 2,893.9 MW)

*Implication for Hedging*: During light wind periods, forecast bias is minimal (+332 MW); during high wind (>16 GW), over-forecasting expands to nearly +2.9 GW. This level-dependency strongly motivates partitioning buffers by wind generation regime (low vs high wind), rather than applying a static scalar shift across all hours.

---

## 4. Statistical Rigor & Leakage-Free Methodology

### 1. Naive Baselines & Forecast Skill Scores
- **Baseline 1 ($t - 48\text{h}$ Persistence)**: Same-hour actual observed on Day $D-2$ ($y_{t-48\text{h}}$). MAE = 4,340.3 MW $\rightarrow$ **+53.6% Forecast Skill Score**.
- **Baseline 2 (7-Day Rolling Mean)**: Average of the same hour across past 7 observable days. MAE = 4,411.1 MW $\rightarrow$ **+54.4% Forecast Skill Score**.
- Both baselines are strictly observable at Day $D-1$ decision cutoff. Both exhibit high MAE (~4.3–4.4 GW) due to the high day-to-day volatility of UK winter wind regimes.

### 2. Decision Cutoff Rules & Forecast Cadence

In the Elexon `WINDFOR` feed, National Grid ESO publishes updates on an **irregular cadence with several runs per day** (in our evaluated dataset: 07:30, 09:30, 11:30, 12:25, 15:30, and 22:30 UTC). The available forecast vintages depend on the decision cutoff:

| Cutoff Hour | Selected Run Vintages (UTC) | Average Lead Time Horizon | January MAE | January Bias |
| :---: | :---: | :---: | :---: | :---: |
| **09:00 UTC** | `07:30` (100% of days) | 16.5h to 39.5h | 2,038.9 MW | +1,747.9 MW |
| **11:00 UTC** | `09:30` (100% of days) | 14.5h to 37.5h | 2,013.0 MW | +1,729.9 MW |
| **12:00 UTC** | `09:30` or `11:30` | 12.5h to 37.5h | 1,901.0 MW | +1,687.2 MW |
| **14:00 UTC** | `11:30` or `12:25` | 11.6h to 35.5h | 1,904.0 MW | +1,692.5 MW |
| **17:00 UTC** | `15:30` (100% of days) | 8.5h to 31.5h | 1,873.5 MW | +1,709.2 MW |
| **23:00 UTC** | `22:30` (100% of days) | 1.5h to 24.5h | 1,825.0 MW | +1,602.9 MW |

*Cadence Findings*:
1. At the **11:00 UTC cutoff**, all January decision days select the **09:30 UTC** publication (the latest run available before 11:00).
2. The 12:00 and 14:00 cutoffs yield very similar MAE (~1,901–1,904 MW) because the 11:30 UTC run is typically the operative vintage for both.

### 3. Strictly Out-of-Sample Rolling Risk Buffer & Realized Coverage
- For delivery Day $D$, training data ends strictly at **$D-2$** using forecasts produced under the **identical cutoff rule**.
- **Population Accounting (N=744 Delivery Hours, Jan 2 to Feb 1)**:
  - **Non-Shortfall Hours** ($\text{actual} \ge \text{forecast}$, shortfall = 0 MW): **117 hours** (15.7%). Covered by definition.
  - **Shortfall Hours** ($\text{forecast} > \text{actual}$, shortfall > 0 MW): **627 hours** (84.3%).
  - **Covered Shortfall Hours**: **486 hours** ($486 / 627 = \mathbf{77.5\%}$ shortfall-only coverage).
  - **Total Covered Hours**: $486 + 117 = \mathbf{603\text{ hours}}$ ($603 / 744 = \mathbf{81.0\%}$ overall realized coverage).
  - **Post-Warmup Coverage** (Jan 9 – Feb 1, N=576 hours): **84.5%**.
- **Weekly Learning Curve** (as training history expands):
  - Week 1 Warm-up (Jan 2 – Jan 8, N=168h): **69.0%** Realized Coverage (Avg Buffer: 2,875.4 MW)
  - Week 2 (Jan 9 – Jan 15, N=168h): **77.4%** Realized Coverage (Avg Buffer: 3,519.7 MW)
  - Week 3 (Jan 16 – Jan 22, N=168h): **86.3%** Realized Coverage (Avg Buffer: 3,200.6 MW)
  - Week 4 (Jan 23 – Jan 29, N=168h): **85.1%** Realized Coverage (Avg Buffer: 4,229.2 MW)
  - Week 5 (Jan 30 – Feb 1, N=72h): **95.8%** Realized Coverage (Avg Buffer: 3,583.0 MW)
- **Average Buffer Volumes**:
  - Full January Window (N=744h): Nominal Average Buffer = **3,468.5 MW**; De-biased Average Buffer = **2,416.4 MW**.
  - Post-Warmup Window (N=576h): Nominal Average Buffer = **3,641.5 MW**; De-biased Average Buffer = **2,446.2 MW**.
- **Diagnostic De-biasing & Clipping Non-Linearity**:
  - When demand exceeds forecast ($D \ge \hat{y}$, normal operational regime), subtracting rolling bias shifts base procurement and buffer by equal and opposite amounts: $(D - (\hat{y} - b)) + (R - b) = (D - \hat{y}) + R$. Total hedged procurement volume is strictly preserved.
  - *Clipping Caveat*: If demand is less than forecast ($D < \hat{y}$), thermal procurement is clipped to 0 MW by $\max(0, D - \hat{y})$, breaking the linear additive identity (verified in `tests/test_procurement_and_coverage.py`).

### 4. Verified Case Studies
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
python -m pytest -v
```

25 passing unit tests:
- `tests/test_leakage.py`: Zero-leakage perturbation test (50,000 MW perturbation) and cutoff vintage isolation.
- `tests/test_lead_time_and_boundaries.py`: Forward lead-time bounds assertion, exact cutoff boundary test, post-cutoff perturbation invariance, and FUELHH deduplication.
- `tests/test_procurement_and_coverage.py`: Mathematical coverage ratio verification, procurement arithmetic, de-biasing volume preservation identity, clipping non-linearity test, and $D-2$ window termination test.
- `tests/test_edge_cases.py`: Calm zero-wind handling and missing interval NaN checks.
- `tests/test_metrics.py`: Mathematical verification of formulas against hand-calculated test vectors.
- `tests/test_hourly_aggregation.py`: Settlement period pair averaging.
- `tests/test_gateway_proxy.py`: Serverless API route handling and dual-path resolution.
- `tests/test_api.py`: FastAPI endpoint smoke tests.

---

## 7. Cloud Deployment & Public Repository

- **GitHub Repository**: [https://github.com/Rachit2407/kjhwr](https://github.com/Rachit2407/kjhwr) (Anonymous repository name `kjhwr` hosted under user account `Rachit2407`).
- **Live Deployed App**: [https://kjhwr-five.vercel.app](https://kjhwr-five.vercel.app) (Deployed on Vercel with serverless in-memory execution).

---

## 8. AI Tools Disclosure

As explicitly permitted and required by the challenge guidelines:
- **AI Tool Used**: **Google DeepMind Antigravity**.
- **Scope & Role**: Assisted with initial script scaffolding, Elexon BMRS endpoint inspection, unit test construction, and React UI layout.
- **Verification Methodology**: All statistical formulas, time-shift sensitivity tables, lead-time bounds, and out-of-sample data partitioning were independently inspected, tested, and audited in Python against raw Elexon BMRS JSON records.
