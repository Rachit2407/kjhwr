import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { ShieldCheck, Sliders, AlertTriangle, ArrowRight, CheckCircle2, TrendingDown, Sparkles } from 'lucide-react';
import { fetchProcurementSimulation } from '../api';

export default function ProcurementSim({ selectedCutoff, onCutoffChange }) {
  const [demand, setDemand] = useState(30000);
  const [quantile, setQuantile] = useState(0.90);
  const [biasCorrection, setBiasCorrection] = useState(false);
  const [simDate, setSimDate] = useState('2026-01-15');
  const [overallSim, setOverallSim] = useState(null);
  const [daySim, setDaySim] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      fetchProcurementSimulation(selectedCutoff, demand, quantile, biasCorrection),
      fetchProcurementSimulation(selectedCutoff, demand, quantile, biasCorrection, simDate)
    ])
      .then(([ov, d]) => {
        if (active) {
          setOverallSim(ov);
          setDaySim(d);
          setLoading(false);
        }
      })
      .catch(err => {
        if (active) {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => { active = false; };
  }, [selectedCutoff, demand, quantile, biasCorrection, simDate]);

  if (loading && !overallSim) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  if (error && !overallSim) {
    return (
      <div className="p-6 bg-red-950/40 border border-red-800 rounded-xl text-red-200">
        <p className="font-semibold">Error running procurement simulation:</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Parameter Control Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-semibold text-slate-100">
                Day-Ahead Procurement & Out-of-Sample Risk Buffer Engine
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Translating quantified forecast error into an actionable hedging strategy to prevent expensive cashout shortfall penalties
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs text-slate-400 font-medium">Cutoff:</label>
            <select
              value={selectedCutoff}
              onChange={e => onCutoffChange(e.target.value)}
              className="bg-slate-950 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200 focus:outline-none"
            >
              <option value="9">09:00 UTC</option>
              <option value="11">11:00 UTC (Default GB DAM)</option>
              <option value="12">12:00 UTC</option>
              <option value="14">14:00 UTC</option>
              <option value="17">17:00 UTC</option>
              <option value="23">23:00 UTC</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-2 border-t border-slate-800">
          <div>
            <div className="flex justify-between items-center text-xs text-slate-300 font-medium mb-1">
              <span>Consumer Demand Baseline (MW):</span>
              <span className="font-mono text-cyan-400 font-bold">{demand.toLocaleString()} MW</span>
            </div>
            <input
              type="range"
              min="15000"
              max="45000"
              step="1000"
              value={demand}
              onChange={e => setDemand(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <span className="text-[11px] text-slate-500">
              *Illustrative demand baseline parameter
            </span>
          </div>

          <div>
            <div className="flex justify-between items-center text-xs text-slate-300 font-medium mb-1">
              <span>Nominal Protection Tier:</span>
              <span className="font-mono text-emerald-400 font-bold">{(quantile * 100).toFixed(0)}% Nominal (P{(quantile * 100).toFixed(0)})</span>
            </div>
            <div className="flex gap-2">
              {[0.80, 0.90, 0.95].map(q => (
                <button
                  key={q}
                  onClick={() => setQuantile(q)}
                  className={`flex-1 py-1.5 rounded text-xs font-medium transition ${
                    quantile === q
                      ? 'bg-emerald-600 text-white font-semibold'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  P{(q * 100).toFixed(0)}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-slate-500">
              Quantile of historical one-sided forecast shortfall
            </span>
          </div>

          <div>
            <div className="flex justify-between items-center text-xs text-slate-300 font-medium mb-1">
              <span>Rolling Bias Correction:</span>
              <span className={`text-[11px] font-bold ${biasCorrection ? 'text-cyan-400' : 'text-slate-500'}`}>
                {biasCorrection ? 'Active (-1 GW Buffer)' : 'Off (Unadjusted)'}
              </span>
            </div>
            <button
              onClick={() => setBiasCorrection(!biasCorrection)}
              className={`w-full py-1.5 px-3 rounded-lg text-xs font-medium transition flex items-center justify-center gap-1.5 border ${
                biasCorrection
                  ? 'bg-cyan-950/80 border-cyan-600 text-cyan-300'
                  : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              {biasCorrection ? 'De-biasing Enabled' : 'Enable Rolling De-biasing'}
            </button>
            <span className="text-[11px] text-slate-500">
              Subtracts D-2 rolling bias; lowers buffer cost
            </span>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Inspect Delivery Date (Day D):
            </label>
            <input
              type="date"
              min="2026-01-02"
              max="2026-02-01"
              value={simDate}
              onChange={e => setSimDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-200 focus:outline-none"
            />
            <div className="flex gap-1 mt-1.5">
              <button
                onClick={() => setSimDate('2026-01-15')}
                className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
                title="Jan 15: 100% Coverage Day"
              >
                Jan 15 (100% Cov)
              </button>
              <button
                onClick={() => setSimDate('2026-01-12')}
                className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-800 text-amber-300 hover:bg-amber-900"
                title="Jan 12: 6.8 GW Shortfall Storm Day"
              >
                Jan 12 (6.8GW Storm)
              </button>
              <button
                onClick={() => setSimDate('2026-01-28')}
                className="text-[10px] px-1.5 py-0.5 rounded bg-red-950/80 border border-red-800 text-red-300 hover:bg-red-900"
                title="Jan 28: Severe Tail Anomaly"
              >
                Jan 28 (Tail Anomaly)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Honest Out-of-Sample Calibration Cards */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-slate-200">
              Strictly Out-of-Sample Backtest: Nominal Target vs Realized Coverage
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {overallSim.totalEvaluatedHours} evaluated hours across 31 delivery days
          </span>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          For every day D, the risk buffer is calibrated exclusively on completed delivery days strictly up to D-2 using the same cutoff rule.
          Because early-January has thin history and real-world wind distributions undergo sharp nonstationary shifts (e.g. storm days), realized coverage differs from nominal target.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5">
            <span className="text-xs text-slate-400 uppercase tracking-wider">Overall Realized Coverage</span>
            <div className="mt-1 text-2xl font-bold font-mono text-emerald-400">
              {overallSim.overallCoveragePercent}%
            </div>
            <span className="text-[11px] text-slate-400">
              Target: <span className="text-slate-200 font-semibold">{overallSim.nominalCoveragePercent}% nominal</span> (9% gap across all Jan)
            </span>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5">
            <span className="text-xs text-slate-400 uppercase tracking-wider">Post-Warmup Coverage</span>
            <div className="mt-1 text-2xl font-bold font-mono text-cyan-400">
              {overallSim.postWarmupCoveragePercent}%
            </div>
            <span className="text-[11px] text-slate-400">
              Jan 9 – Feb 1 (excluding Week 1 warm-up noise)
            </span>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5">
            <span className="text-xs text-slate-400 uppercase tracking-wider">Average Buffer Held</span>
            <div className="mt-1 text-2xl font-bold font-mono text-amber-400">
              {overallSim.averageBufferMW.toLocaleString()} <span className="text-xs font-normal text-slate-400">MW</span>
            </div>
            <span className="text-[11px] text-slate-400">
              {biasCorrection ? 'Saved ~1,000 MW via rolling de-biasing' : 'Insurance margin carried by the utility'}
            </span>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5">
            <span className="text-xs text-slate-400 uppercase tracking-wider">Shortfall-Only Coverage</span>
            <div className="mt-1 text-2xl font-bold font-mono text-indigo-400">
              {overallSim.shortfallOnlyCoveragePercent}%
            </div>
            <span className="text-[11px] text-slate-400">
              Coverage conditioned strictly on error &gt; 0
            </span>
          </div>
        </div>

        {/* Weekly Learning Table */}
        <div className="mt-4 pt-4 border-t border-slate-800">
          <h4 className="text-xs font-semibold uppercase text-slate-400 mb-2">
            Weekly Calibration Evolution (Sample Expansion Learning Curve)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
            {overallSim.weeklyBreakdown?.map((w, idx) => (
              <div key={idx} className="bg-slate-950/70 border border-slate-800/80 rounded p-2.5 text-center">
                <span className="block text-[11px] font-medium text-slate-400 truncate">{w.week.split('(')[0]}</span>
                <span className="block text-base font-bold font-mono text-slate-100 mt-1">
                  {w.realizedCoveragePercent}%
                </span>
                <span className="block text-[10px] text-slate-500 mt-0.5">Buf: {w.avgBufferMW.toLocaleString()} MW</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hourly Dispatch & Hedge Timeline */}
      {daySim && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Hedging & Dispatch Schedule: {daySim.date}
              </h3>
              <p className="text-xs text-slate-400">
                Comparing Base Procurement vs Total Hedged Procurement (Base + Risk Buffer) vs Actual Residual Demand
              </p>
            </div>
            <div className="text-right">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                daySim.dayCoveragePercent >= 80 ? 'bg-emerald-950/70 border border-emerald-800 text-emerald-300' : 'bg-amber-950/70 border border-amber-800 text-amber-300'
              }`}>
                Day Coverage: {daySim.dayCoveragePercent}%
              </span>
              {daySim.isWarmup && (
                <p className="text-[10px] text-amber-400 mt-0.5">Early-month warm-up regime (pooled buffer)</p>
              )}
            </div>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={daySim.hours} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="hour" stroke="#64748b" tickFormatter={h => `${h}:00`} fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} unit=" MW" tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                  formatter={(val, name) => [`${Number(val).toLocaleString()} MW`, name]}
                  labelFormatter={h => `Hour ${h}:00 UTC`}
                />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Line
                  type="monotone"
                  dataKey="demandMW"
                  name="Consumer Demand Baseline"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="actualResidualDemandMW"
                  name="Actual Residual Thermal Demand (Demand - Actual Wind)"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="totalProcuredMW"
                  name="Total Hedged Day-Ahead Procurement (Base + Buffer)"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="baseProcurementMW"
                  name="Unhedged Base Procurement (Demand - Wind Forecast)"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Imbalance Position Chart */}
          <div className="pt-4 border-t border-slate-800">
            <h4 className="text-xs font-semibold uppercase text-slate-400 mb-1">
              Net Imbalance Position (MWh): Hedged Procured Minus Actual Residual
            </h4>
            <p className="text-xs text-slate-500 mb-3">
              Positive (Blue) = Surplus energy sold back to system. Negative (Red) = Unhedged shortfall exposing utility to cashout prices.
            </p>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={daySim.hours} margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="hour" stroke="#64748b" tickFormatter={h => `${h}:00`} fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} unit=" MW" />
                  <ReferenceLine y={0} stroke="#475569" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                    formatter={(val) => [`${Number(val).toLocaleString()} MW`, 'Net Imbalance']}
                    labelFormatter={h => `Hour ${h}:00`}
                  />
                  <Bar
                    dataKey="netImbalanceMW"
                    name="Net Imbalance MW"
                    shape={(props) => {
                      const { x, y, width, height, value } = props;
                      const color = value >= 0 ? '#3b82f6' : '#ef4444';
                      return <rect x={x} y={y} width={width} height={height} fill={color} rx={2} />;
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
