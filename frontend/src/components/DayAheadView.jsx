import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { Calendar, Clock, Wind, AlertCircle, ArrowUpRight, ArrowDownRight, Layers } from 'lucide-react';
import { fetchDayAhead } from '../api';

export default function DayAheadView({ selectedCutoff, onCutoffChange }) {
  const [date, setDate] = useState('2026-01-15');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showGranular, setShowGranular] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchDayAhead(date, selectedCutoff)
      .then(res => {
        if (active) {
          setData(res);
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
  }, [date, selectedCutoff]);

  if (loading && !data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-6 bg-red-950/40 border border-red-800 rounded-xl text-red-200">
        <p className="font-semibold">Error loading Day-Ahead data:</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  const { deliveryDate, decisionDate, cutoffHour, cutoffRule, kpis, hourly, halfHourlyActuals } = data;
  const samplePublishTime = hourly[0]?.publishTime || 'N/A';

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
              Delivery Date (Day D)
            </label>
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 px-3 py-2 rounded-lg text-sm text-slate-200">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <input
                type="date"
                min="2026-01-02"
                max="2026-02-01"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="bg-transparent focus:outline-none text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
              Day-Ahead Decision Cutoff on D-1
            </label>
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 px-3 py-2 rounded-lg text-sm">
              <Clock className="w-4 h-4 text-cyan-400" />
              <select
                value={selectedCutoff}
                onChange={e => onCutoffChange(e.target.value)}
                className="bg-transparent focus:outline-none text-slate-200"
              >
                <option value="9" className="bg-slate-900">09:00 UTC (Early trading)</option>
                <option value="11" className="bg-slate-900">11:00 UTC (Assumed GB DAM benchmark)</option>
                <option value="12" className="bg-slate-900">12:00 UTC (Midday auction close)</option>
                <option value="14" className="bg-slate-900">14:00 UTC (Afternoon revision)</option>
                <option value="17" className="bg-slate-900">17:00 UTC (Evening review)</option>
                <option value="23" className="bg-slate-900">23:00 UTC (End of Day D-1)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Vintage & Scope Badge */}
        <div className="flex flex-col items-end">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-700/60 text-xs text-cyan-300">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <span>Forecast Vintage Selected: Published ≤ {decisionDate}T{String(cutoffHour).padStart(2, '0')}:00Z</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1">
            Latest actual run at cutoff: {samplePublishTime}
          </span>
        </div>
      </div>

      {/* KPI Headline Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex justify-between items-center text-slate-400 text-xs uppercase tracking-wider">
            <span>Peak Wind Generation</span>
            <Wind className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-100">
            {kpis.peakActualMW.toLocaleString()} <span className="text-sm font-normal text-slate-400">MW</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Forecasted: {kpis.peakForecastMW.toLocaleString()} MW
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex justify-between items-center text-slate-400 text-xs uppercase tracking-wider">
            <span>Minimum Wind Output</span>
            <ArrowDownRight className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-100">
            {kpis.minActualMW.toLocaleString()} <span className="text-sm font-normal text-slate-400">MW</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Forecasted: {kpis.minForecastMW.toLocaleString()} MW
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex justify-between items-center text-slate-400 text-xs uppercase tracking-wider">
            <span>Day-Ahead MAE</span>
            <AlertCircle className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-100">
            {kpis.dayMaeMW.toLocaleString()} <span className="text-sm font-normal text-slate-400">MW</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Mean Absolute Error for this delivery day
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex justify-between items-center text-slate-400 text-xs uppercase tracking-wider">
            <span>Total Delivered Wind Energy</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-400">
            {(kpis.totalActualMWh / 1000).toFixed(1)} <span className="text-sm font-normal text-slate-400">GWh</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Expected at cutoff: {(kpis.totalForecastMWh / 1000).toFixed(1)} GWh
          </div>
        </div>
      </div>

      {/* Main Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">
              Day-Ahead Power Dispatch Timeline: {deliveryDate}
            </h2>
            <p className="text-xs text-slate-400">
              Comparing Actual Wind Generation against the Latest Forecast available at {cutoffHour}:00 UTC on {decisionDate}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowGranular(!showGranular)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                showGranular
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              {showGranular ? 'Showing 48 Settlement Periods' : 'Show 48 Half-Hourly Periods'}
            </button>
          </div>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={showGranular ? halfHourlyActuals : hourly} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey={showGranular ? "time" : "hour"}
                stroke="#64748b"
                tickFormatter={val => showGranular ? val : `${val}:00`}
                fontSize={12}
              />
              <YAxis
                stroke="#64748b"
                fontSize={12}
                tickFormatter={val => `${(val / 1000).toFixed(0)}k`}
                unit=" MW"
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                labelFormatter={l => showGranular ? `Settlement Time: ${l}` : `Hour ${l}:00 UTC`}
                formatter={(val, name) => [`${Number(val).toLocaleString()} MW`, name]}
              />
              <Legend wrapperStyle={{ paddingTop: '10px' }} />
              <Line
                type="monotone"
                dataKey="actualMW"
                name="Actual Wind Generation"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={false}
              />
              {!showGranular && (
                <>
                  <Line
                    type="monotone"
                    dataKey="forecastMW"
                    name={`Forecast at ${cutoffHour}:00 Cutoff`}
                    stroke="#06b6d4"
                    strokeWidth={2.5}
                    strokeDasharray="4 4"
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="baseline48h"
                    name="Naive Baseline (t-48h)"
                    stroke="#a855f7"
                    strokeWidth={1.5}
                    strokeDasharray="2 2"
                    dot={false}
                  />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Forecast Error / Shortfall Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-200 mb-1">
          Hourly Forecast Miss: Over-forecast (+) vs Under-forecast (-)
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Positive values (amber) indicate wind shortfall (forcing emergency balancing purchases). Negative values indicate wind surplus.
        </p>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourly} margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="hour" stroke="#64748b" tickFormatter={h => `${h}:00`} fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} unit=" MW" />
              <ReferenceLine y={0} stroke="#475569" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                formatter={(val) => [`${Number(val).toLocaleString()} MW`, 'Error (Forecast - Actual)']}
                labelFormatter={h => `Hour ${h}:00`}
              />
              <Bar
                dataKey="errorMW"
                name="Error MW"
                fill="#f59e0b"
                shape={(props) => {
                  const { fill, x, y, width, height, value } = props;
                  const color = value > 0 ? '#f59e0b' : '#3b82f6';
                  return <rect x={x} y={y} width={width} height={height} fill={color} rx={2} />;
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Hourly Data Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <h3 className="text-sm font-semibold text-slate-200">
            24-Hour Settlement Schedule & Forecast Vintages
          </h3>
          <span className="text-xs text-slate-400">
            All timestamps UTC
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Hour (UTC)</th>
                <th className="py-3 px-4">Actual (MW)</th>
                <th className="py-3 px-4">Forecast (MW)</th>
                <th className="py-3 px-4">Error (MW)</th>
                <th className="py-3 px-4">Lead Time</th>
                <th className="py-3 px-4">Vintage Published</th>
                <th className="py-3 px-4">Baseline (t-48h)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {hourly.map(r => (
                <tr key={r.hour} className="hover:bg-slate-800/30">
                  <td className="py-2.5 px-4 font-mono font-medium">{String(r.hour).padStart(2, '0')}:00</td>
                  <td className="py-2.5 px-4 text-emerald-400 font-mono">{r.actualMW.toLocaleString()}</td>
                  <td className="py-2.5 px-4 text-cyan-400 font-mono">{r.forecastMW.toLocaleString()}</td>
                  <td className={`py-2.5 px-4 font-mono font-medium ${r.errorMW > 0 ? 'text-amber-400' : 'text-blue-400'}`}>
                    {r.errorMW > 0 ? `+${r.errorMW.toLocaleString()}` : r.errorMW.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 text-slate-400">{r.leadTimeHours}h</td>
                  <td className="py-2.5 px-4 text-slate-400 font-mono text-[11px]">{r.publishTime}</td>
                  <td className="py-2.5 px-4 text-slate-400 font-mono">{r.baseline48h ? r.baseline48h.toLocaleString() : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
