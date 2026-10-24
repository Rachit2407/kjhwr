# 10-Minute Video Demo Guide & Speaking Outline

> **Evaluation Criterion Note**: Evaluations begin with this video. Total duration must be $\le$ 10 minutes (Part 1 $\le$ 5 min, Part 2 $\le$ 5 min). Upload as an **Unlisted YouTube Video**.  
> **Presentation Tip**: Do not read this outline like a robot. Speak naturally in your own words, showing genuine domain grasp.

---

## Pre-Recording Checklist (Anonymity & Environment)
- [ ] Open an incognito browser window with bookmarks hidden.
- [ ] **Terminal Safety**: Never show your local personal directory or username (`C:\Users\...`) on video. Either stay in full-screen browser mode, or configure a clean prompt:
  ```powershell
  function prompt { "PS C:\workspace> " }
  ```
- [ ] Close personal Slack, Discord, email, or chat notifications.
- [ ] Open the application at `https://kjhwr-five.vercel.app` (or `http://localhost:8000`) in full screen.

---

## PART 1: Client Pitch (Target: ~4.5 Minutes)
**Audience**: UK Energy Utility Day-Ahead Wholesale Trading Desk  
**Goal**: Impress the client with commercial clarity, transparency at decision cutoff, and disciplined risk management.

---

### Segment 1: The Commercial Challenge (0:00 - 1:00)
* **Screen**: Day-Ahead Decision Desk, showing delivery date `2026-01-15`.
* **Talking Points**:
  * Every morning before gate closure on Day D-1, your trading desk faces the same multi-million-pound question: **How much thermal power do we need to procure on the Day-Ahead Market to serve consumer demand after accounting for wind?**
  * If you overestimate wind, you under-procure day-ahead and get forced into the Balancing Mechanism at penal cashout prices to cover the deficit. If you underestimate wind, you over-procure expensive thermal power and dump excess energy at a loss.
  * As part of our pilot project, we built **WindCast UK**—a purpose-built platform that gives your desk two things:
    1. Instantaneous clarity on the **exact latest forecast vintage** available at your decision cutoff.
    2. A **quantified, out-of-sample risk buffer** that protects your net position against wind shortfalls without guesswork.

---

### Segment 2: Live Day-Ahead Decision Desk Walkthrough (1:00 - 2:30)
* **Screen**: Interacting with the Delivery Date picker and Cutoff dropdown on the Day-Ahead Decision Desk.
* **Talking Points**:
  * Look at the Day-Ahead Decision Desk for **January 15, 2026**.
  * Notice the badge at the top right: at your assumed **11:00 UTC auction cutoff**, the system automatically identifies and locks the most recent forecast vintage published by National Grid ESO—which is the run published at **09:30 UTC** (National Grid ESO publishes on an irregular schedule several times a day, so 09:30 UTC is the latest operative publication before 11:00).
  * On the timeline, the green line is actual wind generation, the cyan dashed line is your day-ahead forecast, and the purple line is the 48-hour persistence baseline.
  * Point out the day's numbers: Peak actual wind was 14.4 GW; the forecast was slightly higher, creating a peak shortfall of **1,941 MW** during the afternoon peak.
  * Contrast this with **January 12, 2026**: a severe winter storm where National Grid forecasted ~18 GW of wind, but output collapsed to ~11 GW—a massive **6,833 MW peak shortfall**.
  * Point out **January 28, 2026**: a persistent shortfall where wind under-delivered by an average of **5,374 MW across the entire day**.
  * Show how the Procurement Simulator handles both normal operations and tail anomalies.

---

### Segment 3: The Procurement & Risk Simulator in Action (2:30 - 4:00)
* **Screen**: Switching to the **Procurement & Risk Simulator** tab. Setting demand to 30,000 MW and confidence to P90.
* **Talking Points**:
  * In the Procurement Simulator, your team enters your consumer demand baseline—let's use 30,000 MW—and selects your desired risk tolerance, such as **P90 shortfall confidence**.
  * Our engine calculates a **dynamic, rolling risk buffer**. On January 15, the engine recommended carrying an average of **3,818.9 MW** of thermal procurement buffer.
  * **Explain the Regime Step (Sawtooth)**: Point out that in hours 0–12, the buffer is **5,465 MW** (High Wind regime, where forecast > historical median), and at hour 13 when wind drops below the median, it steps down to **1,874 MW** (Low Wind regime). Explain this directly as a discrete regime-switching threshold effect reflecting the higher volatility of deep generation periods, not a calculation glitch.
  * **Be Commercially Honest on the Over-Procurement Tradeoff**: Look at the net imbalance chart: January 15 achieved **100% coverage (0 breaches across all 24 hours)**. But show the flip side to the trader: in hours 0–12, the utility was net long by **+3.5 to +5.1 GW** (netImbalanceMW) against a peak shortfall of only ~1.9 GW. A 100% coverage hedge completely eliminates shortfall risk, but carries commercial thermal commitment costs. This is why our quantile selector lets the desk tune risk tolerance (e.g. testing P80 vs P90).
  * **Acknowledge Tail Risk & Calibration**: State the numbers plainly: nominal P90 achieves **81.0% realized coverage overall** (84.5% post-warmup), but tail storm events like Jan 12 (17 breaches) and Jan 28 (24 breaches) exceed statistical bounds and require operational stress-testing.
  * Show the **Separate Bias from Buffer** toggle: explain that it is an illustrative diagnostic separating the constant offset from residual volatility, clarifying what portion of procurement is baseline deficit versus volatility insurance.

---

### Segment 4: Client Transition to Tech Lead (4:00 - 4:30)
* **Talking Points**:
  * Summarize pilot outcomes: transparent forecast vintages at 11:00 AM, disciplined risk hedging, and honest visibility into model performance.
  * Transition: Hand over to the internal technical lead for architecture, data pipeline, and code review.

---

## PART 2: Technical Lead Review (Target: ~4.5 Minutes)
**Audience**: Internal Technical Lead / Engineering Reviewer  
**Goal**: Demonstrate software discipline, domain understanding, zero-leakage backtesting, test coverage, and clean deployment.

---

### Segment 1: Domain Modeling & Data Reconciliation (4:30 - 5:45)
* **Screen**: Code editor showing `data/etl_pipeline.py` and `data/build_aligned_dataset.py`.
* **Talking Points**:
  * Ingested national wind data exclusively from Elexon BMRS: actual generation from `FUELHH` and forecasts from `WINDFOR` from Dec 25, 2025 to Feb 3, 2026.
  * **Primary Data Reconciliation Finding**: `FUELHH` publishes at **30-minute resolution**, while `WINDFOR` publishes strictly at **60-minute resolution**. We aggregate settlement periods strictly as `(SP_{2h+1} + SP_{2h+2}) / 2`, and return `NaN` if either half-hour is missing.
  * **Row Accounting**: In raw WINDFOR (23,360 rows across 320 runs), each run starts at 21:00 UTC of the prior day, creating retrospective rows ($startTime < publishTime$, 4,801 rows total). 544 rows extend past February 2 beyond our actuals window. Exactly **18,015 forward forecast records** remain, spanning 0.5h to 66.5h horizons.
  * **Time-Shift Sensitivity Audit**: We tested shifting actuals from -180 min to +180 min in 30m steps. Minimum MAE was at -120m (1,927.7 MW vs 2,013.0 MW unshifted, a 4.2% delta), but the ~1.7 GW Mean Bias remained invariant (+1,686 to +1,770 MW). Under the strict scope lock without external boundary meters, the root cause remains **unexplained**; it likely reflects a definition mismatch between system-wide ESO forecast visibility and transmission-only settlement metering.
  * **Level-Dependent Error**: Crucially, bias is not purely a constant offset—it scales with forecast magnitude. At low generation (<8 GW), bias is only +332 MW; at high generation (>16 GW), over-forecasting expands to +2,891 MW. This regression ($\text{actual} = 0.801 \times \text{forecast} + 854\text{ MW}$) explains why our low/high regime buffer partition is so effective.

---

### Segment 2: Statistical Rigor & Zero-Leakage Rolling Buffer (5:45 - 7:15)
* **Screen**: Code editor showing `backend/app/metrics.py` and `compute_rolling_risk_buffer`.
* **Talking Points**:
  * **Baselines**: Benchmarked against Baseline 1 ($y_{t-48\text{h}}$) and Baseline 2 (7-day mean of same hour). Both are 100% observable at Day D-1 cutoff. WINDFOR achieves an MAE of 2,013 MW vs ~4,340 MW for persistence—a **+53.6% forecast skill score**.
  * **Cutoff Cadence**: At 11:00 UTC cutoff, all January days lock the 09:30 UTC publication. Cutoffs 12:00 and 14:00 yield similar MAE (~1,901–1,904 MW) because both typically observe the 11:30 UTC run.
  * **Zero Lookahead Leakage**: For delivery Day D, the training set ends strictly at **D-2** (last completed delivery day before decision day D-1). Historical errors are computed exclusively using forecasts generated under the **identical cutoff rule**.
  * **Honest Calibration & Population Accounting**:
    * Across all 744 January delivery hours, 117 hours are non-shortfall ($\text{actual} \ge \text{forecast}$, covered by definition).
    * Out of 627 shortfall hours, 486 are covered by the buffer $\rightarrow$ **77.5% shortfall-only coverage**. Total covered hours: $486 + 117 = 603$ $\rightarrow$ **81.0% overall realized coverage** (84.5% post-warmup).
    * Walk through weekly learning curve: Week 1 achieved **69.0%**, Week 2 **77.4%**, Week 3 **86.3%**, Week 4 **85.1%**, and Week 5 was **95.8%**.
    * Overall nominal average buffer is **3,468.5 MW** (post-warmup: **3,641.5 MW**).
  * **De-biasing Reframing**: By subtracting the D-2 rolling mean bias, average buffer shrinks from 3,468 MW to 2,416 MW while base procurement increases by the same amount, proving mathematically that total volume and coverage are preserved when unclipped ($D \ge \hat{y}$).

---

### Segment 3: Automated Test Suite (7:15 - 8:30)
* **Screen**: Clean terminal prompt running `python -m pytest -v` showing all 34 tests passing.
* **Talking Points**:
  * 34 unit and feature tests backing the platform:
    1. `test_rolling_buffer_zero_leakage_from_future`: Perturbs actuals on D-1 and D by 50,000 MW; verifies the computed buffer for Day D remains 100% bitwise identical.
    2. `test_cutoff_boundary_inclusion_and_exclusion`: Asserts forecasts at exact cutoff are eligible, while cutoff + 1 min is strictly excluded.
    3. `test_lead_time_validity_and_bounds`: Asserts all 18,015 lead-time observations are strictly positive ($0.5\text{h} \le \text{lead} \le 66.5\text{h}$) with valid error definitions.
    4. `test_procurement_arithmetic_and_imbalance`, `test_bias_correction_hedged_identity`, and `test_bias_correction_clipping_when_demand_below_forecast`: Verifies procurement math, volume conservation, and clipping behavior.
    5. Edge cases: zero-wind calm hours, missing settlement period pair NaN handling, and deduplication.

---

### Segment 4: Production Deployment & Docker Packaging (8:30 - 9:45)
* **Screen**: Code editor showing `Dockerfile` and `vercel.json`, and browser showing the live app on Vercel.
* **Talking Points**:
  * Dockerized via multi-stage `Dockerfile`: Node 22 builds React, Python 3.12 runs FastAPI serving both `/api` endpoints and static SPA.
  * Serverless deployment on Vercel: in-memory vectorized NumPy execution with self-contained dataset ($<4\text{ MB}$ total).
  * Only `fastapi` and `numpy` in runtime—zero heavy pandas/pyarrow dependencies in serverless.
  * Public repository with anonymous repo name `kjhwr` and complete AI disclosure.
