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
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  if (error && !summaryData) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
        <p className="font-semibold text-sm">Error loading Accuracy metrics:</p>
        <p className="text-xs mt-0.5">{error}</p>
      </div>
    );
  }

  const { summary, diurnalProfile, evaluationWindow } = summaryData;
  const { curve: leadTimeCurve, totalObservations } = leadTimeData;

  return (
    <div className="space-y-6">
      {/* Header & Cutoff Selector */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs flex flex-wrap gap-4 items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-700" />
            <h2 className="text-sm font-semibold text-slate-900">
              Quantitative Forecast Accuracy Benchmark: January 2026 Decisions
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Auditing National Grid ESO WINDFOR against FUELHH Wind Generation across 744 hourly trading periods
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Cutoff:</label>
          <select
            value={selectedCutoff}
            onChange={e => onCutoffChange(e.target.value)}
            className="bg-white border border-slate-300 px-3 py-1.5 rounded-md text-xs font-medium text-slate-800 focus:outline-none shadow-xs"
          >
            <option value="9">09:00 UTC (Early trading)</option>
            <option value="11">11:00 UTC (GB DAM Benchmark)</option>
            <option value="12">12:00 UTC (Midday auction close)</option>
            <option value="14">14:00 UTC (Afternoon revision)</option>
            <option value="17">17:00 UTC (Evening review)</option>
            <option value="23">23:00 UTC (End of Day D-1)</option>
          </select>
        </div>
      </div>

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Mean Absolute Error (MAE)
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-slate-900">
            {summary.maeMW.toLocaleString()} <span className="text-xs font-normal text-slate-500">MW</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Sample: N={summary.count} delivery hours
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Root Mean Square Error (RMSE)
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-slate-900">
            {summary.rmseMW.toLocaleString()} <span className="text-xs font-normal text-slate-500">MW</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Penalizes large tail errors
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Mean Bias (Systematic Offset)
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-slate-900">
            {summary.meanBiasMW >= 0 ? `+${summary.meanBiasMW.toLocaleString()}` : summary.meanBiasMW.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-500">MW</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Systematic over-forecasting tendency
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Weighted Absolute Error (WAPE)
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-slate-900">
            {summary.wapePercent}%
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Total Absolute Error / Total Generation
          </div>
        </div>
      </div>

      {/* Observable Baselines & Skill Scores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                Baseline 1: t - 48h Persistence
              </h4>
              <p className="text-[11px] text-slate-500">
                Observable on Day D-2: y(t-48h). 100% known at D-1 11:00 UTC cutoff
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              +{summary.baseline48h.skillScorePercent}% Skill Score
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div>
              <span className="text-xs text-slate-500">Baseline MAE:</span>
              <div className="text-lg font-bold font-mono text-slate-900">{summary.baseline48h.maeMW.toLocaleString()} MW</div>
            </div>
            <div>
              <span className="text-xs text-slate-500">Forecast MAE:</span>
              <div className="text-lg font-bold font-mono text-blue-700">{summary.maeMW.toLocaleString()} MW</div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                Baseline 2: 7-Day Rolling Mean
              </h4>
              <p className="text-[11px] text-slate-500">
                Average of same hour over past 7 observable days (D-8 to D-2)
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              +{summary.baseline7dMean.skillScorePercent}% Skill Score
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div>
              <span className="text-xs text-slate-500">Baseline MAE:</span>
              <div className="text-lg font-bold font-mono text-slate-900">{summary.baseline7dMean.maeMW.toLocaleString()} MW</div>
            </div>
            <div>
              <span className="text-xs text-slate-500">Forecast MAE:</span>
              <div className="text-lg font-bold font-mono text-blue-700">{summary.maeMW.toLocaleString()} MW</div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Quantiles Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-2">
        <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Forecast Error Quantile Distribution (Forecast - Actual, MW)
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="bg-slate-50 border border-slate-200 rounded p-3 text-center">
            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">P10 (Severe Under-forecast)</span>
            <div className="text-xl font-bold font-mono text-slate-800 mt-1">{summary.errorQuantiles.p10.toLocaleString()} MW</div>
            <span className="text-[11px] text-slate-500">10% of errors fall below this value</span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded p-3 text-center">
            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">P50 (Median Error)</span>
            <div className="text-xl font-bold font-mono text-slate-800 mt-1">+{summary.errorQuantiles.p50.toLocaleString()} MW</div>
            <span className="text-[11px] text-slate-500">Median error across all trading hours</span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded p-3 text-center">
            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">P90 (Severe Shortfall Risk)</span>
            <div className="text-xl font-bold font-mono text-amber-700 mt-1">+{summary.errorQuantiles.p90.toLocaleString()} MW</div>
            <span className="text-[11px] text-slate-500">90% of shortfalls fall below this threshold</span>
          </div>
        </div>
      </div>

      {/* Diurnal Error Curve */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-3">
        <div className="border-b border-slate-100 pb-2">
          <h3 className="text-sm font-semibold text-slate-900">
            Diurnal Forecast Error Profile by Hour of Day
          </h3>
          <p className="text-xs text-slate-500">
            Comparing MAE and Mean Bias across each hour of the 24-hour cycle to assess intraday error patterns
          </p>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={diurnalProfile} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="hourOfDay" stroke="#64748b" tickFormatter={h => `${h}:00`} fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '6px', fontSize: '12px' }}
                formatter={(val, name) => [`${Number(val).toLocaleString()} MW`, name]}
                labelFormatter={h => `Hour ${h}:00 - ${Number(h) + 1}:00`}
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="maeMW" name="MAE (MW)" fill="#2563eb" radius={[2, 2, 0, 0]} />
              <Bar dataKey="meanBiasMW" name="Mean Bias (MW)" fill="#d97706" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Lead-Time Degradation Curve */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-3">
        <div className="border-b border-slate-100 pb-2">
          <h3 className="text-sm font-semibold text-slate-900">
            Forecast Accuracy Degradation vs Lead Time Horizon
          </h3>
          <p className="text-xs text-slate-500">
            Auditing 18,015 forward forecast records across lead horizons from 0.5h to 66.5h ahead of delivery
          </p>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={leadTimeCurve} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="leadTimeBin" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '6px', fontSize: '12px' }}
                formatter={(val, name) => [`${Number(val).toLocaleString()} MW`, name]}
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px' }} />
              <Line
                type="monotone"
                dataKey="maeMW"
                name="MAE by Horizon (MW)"
                stroke="#1e3a8a"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="rmseMW"
                name="RMSE (MW)"
                stroke="#7c3aed"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                dot={{ r: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
