# 10-Minute Video Demo Guide & Speaking Outline

> **Evaluation Criterion Note**: REint evaluations begin with this video. Total duration must be $\le$ 10 minutes (Part 1 $\le$ 5 min, Part 2 $\le$ 5 min). Upload as an **Unlisted YouTube Video**.  
> **Presentation Tip**: Do not read this outline like a robot. Speak naturally in your own words, showing genuine domain grasp.

---

## Pre-Recording Checklist (Anonymity & Environment)
- [ ] Open an incognito browser window with bookmarks hidden.
- [ ] Ensure terminal prompt does not show your personal name (e.g., use a clean prompt: `PS C:\workspace>`).
- [ ] Close personal Slack, Discord, email, or chat notifications.
- [ ] Open the application at `http://localhost:8000` (or deployed URL) in full screen.

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
  * Notice the badge at the top right: at your assumed **11:00 UTC auction cutoff**, the system automatically identifies and locks the most recent forecast vintage published by National Grid ESO—in this case, the run published at **10:30 UTC**.
  * On the timeline, the green line is actual wind generation, the cyan dashed line is your day-ahead forecast, and the purple line is the 48-hour persistence baseline.
  * Point out the day's numbers: Peak actual wind was 14.4 GW; the forecast was slightly higher, creating a peak shortfall of **1,941 MW** during afternoon peak.
  * Contrast this with **January 12, 2026**: a severe winter storm where National Grid forecasted ~18 GW of wind, but output collapsed to ~11 GW—a massive **6,833 MW peak shortfall**.
  * Point out **January 28, 2026**: a persistent shortfall where wind under-delivered by an average of **5,374 MW across the entire day**.
  * Show how the Procurement Simulator handles both normal operations and tail anomalies.

---

### Segment 3: The Procurement & Risk Simulator in Action (2:30 - 4:00)
* **Screen**: Switching to the **Procurement & Risk Simulator** tab. Setting demand to 30,000 MW and confidence to P90.
* **Talking Points**:
  * In the Procurement Simulator, your team enters your consumer demand baseline—let's use 30,000 MW—and selects your desired risk tolerance, such as **P90 shortfall confidence**.
  * Our engine calculates a **dynamic, rolling risk buffer**. On January 15, the engine recommended carrying an additional **~3,819 MW** of thermal procurement buffer.
  * Look at the lower chart: the blue bars represent your net imbalance position. Because the desk procured the base thermal requirement **plus the P90 risk buffer**, January 15 achieved **100% coverage (0 breaches across all 24 hours)**.
  * Be honest about tail risk: on January 12 (17 breaches) and January 28 (24 breaches), extreme weather deviations exceeded historical P90 levels. A statistical buffer manages normal-to-severe volatility, but tail storm anomalies require operational stress-testing.
  * Show the **Separate Bias from Buffer** toggle: explain that it diagnostics separate the constant ~1.7 GW offset from residual volatility, clarifying what portion of procurement is baseline deficit versus volatility insurance.

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
  * **Primary Data Reconciliation Finding**: `FUELHH` publishes at **30-minute resolution**, while `WINDFOR` publishes strictly at **60-minute resolution**. We aggregate settlement periods strictly as $(\text{SP}_{2h+1} + \text{SP}_{2h+2}) / 2$, and return `NaN` if either half-hour is missing.
  * **Row Accounting**: In raw WINDFOR (23,360 rows across 320 runs), each run starts at 21:00 UTC of the prior day, creating between 6 and 26 retrospective rows per run ($startTime < publishTime$, 4,801 rows total). 544 rows extend past February 2 beyond our actuals window. Exactly **18,015 forward forecast records** remain, spanning 0.5h to 66.5h horizons.
  * **Time-Shift Sensitivity Audit**: We tested shifting actuals from -180 min to +180 min in 30m steps. Minimum MAE was at -120m (1,927.7 MW vs 2,013.0 MW unshifted, a 4.2% delta), but the ~1.7 GW Mean Bias remained invariant (+1,686 to +1,770 MW). Under the strict scope lock, we don't guess: it is an empirical offset, likely reflecting a definition mismatch between system-wide ESO forecast visibility and transmission-only settlement metering.

---

### Segment 2: Statistical Rigor & Zero-Leakage Rolling Buffer (5:45 - 7:15)
* **Screen**: Code editor showing `backend/app/metrics.py` and `compute_rolling_risk_buffer`.
* **Talking Points**:
  * **Baselines**: Benchmarked against Baseline 1 ($y_{t-48\text{h}}$) and Baseline 2 (7-day mean of same hour). Both are 100% observable at Day D-1 cutoff. WINDFOR achieves an MAE of 2,013 MW vs ~4,340 MW for persistence—a **+53.6% forecast skill score**.
  * **Zero Lookahead Leakage**: For delivery Day D, the training set ends strictly at **D-2** (last completed delivery day before decision day D-1). Historical errors are computed exclusively using forecasts generated under the **identical cutoff rule**.
  * **Honest Calibration & Weekly Evolution**:
    * Overall realized coverage across all 31 days (N=744h) is **81.0%** against the nominal 90% target (a 9-point gap due to early warm-up and storm days).
    * Walk through the learning curve: Week 1 achieved **69.0%**, Week 2 **77.4%**, Week 3 **86.3%**, Week 4 **85.1%**, and Week 5 was **95.8%** (noting Week 5 is a 3-day sample with high autocorrelation). Post-warmup coverage was **84.5%**.
  * **De-biasing Reframing**: By subtracting the D-2 rolling mean bias, the buffer shrinks from 3,906 MW to 2,840 MW while base procurement increases by the same amount, proving mathematically that total volume and coverage are preserved.

---

### Segment 3: Automated Test Suite (7:15 - 8:30)
* **Screen**: Terminal running `python -m pytest` showing all 23 tests passing. Open `tests/test_leakage.py` and `tests/test_procurement_and_coverage.py`.
* **Talking Points**:
  * 23 unit tests backing the platform:
    1. `test_rolling_buffer_zero_leakage_from_future`: Perturbs actuals on D-1 and D by 50,000 MW; verifies the computed buffer for Day D remains 100% bitwise identical.
    2. `test_cutoff_boundary_inclusion_and_exclusion`: Asserts forecasts at exact cutoff are eligible, while cutoff + 1 min is strictly excluded.
    3. `test_lead_time_validity_and_bounds`: Asserts all 18,015 lead-time observations are strictly positive ($0.5\text{h} \le \text{lead} \le 66.5\text{h}$) with valid error definitions.
    4. `test_procurement_arithmetic_and_imbalance` & `test_bias_correction_hedged_identity`: Verifies procurement math and volume conservation.
    5. Edge cases: zero-wind calm hours, missing settlement period pair NaN handling, and deduplication.

---

### Segment 4: Production Deployment & Docker Packaging (8:30 - 9:45)
* **Screen**: Code editor showing `Dockerfile` and `vercel.json`, and browser showing the live app.
* **Talking Points**:
  * Unified single-container architecture: multi-stage `Dockerfile` builds React in Node 22, and copies static files into Python 3.12 where FastAPI serves both `/api` endpoints and the static SPA.
  * Zero external database dependency: pre-computed JSON is under 4 MB, giving sub-15ms response times.
  * Only `fastapi` and `numpy` in the runtime bundle—zero pandas or pyarrow in serverless.
  * Public anonymous repository with zero personal identity leaks and full AI disclosure.
