import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
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
      <div className="flex h-72 items-center justify-center border border-slate-300 bg-white">
        <span className="text-xs font-mono text-slate-600 uppercase tracking-wider">
          Loading Settlement Period & Forecast Data...
        </span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-4 bg-red-50 border border-red-300 text-red-900 font-mono text-xs">
        <div className="font-bold uppercase tracking-wider mb-1">Data Retrieval Failure:</div>
        <div>{error}</div>
      </div>
    );
  }

  const { deliveryDate, decisionDate, cutoffHour, cutoffRule, kpis, hourly, halfHourlyActuals } = data;
  const samplePublishTime = hourly[0]?.publishTime || 'N/A';
  const overUnderMWh = kpis.totalForecastMWh - kpis.totalActualMWh;

  return (
    <div className="space-y-4">
      {/* Control Strip */}
      <div className="bg-white border border-slate-300 p-3 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-6 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Delivery Date (Day D)
            </label>
            <input
              type="date"
              min="2026-01-02"
              max="2026-02-01"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="border border-slate-300 bg-white px-2.5 py-1 text-xs font-mono font-medium text-slate-900 focus:outline-none focus:border-blue-700"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Trading Cutoff on Day D-1
            </label>
            <select
              value={selectedCutoff}
              onChange={e => onCutoffChange(e.target.value)}
              className="border border-slate-300 bg-white px-2.5 py-1 text-xs font-mono font-medium text-slate-900 focus:outline-none focus:border-blue-700"
            >
              <option value="9">09:00 UTC (Early morning desk run)</option>
              <option value="11">11:00 UTC (Assumed GB DAM Benchmark)</option>
              <option value="12">12:00 UTC (Midday auction close)</option>
              <option value="14">14:00 UTC (Afternoon revision)</option>
              <option value="17">17:00 UTC (Evening review)</option>
              <option value="23">23:00 UTC (End of Day D-1)</option>
            </select>
          </div>
        </div>

        {/* Vintage Accounting Strip */}
        <div className="text-right text-xs font-mono">
          <div className="text-slate-800 font-semibold">
            SELECTED FORECAST VINTAGE: <span className="text-blue-900 font-bold">{samplePublishTime}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            DECISION: {decisionDate} | DELIVERY: {deliveryDate} (LEAD: 14.5h–37.5h)
          </div>
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-300 p-3">
          <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
            Total Actual Generation
          </div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {kpis.totalActualMWh.toLocaleString()} <span className="text-xs font-normal text-slate-500 font-sans">MWh</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] font-mono text-slate-600 flex justify-between">
            <span>PEAK: {kpis.peakActualMW.toLocaleString()} MW</span>
            <span>MIN: {kpis.minActualMW.toLocaleString()} MW</span>
          </div>
        </div>

        <div className="bg-white border border-slate-300 p-3">
          <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
            Day-Ahead Forecast
          </div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {kpis.totalForecastMWh.toLocaleString()} <span className="text-xs font-normal text-slate-500 font-sans">MWh</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] font-mono text-slate-600 flex justify-between">
            <span>PEAK: {kpis.peakForecastMW.toLocaleString()} MW</span>
            <span>MIN: {kpis.minForecastMW.toLocaleString()} MW</span>
          </div>
        </div>

        <div className="bg-white border border-slate-300 p-3">
          <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
            Daily Mean Absolute Error
          </div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {kpis.dayMaeMW.toLocaleString()} <span className="text-xs font-normal text-slate-500 font-sans">MW</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] font-mono text-slate-600">
            DELIVERY DAY HOURLY ERROR AVERAGE
          </div>
        </div>

        <div className="bg-white border border-slate-300 p-3">
          <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
            Net Energy Deviation
          </div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900 flex items-center justify-between">
            <span>{Math.abs(overUnderMWh).toLocaleString()} <span className="text-xs font-normal text-slate-500 font-sans">MWh</span></span>
            <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 border ${
              overUnderMWh >= 0
                ? 'bg-amber-50 text-amber-900 border-amber-300'
                : 'bg-blue-50 text-blue-900 border-blue-300'
            }`}>
              {overUnderMWh >= 0 ? 'OVER-FORECAST' : 'UNDER-FORECAST'}
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] font-mono text-slate-600">
            NET IMBALANCE VOLUME ACROSS 24 HOURS
          </div>
        </div>
      </div>

      {/* Main Delivery Day Chart Panel */}
      <div className="bg-white border border-slate-300">
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Hourly Generation Timeline & Day-Ahead Forecast Benchmark
            </h3>
            <p className="text-[11px] text-slate-600 font-mono">
              FUELHH Wind Generation vs National Grid ESO WINDFOR published prior to {selectedCutoff}:00 UTC cutoff
            </p>
          </div>

          <button
            onClick={() => setShowGranular(!showGranular)}
            className="border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-[11px] font-mono px-2 py-1 transition-none"
          >
            {showGranular ? '[ HIDE 48 HALF-HOURLY PERIODS ]' : '[ SHOW 48 HALF-HOURLY PERIODS ]'}
          </button>
        </div>

        <div className="p-4">
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={hourly} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="#cbd5e1" />
                <XAxis dataKey="hour" stroke="#475569" tickFormatter={h => `${h}:00`} fontSize={11} tickLine={true} />
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
                  labelFormatter={h => `Settlement Hour ${h}:00 - ${Number(h) + 1}:00`}
                />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                <Line
                  type="monotone"
                  dataKey="actualMW"
                  name="Actual Wind Generation (MW)"
                  stroke="#0f172a"
                  strokeWidth={2.5}
                  dot={{ r: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="forecastMW"
                  name="Day-Ahead Forecast (MW)"
                  stroke="#b45309"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="baseline48h"
                  name="Baseline: t - 48h (MW)"
                  stroke="#64748b"
                  strokeWidth={1.5}
                  strokeDasharray="2 2"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Optional: 48 Settlement Periods (Half-Hourly) Chart */}
      {showGranular && (
        <div className="bg-white border border-slate-300">
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              High-Resolution 48 Settlement Periods (Half-Hourly Actuals)
            </h4>
            <p className="text-[11px] text-slate-600 font-mono">
              Raw Elexon FUELHH settlement records auditing intra-hour ramp dynamics
            </p>
          </div>
          <div className="p-4">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={halfHourlyActuals} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#cbd5e1" />
                  <XAxis dataKey="settlementPeriod" stroke="#475569" fontSize={10} tickLine={true} label={{ value: 'Settlement Period (1-48)', position: 'insideBottom', offset: -5, fontSize: 10 }} />
                  <YAxis stroke="#475569" fontSize={10} tickFormatter={v => `${(v / 1000).toFixed(0)}k MW`} tickLine={true} />
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
                    formatter={(val) => [`${Number(val).toLocaleString()} MW`, 'Actual Generation']}
                    labelFormatter={sp => `Settlement Period ${sp}`}
                  />
                  <Line type="monotone" dataKey="actualMW" name="Half-Hourly Generation" stroke="#0f172a" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Hourly Settlement Ledger Table */}
      <div className="bg-white border border-slate-300">
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Hourly Settlement Audit Ledger
            </h4>
            <p className="text-[11px] text-slate-600 font-mono">
              Delivery Date: {deliveryDate} | Trading Cutoff: {selectedCutoff}:00 UTC
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-500 uppercase">
            24 Settlement Intervals
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-mono uppercase tracking-wider text-[11px] border-b border-slate-300">
              <tr>
                <th className="py-2 px-3 border-r border-slate-200">Hour</th>
                <th className="py-2 px-3 border-r border-slate-200">Settlement Periods</th>
                <th className="py-2 px-3 border-r border-slate-200 text-right">Actual Wind (MW)</th>
                <th className="py-2 px-3 border-r border-slate-200 text-right">Day-Ahead Forecast (MW)</th>
                <th className="py-2 px-3 border-r border-slate-200 text-right">Error (Fcst - Act, MW)</th>
                <th className="py-2 px-3 border-r border-slate-200 text-right">Absolute Error (MW)</th>
                <th className="py-2 px-3 border-r border-slate-200 text-right">Baseline t-48h (MW)</th>
                <th className="py-2 px-3">Selected Vintage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono">
              {hourly.map(row => {
                const errorMW = row.forecastMW - row.actualMW;
                const absErrorMW = Math.abs(errorMW);
                return (
                  <tr key={row.hour} className="hover:bg-slate-50">
                    <td className="py-1.5 px-3 border-r border-slate-200 font-bold text-slate-900">
                      {row.hour}:00
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 text-slate-600">
                      SP {row.hour * 2 + 1} & {row.hour * 2 + 2}
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 text-right text-slate-900 font-bold">
                      {row.actualMW.toLocaleString()}
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 text-right text-amber-800">
                      {row.forecastMW.toLocaleString()}
                    </td>
                    <td className={`py-1.5 px-3 border-r border-slate-200 text-right font-bold ${
                      errorMW >= 0 ? 'text-amber-800' : 'text-blue-800'
                    }`}>
                      {errorMW >= 0 ? `+${errorMW.toLocaleString()}` : errorMW.toLocaleString()}
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 text-right text-slate-700">
                      {absErrorMW.toLocaleString()}
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 text-right text-slate-600">
                      {row.baseline48h ? row.baseline48h.toLocaleString() : 'N/A'}
                    </td>
                    <td className="py-1.5 px-3 text-slate-600">
                      {row.publishTime}
                    </td>
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
