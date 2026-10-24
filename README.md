# WindCast UK: Day-Ahead Wind Decision & Accuracy Platform

> **A customized decision support and quantitative forecast accuracy engine for UK Day-Ahead wholesale power procurement.**  
> Built for the **REint Full Stack SWE Challenge**.

[![Pytest Tests](https://img.shields.io/badge/pytest-13%20passed-emerald)](tests/)
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
│   ├── lead_time_records.json   # 18,015 forecast observations across all lead-time horizons
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
│   ├── test_hourly_aggregation.py # Half-hour pair aggregation logic tests
│   └── test_api.py              # API endpoint smoke tests
├── Dockerfile                   # Multi-stage production build (Node 22 + Python 3.12)
├── docker-compose.yml           # Single-command container runner
├── vercel.json                  # Vercel deployment routing configuration
└── README.md                    # System documentation & AI tools disclosure
```

---

## 3. Data Reconciliation & Documented Assumptions

### Data Source & Scope Lock
- **Actual Generation**: Elexon BMRS `FUELHH/stream` filtered strictly to `fuelType == 'WIND'`.
- **Forecast Generation**: Elexon BMRS `WINDFOR/stream` (National Grid ESO wind forecast runs).
- **Scope Lock**: National wind only. Zero external data (no external pricing, no weather feeds, no grid maps).

### Reconciliation of Differing Temporal Resolutions
- **Measured Reality**: `FUELHH` actuals publish at **30-minute intervals** (`:00` and `:30`). `WINDFOR` forecasts publish strictly at **60-minute intervals** (`:00`).
- **Resolution Strategy**: Each hourly actual is computed as the strict mean of its two constituent 30-minute settlement periods ($(\text{SP}_{2h+1} + \text{SP}_{2h+2}) / 2$). If either half-hour is missing, the hour is treated as incomplete (`NaN`). Granular 48-period actuals are retained for high-resolution visual display.

### Decision Window & Cutoff Assumption
- **Primary Window**: **Decisions made in January 2026** (Day $D-1 \in \text{2026-01-01 to 2026-01-31}$), corresponding to **Delivery Days: Jan 2 – Feb 1, 2026** (744 trading hours). Data is ingested starting Dec 25, 2025 to provide a complete calibration warm-up for early January decisions.
- **Decision Cutoff**: Assumed baseline is **11:00 UTC on Day $D-1$** (standard GB Day-Ahead wholesale power auction gate closure). Configurable via dropdown (09:00, 11:00, 12:00, 14:00, 17:00, 23:00 UTC). The application explicitly displays the exact publication timestamp of the forecast vintage selected.

---

## 4. Statistical Rigor & Leakage-Free Methodology

### 1. Naive Baselines & Forecast Skill Scores
An MAE in isolation does not prove forecast value. We benchmark against two observable heuristics available at Day $D-1$ cutoff:
- **Baseline 1 (t - 48h Persistence)**: Same-hour actual observed on Day $D-2$ ($y_{t-48\text{h}}$).
- **Baseline 2 (7-Day Historical Mean)**: Average of the same hour across the past 7 observable days ($\frac{1}{7} \sum_{k=2}^8 y_{t-24k\text{h}}$).
- **Skill Score**: $\text{Skill} = 1 - \frac{\text{MAE}_{\text{WINDFOR}}}{\text{MAE}_{\text{Baseline}}}$

### 2. Strictly Out-of-Sample Rolling Risk Buffer
To prevent **in-sample backtest leakage**:
- For any delivery day $D$, the buffer is calibrated strictly on completed days **up to and including $D-2$** using forecasts produced under the **identical cutoff rule**.
- **Regime Segmentation**: Historical errors are split by median forecast into two regimes (**Low Wind** $\le$ Median, **High Wind** $>$ Median) to account for error heteroscedasticity. During early January (warm-up), regimes are pooled until a minimum sample of 48 hours is reached.
- **Formulation**:
  $$\text{Buffer}_t = \max(0, \text{Quantile}_{0.90}(e_{\text{regime}})) \quad \text{where } e = \hat{y} - y$$
- **Leakage Verification**: Verified by automated test (`tests/test_leakage.py`): perturbing actuals on Day $D-1$ or Day $D$ leaves the Day $D$ buffer completely unchanged.

---

## 5. How to Start the Application

### Option A: Local Development

1. **Backend**:
   ```bash
   # In project root
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
# Build React bundle
cd frontend && npm install && npm run build && cd ..

# Start unified service
uvicorn backend.app.main:app --port 8000
```
Visit `http://localhost:8000` to access the full application.

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

Test suite coverage:
- `tests/test_metrics.py`: Mathematical verification of MAE, RMSE, Mean Bias, WAPE, and Skill Score against hand-calculated test vectors.
- `tests/test_leakage.py`: Zero-leakage perturbation tests and cutoff vintage isolation.
- `tests/test_hourly_aggregation.py`: Settlement period pair aggregation and missing interval handling.
- `tests/test_api.py`: FastAPI endpoint smoke tests and boundary parameter validation.

---

## 7. Cloud Deployment Link

- **Live Deployed App**: `[DEPLOYED_APP_URL_HERE]` (Deployed on Vercel / Heroku)

---

## 8. AI Tools Disclosure

As explicitly permitted and required by the challenge guidelines:
- **AI Tool Used**: **Google DeepMind Antigravity** (Gemini 3.8 Flash High agent).
- **Purpose**: Assisted with automated ETL scripting, Elexon BMRS API inspection, vectorized NumPy statistical calculation design, unit test construction, and React component scaffolding. All domain formulations, zero-leakage constraints, and data reconciliation logic were verified against primary Elexon datasets.
