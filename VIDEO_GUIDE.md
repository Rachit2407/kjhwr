# 10-Minute Video Demo Guide & Script

> **Evaluation Criterion Note**: REint evaluations begin with this video. Total duration must be $\le$ 10 minutes (Part 1 $\le$ 5 min, Part 2 $\le$ 5 min). Upload as an **Unlisted YouTube Video**.

---

## Pre-Recording Checklist (Anonymity & Environment)
- [ ] Open an incognito browser window with bookmarks hidden.
- [ ] Ensure terminal prompt does not show your personal name (e.g., use a clean prompt: `PS C:\workspace>`).
- [ ] Close personal Slack, Discord, email, or chat notifications.
- [ ] Open the deployed application (or `http://localhost:8000`) in full screen.

---

## PART 1: Client Pitch (Target: ~4.5 Minutes)
**Audience**: UK Energy Utility Day-Ahead Wholesale Trading Desk  
**Goal**: Impress the client with business impact, clarity at decision cutoff, and protection against balancing cashout penalties.

---

### Segment 1: The Commercial Challenge (0:00 - 1:00)
* **Screen**: Day-Ahead Decision Desk, showing delivery date `2026-01-15`.
* **Spoken Script**:
  > *"Hello team. Every morning before gate closure on Day D-1, your trading desk faces the same multi-million-pound question: **How much thermal power do we need to procure on the Day-Ahead Market to serve consumer demand after accounting for wind?**"*
  >
  > *"If you overestimate wind generation, you under-procure day-ahead and get forced into the Balancing Mechanism at penal cashout prices to cover the deficit. If you underestimate wind, you over-procure expensive thermal power and dump excess energy at a loss.*
  >
  > *"As part of our pilot project, we built **WindCast UK**—a purpose-built platform that gives your desk two things you never had before: first, instantaneous clarity on the **exact latest forecast vintage** available at your decision cutoff; and second, a **quantified, out-of-sample risk buffer** that protects your net position against wind shortfalls without guesswork."*

---

### Segment 2: Live Day-Ahead Decision Desk Walkthrough (1:00 - 2:30)
* **Screen**: Interacting with the Delivery Date picker and Cutoff dropdown on the Day-Ahead Decision Desk.
* **Spoken Script**:
  > *"Let's look at the Day-Ahead Decision Desk for **January 15, 2026**—a high-volatility winter day.*
  >
  > *"Notice the badge at the top right: at your assumed **11:00 UTC auction cutoff**, the system automatically identifies and locks the most recent forecast vintage published by National Grid ESO—in this case, the run published at **10:30 UTC**.*
  >
  > *"On the timeline, the green line is actual wind generation, the cyan dashed line is your day-ahead forecast, and the purple line is the 48-hour persistence baseline. Looking at the error bars below, notice what happened: during the afternoon ramp, National Grid forecasted over 18,000 MW of wind, but actuals came in at under 14,000 MW—a massive **4,000 to 5,000 MW shortfall**.*
  >
  > *"If a trader traded solely on the raw forecast, the utility would have faced severe unhedged exposure during the evening peak. Let's see how our platform solves this."*

---

### Segment 3: The Procurement & Risk Simulator in Action (2:30 - 4:00)
* **Screen**: Switching to the **Procurement & Risk Simulator** tab. Setting demand to 30,000 MW and confidence to P90.
* **Spoken Script**:
  > *"Here in the Procurement Simulator, your team enters your consumer demand baseline—let's use 30,000 MW—and selects your desired risk tolerance, such as **P90 shortfall confidence**.*
  >
  > *"Instead of relying on a static fudge factor, our engine calculates a **dynamic, rolling risk buffer**. On January 15, the engine recommended carrying an additional **~3,400 MW** of thermal procurement buffer.*
  >
  > *"Look at the lower chart: the blue bars represent your net imbalance position. Because the desk procured the base thermal requirement **plus the P90 risk buffer**, the utility was never caught short. Across the entire month of January, this rolling buffer achieved **81% overall coverage** and **77.5% shortfall-only coverage** strictly out-of-sample.*
  >
  > *"In summary, this pilot delivers the transparency your traders need before 11:00 AM to eliminate unhedged cashout risk."*

---

### Segment 4: Client Transition to Tech Lead (4:00 - 4:30)
* **Spoken Script**:
  > *"Thank you for your time. In the next part of this video, I will walk our technical lead through the underlying engineering architecture, statistical formulations, and code implementation."*

---

## PART 2: Technical Lead Review (Target: ~4.5 Minutes)
**Audience**: Internal Technical Lead / Engineering Reviewer  
**Goal**: Demonstrate software discipline, domain understanding, zero-leakage backtesting, test coverage, and clean deployment.

---

### Segment 1: Domain Modeling & Data Reconciliation (4:30 - 5:45)
* **Screen**: Code editor showing `data/etl_pipeline.py` and `data/build_aligned_dataset.py`.
* **Spoken Script**:
  > *"Hi. For this pilot, our backend ingests national wind data exclusively from Elexon BMRS: actual generation from `FUELHH` and forecasts from `WINDFOR`.*
  >
  > *"A critical primary-data finding we discovered during ETL inspection is that **FUELHH publishes at 30-minute resolution**, while **WINDFOR publishes strictly on the hour (60-minute resolution)**.*
  >
  > *"To ensure mathematically sound reconciliation without distortion, our ETL aggregates each pair of 30-minute settlement periods into a strict hourly mean: $(\text{SP}_{2h+1} + \text{SP}_{2h+2}) / 2$. If either half-hour is missing, the hour is treated as incomplete rather than halved. Granular 48-period actuals are also retained for visualization.*
  >
  > *"Our data fetch window covers **December 25, 2025 to February 3, 2026**, capturing all decisions made in January 2026 (delivery Jan 2 to Feb 1) with a full warm-up period."*

---

### Segment 2: Statistical Rigor & Zero-Leakage Rolling Buffer (5:45 - 7:15)
* **Screen**: Code editor showing `backend/app/metrics.py` and the `compute_rolling_risk_buffer` function.
* **Spoken Script**:
  > *"Now let's examine the statistical engine in `backend/app/metrics.py`.*
  >
  > *"First, we benchmarked WINDFOR against two observable heuristics: **Baseline 1**, which is persistence from 48 hours prior ($y_{t-48\text{h}}$), and **Baseline 2**, the 7-day rolling mean for the same hour. Both are 100% observable at Day D-1 cutoff. WINDFOR achieves an MAE of **2,013 MW** versus ~4,340 MW for persistence—a genuine **+53.6% forecast skill score**.*
  >
  > *"Second, and most importantly, our rolling risk buffer has **zero lookahead leakage**. For any delivery day D, the training set ends strictly at **D-2**—the last completed delivery day before decision day D-1. Furthermore, historical errors are computed exclusively using forecasts generated under the **identical cutoff rule**.*
  >
  > *"We also address heteroscedasticity: wind forecast error scales with generation level. We split historical errors by median forecast into **Low Wind** and **High Wind** regimes, with early-January warm-up pooled until a 48-hour sample threshold is met."*

---

### Segment 3: Automated Test Suite & Leakage Verification (7:15 - 8:30)
* **Screen**: Terminal running `python -m pytest` showing 13 passing tests. Open `tests/test_leakage.py`.
* **Spoken Script**:
  > *"Engineering discipline is backed by 13 unit tests. Let's look at `tests/test_leakage.py`.*
  >
  > *"In `test_rolling_buffer_zero_leakage_from_future`, we programmatically perturb actual generation on Day D-1 and Day D by 50,000 MW. The test asserts that the computed buffer for Day D remains 100% bitwise identical. This proves zero lookahead leakage.*
  >
  > *"We also test vintage cutoff boundary isolation, hand-calculated metric vectors, and settlement period pair aggregation."*

---

### Segment 4: Production Deployment & Docker Packaging (8:30 - 9:45)
* **Screen**: Code editor showing `Dockerfile` and `vercel.json`, and the browser showing the live deployed app.
* **Spoken Script**:
  > *"For deployment, we used a unified architecture. In `Dockerfile`, a multi-stage build compiles the React Vite frontend in Node 22, and copies the static assets into a lightweight Python 3.12 container where FastAPI serves both `/api` routes and the static single-page app.*
  >
  > *"The pre-computed dataset is under 4 MB, so the server requires zero external database dependencies, starts in under 1 second, and has sub-20ms query latency. For cloud deployment, it is configured for instant deployment to Vercel and Heroku.*
  >
  > *"All code is committed to an anonymous public GitHub repository with full instructions and explicit AI disclosure in the README. Thank you."*
