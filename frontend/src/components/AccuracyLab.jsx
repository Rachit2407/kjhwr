import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
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
      <div className="flex h-72 items-center justify-center border border-slate-300 bg-white">
        <span className="text-xs font-mono text-slate-600 uppercase tracking-wider">
          Computing Statistical Accuracy Benchmarks across 744 Hours...
        </span>
      </div>
    );
  }

  if (error && !summaryData) {
    return (
      <div className="p-4 bg-red-50 border border-red-300 text-red-900 font-mono text-xs">
        <div className="font-bold uppercase tracking-wider mb-1">Audit Benchmark Failure:</div>
        <div>{error}</div>
      </div>
    );
  }

  const { summary, diurnalProfile, evaluationWindow } = summaryData;
  const { curve: leadTimeCurve, totalObservations } = leadTimeData;

  return (
    <div className="space-y-4">
      {/* Benchmark Header Strip */}
      <div className="bg-white border border-slate-300 p-3 flex flex-wrap gap-4 items-center justify-between">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Quantitative Forecast Accuracy Benchmark: January 2026 Audit
          </h2>
          <p className="text-[11px] text-slate-600 font-mono mt-0.5">
            Statistical audit of National Grid ESO WINDFOR against FUELHH Wind Generation across 744 settlement hours
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">Trading Cutoff:</label>
          <select
            value={selectedCutoff}
            onChange={e => onCutoffChange(e.target.value)}
            className="border border-slate-300 bg-white px-2.5 py-1 text-xs font-mono font-medium text-slate-900 focus:outline-none focus:border-blue-700"
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-300 p-3">
          <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
            Mean Absolute Error (MAE)
          </div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {summary.maeMW.toLocaleString()} <span className="text-xs font-normal text-slate-500 font-sans">MW</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] font-mono text-slate-600">
            SAMPLE: N={summary.count} TRADING HOURS
          </div>
        </div>

        <div className="bg-white border border-slate-300 p-3">
          <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
            Root Mean Square Error (RMSE)
          </div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {summary.rmseMW.toLocaleString()} <span className="text-xs font-normal text-slate-500 font-sans">MW</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] font-mono text-slate-600">
            SENSITIVE TO LARGE TAIL DEFICITS
          </div>
        </div>

        <div className="bg-white border border-slate-300 p-3">
          <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
            Mean Bias (Systematic Offset)
          </div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {summary.meanBiasMW >= 0 ? `+${summary.meanBiasMW.toLocaleString()}` : summary.meanBiasMW.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-500 font-sans">MW</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] font-mono text-slate-600">
            SYSTEMATIC OVER-FORECAST BIAS
          </div>
        </div>

        <div className="bg-white border border-slate-300 p-3">
          <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
            Weighted Absolute Error (WAPE)
          </div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {summary.wapePercent}%
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] font-mono text-slate-600">
            TOTAL ERROR / TOTAL GENERATION
          </div>
        </div>
      </div>

      {/* Observable Baselines & Skill Scores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-white border border-slate-300 p-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Baseline 1: Persistence (t - 48h)
              </h4>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                Observable on Day D-2: y(t-48h). 100% known at D-1 11:00 UTC cutoff
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 border border-emerald-300">
              +{summary.baseline48h.skillScorePercent}% SKILL
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-3 font-mono">
            <div>
              <span className="text-[11px] text-slate-500 uppercase">Baseline MAE:</span>
              <div className="text-base font-bold text-slate-800">{summary.baseline48h.maeMW.toLocaleString()} MW</div>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 uppercase">Forecast MAE:</span>
              <div className="text-base font-bold text-blue-900">{summary.maeMW.toLocaleString()} MW</div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-300 p-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Baseline 2: 7-Day Rolling Hourly Mean
              </h4>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                Observable average of same hour over past 7 historical days (D-8 to D-2)
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 border border-emerald-300">
              +{summary.baseline7dMean.skillScorePercent}% SKILL
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-3 font-mono">
            <div>
              <span className="text-[11px] text-slate-500 uppercase">Baseline MAE:</span>
              <div className="text-base font-bold text-slate-800">{summary.baseline7dMean.maeMW.toLocaleString()} MW</div>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 uppercase">Forecast MAE:</span>
              <div className="text-base font-bold text-blue-900">{summary.maeMW.toLocaleString()} MW</div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Quantiles Strip */}
      <div className="bg-white border border-slate-300 p-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-2">
          Empirical Error Quantile Distribution (Forecast - Actual, MW)
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
          <div className="border border-slate-200 bg-slate-50 p-2.5">
            <span className="text-[11px] text-slate-600 font-bold uppercase">P10 (Severe Under-forecast)</span>
            <div className="text-lg font-bold text-slate-900 mt-1">{summary.errorQuantiles.p10.toLocaleString()} MW</div>
            <span className="text-[10px] text-slate-500">10% of errors fall below this value</span>
          </div>

          <div className="border border-slate-200 bg-slate-50 p-2.5">
            <span className="text-[11px] text-slate-600 font-bold uppercase">P50 (Median Systematic Error)</span>
            <div className="text-lg font-bold text-slate-900 mt-1">+{summary.errorQuantiles.p50.toLocaleString()} MW</div>
            <span className="text-[10px] text-slate-500">Median error across all trading hours</span>
          </div>

          <div className="border border-slate-200 bg-slate-50 p-2.5">
            <span className="text-[11px] text-amber-800 font-bold uppercase">P90 (Severe Shortfall Risk)</span>
            <div className="text-lg font-bold text-amber-900 mt-1">+{summary.errorQuantiles.p90.toLocaleString()} MW</div>
            <span className="text-[10px] text-slate-500">90% of shortfalls fall below this threshold</span>
          </div>
        </div>
      </div>

      {/* Diurnal Error Profile Chart */}
      <div className="bg-white border border-slate-300">
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Diurnal Forecast Error Profile by Hour of Day
          </h3>
          <p className="text-[11px] text-slate-600 font-mono">
            MAE and Mean Bias across each hour of the 24-hour cycle auditing intra-day diurnal patterns
          </p>
        </div>

        <div className="p-4">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={diurnalProfile} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="#cbd5e1" />
                <XAxis dataKey="hourOfDay" stroke="#475569" tickFormatter={h => `${h}:00`} fontSize={11} tickLine={true} />
                <YAxis stroke="#475569" fontSize={11} tickFormatter={v => `${(v / 1000).toFixed(0)}k MW`} tickLine={true} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #94a3b8',
                    borderRadius: 0,
                    padding: '8px 12px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    boxShadow: 'none'
                  }}
                  formatter={(val, name) => [`${Number(val).toLocaleString()} MW`, name]}
                  labelFormatter={h => `Delivery Hour ${h}:00 - ${Number(h) + 1}:00`}
                />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                <Bar dataKey="maeMW" name="MAE (MW)" fill="#1e3a8a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="meanBiasMW" name="Mean Bias (MW)" fill="#b45309" radius={[0, 0, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Lead-Time Degradation Curve */}
      <div className="bg-white border border-slate-300">
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Forecast Accuracy Degradation vs Lead Time Horizon
          </h3>
          <p className="text-[11px] text-slate-600 font-mono">
            Auditing 18,015 forward forecast records across lead horizons from 0.5h to 66.5h ahead of delivery
          </p>
        </div>

        <div className="p-4">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={leadTimeCurve} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="#cbd5e1" />
                <XAxis dataKey="leadTimeBin" stroke="#475569" fontSize={11} tickLine={true} />
                <YAxis stroke="#475569" fontSize={11} tickFormatter={v => `${(v / 1000).toFixed(0)}k MW`} tickLine={true} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #94a3b8',
                    borderRadius: 0,
                    padding: '8px 12px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    boxShadow: 'none'
                  }}
                  formatter={(val, name) => [`${Number(val).toLocaleString()} MW`, name]}
                />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                <Line
                  type="monotone"
                  dataKey="maeMW"
                  name="MAE by Horizon (MW)"
                  stroke="#0f172a"
                  strokeWidth={2.5}
                  dot={{ r: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="rmseMW"
                  name="RMSE by Horizon (MW)"
                  stroke="#475569"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
