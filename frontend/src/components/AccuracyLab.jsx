import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { Activity, Gauge, TrendingUp, BarChart3, Clock, Compass, ShieldAlert } from 'lucide-react';
import { fetchAccuracySummary, fetchLeadTimeAnalysis } from '../api';

export default function AccuracyLab({ selectedCutoff, onCutoffChange }) {
  const [summaryData, setSummaryData] = useState(null);
  const [leadTimeData, setLeadTimeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      fetchAccuracySummary(selectedCutoff),
      fetchLeadTimeAnalysis()
    ])
      .then(([s, l]) => {
        if (active) {
          setSummaryData(s);
          setLeadTimeData(l);
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
  }, [selectedCutoff]);

  if (loading && !summaryData) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  if (error && !summaryData) {
    return (
      <div className="p-6 bg-red-950/40 border border-red-800 rounded-xl text-red-200">
        <p className="font-semibold">Error loading Accuracy metrics:</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  const { summary, diurnalProfile, evaluationWindow } = summaryData;
  const { curve: leadTimeCurve, totalObservations } = leadTimeData;

  return (
    <div className="space-y-6">
      {/* Scope and Population Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-wrap gap-4 items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-semibold text-slate-100">
              Quantitative Forecast Accuracy Benchmark: January 2026
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Auditing National Grid ESO WINDFOR vs FUELHH Wind Generation across 744 hourly trading periods
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-400 font-medium">Cutoff Assumption:</label>
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

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex justify-between items-center text-slate-400 text-xs uppercase tracking-wider">
            <span>Mean Absolute Error (MAE)</span>
            <Gauge className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-100 font-mono">
            {summary.maeMW.toLocaleString()} <span className="text-sm font-normal text-slate-400">MW</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            WAPE: <span className="text-cyan-400 font-medium">{summary.wapePercent}%</span> of total generation
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex justify-between items-center text-slate-400 text-xs uppercase tracking-wider">
            <span>Root Mean Square Error</span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-100 font-mono">
            {summary.rmseMW.toLocaleString()} <span className="text-sm font-normal text-slate-400">MW</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Penalizes extreme tail misses
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex justify-between items-center text-slate-400 text-xs uppercase tracking-wider">
            <span>Systematic Mean Bias</span>
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          </div>
          <div className={`mt-2 text-2xl font-bold font-mono ${summary.meanBiasMW > 0 ? 'text-amber-400' : 'text-blue-400'}`}>
            {summary.meanBiasMW > 0 ? `+${summary.meanBiasMW.toLocaleString()}` : summary.meanBiasMW.toLocaleString()} <span className="text-sm font-normal text-slate-400">MW</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {summary.meanBiasMW > 0 ? 'Persistent Over-forecasting (Shortfall risk)' : 'Under-forecasting (Surplus)'}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex justify-between items-center text-slate-400 text-xs uppercase tracking-wider">
            <span>Error Quantile Spread</span>
            <Compass className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-sm font-mono text-slate-200">
            <div>P10: <span className="text-blue-400">{summary.errorQuantiles.p10} MW</span></div>
            <div>P50: <span className="text-slate-300">{summary.errorQuantiles.p50} MW</span></div>
            <div>P90: <span className="text-amber-400 font-semibold">{summary.errorQuantiles.p90} MW</span></div>
          </div>
        </div>
      </div>

      {/* Naive Baselines & Forecast Skill Scores */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-200 mb-1 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-cyan-400" />
          Benchmark Comparison & Value of Forecast (Forecast Skill Scores)
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          An MAE of ~2,000 MW is only meaningful compared to what a trader could do with simple historical heuristics.
          We test against two observable baselines known at Day D-1 cutoff.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-semibold uppercase text-slate-400">Baseline 1: Persistence (t - 48h)</span>
                <p className="text-xs text-slate-400 mt-0.5">Same-hour actual observed on Day D-2 (100% observable at cutoff)</p>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 font-mono text-xs font-bold">
                +{summary.baseline48h.skillScorePercent}% Skill
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-4">
              <div>
                <span className="text-xs text-slate-400">Baseline MAE:</span>
                <p className="text-lg font-mono font-semibold text-slate-200">{summary.baseline48h.maeMW.toLocaleString()} MW</p>
              </div>
              <div>
                <span className="text-xs text-slate-400">WINDFOR MAE:</span>
                <p className="text-lg font-mono font-semibold text-cyan-400">{summary.maeMW.toLocaleString()} MW</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-semibold uppercase text-slate-400">Baseline 2: 7-Day Rolling Mean</span>
                <p className="text-xs text-slate-400 mt-0.5">Average of same hour across past 7 observable days (t-48h through t-192h)</p>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 font-mono text-xs font-bold">
                +{summary.baseline7dMean.skillScorePercent}% Skill
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-4">
              <div>
                <span className="text-xs text-slate-400">Baseline MAE:</span>
                <p className="text-lg font-mono font-semibold text-slate-200">{summary.baseline7dMean.maeMW.toLocaleString()} MW</p>
              </div>
              <div>
                <span className="text-xs text-slate-400">WINDFOR MAE:</span>
                <p className="text-lg font-mono font-semibold text-cyan-400">{summary.maeMW.toLocaleString()} MW</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Diurnal Error Profile (Hour 0 to 23) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">
              Diurnal Error Profile by Hour of Day (0 to 23 UTC)
            </h3>
            <span className="text-xs text-cyan-400 bg-cyan-950/60 border border-cyan-800 px-2.5 py-1 rounded-md">
              Population: 744 cutoff-vintage hours
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Reveals time-of-day error structure. The shaded region denotes the P10-P90 forecast uncertainty band.
          </p>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={diurnalProfile} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="hour" stroke="#64748b" tickFormatter={h => `${h}:00`} fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} unit=" MW" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                labelFormatter={h => `Hour ${h}:00 UTC`}
                formatter={(val, name) => [`${Number(val).toLocaleString()} MW`, name]}
              />
              <Legend wrapperStyle={{ paddingTop: '8px' }} />
              <Area
                type="monotone"
                dataKey="p90MW"
                name="P90 Upper Error Bound"
                stroke="#f59e0b"
                fill="#f59e0b"
                fillOpacity={0.15}
              />
              <Line
                type="monotone"
                dataKey="maeMW"
                name="Mean Absolute Error (MAE)"
                stroke="#06b6d4"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="meanBiasMW"
                name="Mean Bias"
                stroke="#ec4899"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                dot={false}
              />
              <ReferenceLine y={0} stroke="#475569" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Lead-Time Error Decay Curve */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">
              Forecast Horizon Degradation Curve (Lead Time Decay)
            </h3>
            <span className="text-xs text-indigo-400 bg-indigo-950/60 border border-indigo-800 px-2.5 py-1 rounded-md">
              Population: {totalObservations.toLocaleString()} forecast runs across all horizons
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Quantifying how forecast accuracy degrades as lead time increases from intraday (0-6h) up to 60+ hours ahead.
          </p>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={leadTimeCurve} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="leadTimeBin" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} unit=" MW" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                formatter={(val, name) => [`${Number(val).toLocaleString()} MW`, name]}
                labelFormatter={l => `Lead Time Bin: ${l}`}
              />
              <Legend wrapperStyle={{ paddingTop: '8px' }} />
              <Bar dataKey="maeMW" name="MAE (MW)" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              <Bar dataKey="rmseMW" name="RMSE (MW)" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
