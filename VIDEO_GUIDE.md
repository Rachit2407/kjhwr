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
**Goal**: Impress the client with business impact, clarity at decision cutoff, and protection against balancing cashout penalties.

---

### Segment 1: The Commercial Challenge (0:00 - 1:00)
* **Screen**: Day-Ahead Decision Desk, showing delivery date `2026-01-15`.
* **Talking Points**:
  * Every morning before gate closure on Day D-1, your trading desk faces the same multi-million-pound question: **How much thermal power do we need to procure on the Day-Ahead Market to serve consumer demand after accounting for wind?**
  * If you overestimate wind, you under-procure day-ahead and get forced into the Balancing Mechanism at penal cashout prices to cover the deficit. If you underestimate wind, you over-procure expensive thermal power and dump excess energy at a loss.
  * As part of our pilot project, we built **WindCast UK**—a purpose-built platform that gives your desk two things you never had before:
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
  * Trading on the raw forecast on January 12 would have left the utility catastrophically short. Show how the Procurement Simulator handles both scenarios.

---

### Segment 3: The Procurement & Risk Simulator in Action (2:30 - 4:00)
* **Screen**: Switching to the **Procurement & Risk Simulator** tab. Setting demand to 30,000 MW and confidence to P90.
* **Talking Points**:
  * In the Procurement Simulator, your team enters your consumer demand baseline—let's use 30,000 MW—and selects your desired risk tolerance, such as **P90 shortfall confidence**.
  * Our engine calculates a **dynamic, rolling risk buffer**. On January 15, the engine recommended carrying an additional **~3,819 MW** of thermal procurement buffer.
  * Look at the lower chart: the blue bars represent your net imbalance position. Because the desk procured the base thermal requirement **plus the P90 risk buffer**, January 15 achieved **100% coverage (0 breaches across all 24 hours)**.
  * Be honest about tail risk: on extreme storm days like January 12, the buffer covers most hours but can be breached by severe 6.8 GW tail anomalies—which is why we provide both nominal P90 buffers and a **Rolling De-biasing toggle**, which removes structural offset and saves over **1,000 MW** of unnecessary holding costs during normal regimes.

---

### Segment 4: Client Transition to Tech Lead (4:00 - 4:30)
* **Talking Points**:
  * Summarize pilot outcomes: transparent forecast vintages at 11:00 AM, actionable protection against balancing cashout penalties, and clear visibility into forecast error.
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
  * **Row Accounting**: Of the 23,360 raw WINDFOR records across 320 runs, exactly 4,801 are nowcast/backcast points with lead time $< 0$ (NESO includes past 10.5 hours), 544 extend beyond our actuals window, leaving exactly **18,015 valid forward forecast records** spanning 0.5h to 66.5h horizons.
  * **Time-Shift Sensitivity Audit**: We tested shifting actuals by ±30 and ±60 minutes. The ~1,730 MW Mean Bias remained unchanged (+1,716 to +1,743 MW), proving this is NOT a temporal alignment bug. It reflects the structural reality that `FUELHH` measures strictly Transmission-Connected BM generation, whereas `WINDFOR` forecasts system-wide wind including embedded capacity.

---

### Segment 2: Statistical Rigor & Zero-Leakage Rolling Buffer (5:45 - 7:15)
* **Screen**: Code editor showing `backend/app/metrics.py` and `compute_rolling_risk_buffer`.
* **Talking Points**:
  * **Baselines**: Benchmarked against Baseline 1 ($y_{t-48\text{h}}$) and Baseline 2 (7-day mean of same hour). Both are 100% observable at Day D-1 cutoff. WINDFOR achieves an MAE of 2,013 MW vs ~4,340 MW for persistence—a genuine **+53.6% forecast skill score**.
  * **Zero Lookahead Leakage**: For delivery Day D, the training set ends strictly at **D-2** (last completed delivery day before decision day D-1). Historical errors are computed exclusively using forecasts generated under the **identical cutoff rule**.
  * **Honest Calibration & Weekly Evolution**:
    * Overall realized coverage across all 31 days is **81.0%** against the nominal 90% target (a 9-point gap due to early warm-up noise and storm regime shifts).
    * Walk through the learning curve: Week 1 achieved **69.0%**, Week 2 **77.4%**, Week 3 **86.3%**, Week 4 **85.1%**, and Week 5 reached **95.8%** as historical data expanded. Post-warmup coverage was **84.5%**.
  * **Rolling De-biasing**: By subtracting the D-2 rolling mean bias, average buffer size drops from 3,906 MW to 2,840 MW while maintaining 85.1% coverage.

---

### Segment 3: Automated Test Suite (7:15 - 8:30)
* **Screen**: Terminal running `python -m pytest` showing all 19 tests passing. Open `tests/test_leakage.py` and `tests/test_lead_time_and_boundaries.py`.
* **Talking Points**:
  * 19 unit tests backing the platform:
    1. `test_rolling_buffer_zero_leakage_from_future`: Perturbs actuals on D-1 and D by 50,000 MW; verifies the computed buffer for Day D remains 100% bitwise identical.
    2. `test_cutoff_boundary_inclusion_and_exclusion`: Asserts forecasts at exact cutoff are eligible, while cutoff + 1 min is strictly excluded.
    3. `test_lead_time_validity_and_bounds`: Asserts all 18,015 lead-time observations are strictly positive ($0.5\text{h} \le \text{lead} \le 66.5\text{h}$) with valid error definitions.
    4. Edge cases: zero-wind calm hours, missing settlement period pair NaN handling, and deduplication (latest publishTime wins).

---

### Segment 4: Production Deployment & Docker Packaging (8:30 - 9:45)
* **Screen**: Code editor showing `Dockerfile` and `vercel.json`, and browser showing the live app.
* **Talking Points**:
  * Unified single-container architecture: multi-stage `Dockerfile` builds React in Node 22, and copies static files into Python 3.12 where FastAPI serves both `/api` endpoints and the static SPA.
  * Zero external database dependency: pre-computed JSON is under 4 MB, giving sub-15ms response times.
  * Cloud ready for Vercel (via `api/index.py` serverless runtime) and Heroku.
  * Public anonymous repository with zero personal identity leaks and full AI disclosure.
