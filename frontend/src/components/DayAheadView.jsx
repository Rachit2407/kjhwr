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
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
        <p className="font-semibold text-sm">Error loading Day-Ahead data:</p>
        <p className="text-xs mt-0.5">{error}</p>
      </div>
    );
  }

  const { deliveryDate, decisionDate, cutoffHour, cutoffRule, kpis, hourly, halfHourlyActuals } = data;
  const samplePublishTime = hourly[0]?.publishTime || 'N/A';

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Delivery Date (Day D)
            </label>
            <div className="flex items-center gap-2 bg-white border border-slate-300 px-3 py-1.5 rounded-md text-sm text-slate-800 shadow-xs">
              <Calendar className="w-4 h-4 text-blue-700" />
              <input
                type="date"
                min="2026-01-02"
                max="2026-02-01"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="bg-transparent focus:outline-none text-slate-800 font-medium text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Decision Cutoff on Day D-1
            </label>
            <div className="flex items-center gap-2 bg-white border border-slate-300 px-3 py-1.5 rounded-md text-sm shadow-xs">
              <Clock className="w-4 h-4 text-blue-700" />
              <select
                value={selectedCutoff}
                onChange={e => onCutoffChange(e.target.value)}
                className="bg-transparent focus:outline-none text-slate-800 font-medium text-sm"
              >
                <option value="9">09:00 UTC (Early morning)</option>
                <option value="11">11:00 UTC (Assumed GB DAM Benchmark)</option>
                <option value="12">12:00 UTC (Midday auction close)</option>
                <option value="14">14:00 UTC (Afternoon revision)</option>
                <option value="17">17:00 UTC (Evening review)</option>
                <option value="23">23:00 UTC (End of Day D-1)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Vintage & Scope Badge */}
        <div className="flex flex-col sm:items-end">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded text-xs">
            <span className="font-semibold text-slate-700">Cutoff Vintage:</span>
            <span className="font-mono text-blue-700 font-semibold">{samplePublishTime}</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1">
            Decision: {decisionDate} | Delivery: {deliveryDate} (Lead: 14.5h–37.5h)
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Actual Generation
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-slate-900">
            {kpis.totalActualMWh.toLocaleString()} <span className="text-xs font-normal text-slate-500">MWh</span>
          </div>
          <div className="mt-1 text-xs text-slate-500 flex items-center justify-between">
            <span>Peak: {kpis.peakActualMW.toLocaleString()} MW</span>
            <span>Min: {kpis.minActualMW.toLocaleString()} MW</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Day-Ahead Forecast
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-slate-900">
            {kpis.totalForecastMWh.toLocaleString()} <span className="text-xs font-normal text-slate-500">MWh</span>
          </div>
          <div className="mt-1 text-xs text-slate-500 flex items-center justify-between">
            <span>Peak: {kpis.peakForecastMW.toLocaleString()} MW</span>
            <span>Min: {kpis.minForecastMW.toLocaleString()} MW</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Daily Mean Absolute Error
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-slate-900">
            {kpis.dayMaeMW.toLocaleString()} <span className="text-xs font-normal text-slate-500">MW</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Average hourly miss for {deliveryDate}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Net Energy Deviation
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-slate-900 flex items-center gap-1.5">
            <span>{(kpis.totalForecastMWh - kpis.totalActualMWh).toLocaleString()}</span>
            <span className="text-xs font-normal text-slate-500">MWh</span>
            {kpis.totalForecastMWh >= kpis.totalActualMWh ? (
              <span className="text-xs font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 ml-auto">
                Over-forecast
              </span>
            ) : (
              <span className="text-xs font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 ml-auto">
                Under-forecast
              </span>
            )}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Forecast vs Actual delivery total
          </div>
        </div>
      </div>

      {/* Main Timeline Chart */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Hourly Wind Generation & Day-Ahead Forecast Timeline
            </h3>
            <p className="text-xs text-slate-500">
              Comparing actual settlement generation against National Grid ESO forecast published prior to cutoff
            </p>
          </div>

          <button
            onClick={() => setShowGranular(!showGranular)}
            className="flex items-center gap-1.5 text-xs font-medium bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-2.5 py-1.5 rounded shadow-xs transition-colors"
          >
            <Layers className="w-3.5 h-3.5 text-slate-600" />
            <span>{showGranular ? 'Hide 48-Period Actuals' : 'View 48 Half-Hourly Actuals'}</span>
          </button>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={hourly} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="hour" stroke="#64748b" tickFormatter={h => `${h}:00`} fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '6px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                formatter={(val, name) => [`${Number(val).toLocaleString()} MW`, name]}
                labelFormatter={h => `Delivery Hour ${h}:00 - ${Number(h) + 1}:00`}
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px' }} />
              <Line
                type="monotone"
                dataKey="actualMW"
                name="Actual Wind (MW)"
                stroke="#1e3a8a"
                strokeWidth={2.5}
                dot={{ r: 2 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="forecastMW"
                name="Day-Ahead Forecast (MW)"
                stroke="#d97706"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 2 }}
              />
              <Line
                type="monotone"
                dataKey="baseline48h"
                name="Baseline: t-48h (MW)"
                stroke="#64748b"
                strokeWidth={1.5}
                strokeDasharray="2 2"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Optional: 48 Settlement Periods (Half-Hourly) Chart */}
      {showGranular && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-3">
          <div className="border-b border-slate-100 pb-2">
            <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
              High-Resolution Settlement Periods (48 x 30-Min Actuals from FUELHH)
            </h4>
            <p className="text-xs text-slate-500">
              Each hourly actual is reconciled as the average of two adjacent settlement periods: (SP_1 + SP_2) / 2
            </p>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={halfHourlyActuals} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="settlementPeriod" stroke="#64748b" fontSize={10} tickLine={false} interval={3} tickFormatter={sp => `SP${sp}`} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '6px', fontSize: '12px' }}
                  formatter={(val) => [`${Number(val).toLocaleString()} MW`, 'Actual Generation']}
                  labelFormatter={(sp, arr) => `Settlement Period ${sp} (${arr[0]?.payload?.time})`}
                />
                <Bar dataKey="actualMW" name="30-Min Actual (MW)" fill="#2563eb" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Detailed Settlement Schedule Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              24-Hour Settlement Schedule & Forecast Vintages
            </h3>
            <p className="text-xs text-slate-500">
              Hourly reconciliation of Elexon FUELHH actuals vs cutoff-locked WINDFOR forecast
            </p>
          </div>
          <span className="text-xs text-slate-500 font-mono">Date: {deliveryDate}</span>
        </div>

        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 sticky top-0 z-10 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Hour</th>
                <th className="py-2.5 px-3">Start Time (UTC)</th>
                <th className="py-2.5 px-3 text-right">Actual (MW)</th>
                <th className="py-2.5 px-3 text-right">Forecast (MW)</th>
                <th className="py-2.5 px-3 text-right">Error (MW)</th>
                <th className="py-2.5 px-3">Published Vintage</th>
                <th className="py-2.5 px-3 text-right">Lead (h)</th>
                <th className="py-2.5 px-3 text-right">Baseline t-48h</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {hourly.map(r => {
                const err = r.errorMW;
                const isShortfall = err > 0;
                return (
                  <tr key={r.hour} className="hover:bg-blue-50/40 transition-colors">
                    <td className="py-2 px-3 font-semibold text-slate-900">{r.hour}:00</td>
                    <td className="py-2 px-3 text-slate-600">{r.startTime.slice(11, 16)}Z</td>
                    <td className="py-2 px-3 text-right text-slate-900 font-bold">{r.actualMW.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right text-amber-700 font-semibold">{r.forecastMW.toLocaleString()}</td>
                    <td className={`py-2 px-3 text-right font-semibold ${isShortfall ? 'text-rose-700' : 'text-emerald-700'}`}>
                      {isShortfall ? `+${err.toLocaleString()}` : err.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-slate-600 font-sans">{r.publishTime.replace('T', ' ').slice(0, 16)}Z</td>
                    <td className="py-2 px-3 text-right text-slate-600">{r.leadTimeHours}h</td>
                    <td className="py-2 px-3 text-right text-slate-500">{r.baseline48h?.toLocaleString() || 'N/A'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
