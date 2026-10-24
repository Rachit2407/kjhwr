import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
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
      <div className="flex h-72 items-center justify-center border border-slate-300 bg-white">
        <span className="text-xs font-mono text-slate-600 uppercase tracking-wider">
          Simulating Out-of-Sample Procurement Buffer across 744 Settlement Hours...
        </span>
      </div>
    );
  }

  if (error && !overallSim) {
    return (
      <div className="p-4 bg-red-50 border border-red-300 text-red-900 font-mono text-xs">
        <div className="font-bold uppercase tracking-wider mb-1">Procurement Simulation Failure:</div>
        <div>{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Parameter Control Panel */}
      <div className="bg-white border border-slate-300 p-3 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-2">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Day-Ahead Power Procurement & Rolling Risk Buffer Calibration
            </h2>
            <p className="text-[11px] text-slate-600 font-mono mt-0.5">
              Calibrating an out-of-sample rolling shortfall buffer (D-2) to hedge against wind forecasting deficit
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">Cutoff:</label>
            <select
              value={selectedCutoff}
              onChange={e => onCutoffChange(e.target.value)}
              className="border border-slate-300 bg-white px-2.5 py-1 text-xs font-mono font-medium text-slate-900 focus:outline-none focus:border-blue-700"
            >
              <option value="9">09:00 UTC</option>
              <option value="11">11:00 UTC (GB DAM Benchmark)</option>
              <option value="12">12:00 UTC</option>
              <option value="14">14:00 UTC</option>
              <option value="17">17:00 UTC</option>
              <option value="23">23:00 UTC</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <div className="flex justify-between items-center text-[11px] font-semibold text-slate-700 uppercase mb-1">
              <span>Consumer Demand:</span>
              <span className="font-mono text-blue-900 font-bold">{demand.toLocaleString()} MW</span>
            </div>
            <input
              type="range"
              min="15000"
              max="45000"
              step="1000"
              value={demand}
              onChange={e => setDemand(Number(e.target.value))}
              className="w-full accent-blue-900 cursor-pointer"
            />
            <span className="text-[10px] text-slate-500 font-mono block mt-0.5">SYNTHETIC UTILITY LOAD</span>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
              Risk Confidence Quantile
            </label>
            <div className="flex border border-slate-300">
              {[0.80, 0.90, 0.95].map(q => (
                <button
                  key={q}
                  onClick={() => setQuantile(q)}
                  className={`flex-1 py-1 text-xs font-mono font-bold transition-none ${
                    quantile === q
                      ? 'bg-blue-900 text-white'
                      : 'bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  P{Math.round(q * 100)}
                </button>
              ))}
            </div>
            <span className="text-[10px] text-slate-500 font-mono block mt-1">SHORTFALL HEDGE TARGET</span>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
              Delivery Date Case Study
            </label>
            <input
              type="date"
              min="2026-01-02"
              max="2026-02-01"
              value={simDate}
              onChange={e => setSimDate(e.target.value)}
              className="w-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-mono font-medium text-slate-900 focus:outline-none focus:border-blue-700"
            />
            <span className="text-[10px] text-slate-500 font-mono block mt-1">CASE DAYS: JAN 15, JAN 12, JAN 28</span>
          </div>

          <div className="flex flex-col justify-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={biasCorrection}
                onChange={e => setBiasCorrection(e.target.checked)}
                className="w-4 h-4 text-blue-900 rounded-none border-slate-400"
              />
              <span className="text-xs font-bold text-slate-800 uppercase">
                Separate Rolling Bias
              </span>
            </label>
            <span className="text-[10px] text-slate-500 font-mono mt-1 leading-tight">
              Diagnostic reframing: shrinks buffer & increases base thermal; hedged volume identical
            </span>
          </div>
        </div>
      </div>

      {/* Out-of-Sample Calibration Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-300 p-3">
          <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
            Overall Realized Coverage
          </div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {overallSim.overallCoveragePercent}%
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] font-mono text-slate-600">
            NOMINAL: P{Math.round(overallSim.riskQuantile * 100)} ({overallSim.totalEvaluatedHours} TOTAL HOURS)
          </div>
        </div>

        <div className="bg-white border border-slate-300 p-3">
          <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
            Post-Warmup Coverage
          </div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-blue-900">
            {overallSim.postWarmupCoveragePercent}%
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] font-mono text-slate-600">
            JAN 9 – FEB 1 (EXCLUDING WEEK 1 WARM-UP)
          </div>
        </div>

        <div className="bg-white border border-slate-300 p-3">
          <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
            Average Rolling Risk Buffer
          </div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {overallSim.averageBufferMW.toLocaleString()} <span className="text-xs font-normal text-slate-500 font-sans">MW</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] font-mono text-slate-600">
            {biasCorrection ? 'DE-BIASED BUFFER VOLUME' : 'NOMINAL BUFFER VOLUME'}
          </div>
        </div>

        <div className="bg-white border border-slate-300 p-3">
          <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
            Mean Uncovered Shortfall
          </div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-rose-800">
            {overallSim.meanUncoveredShortfallMW.toLocaleString()} <span className="text-xs font-normal text-slate-500 font-sans">MW</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] font-mono text-slate-600">
            AVERAGE DEFICIT IN BREACH HOURS
          </div>
        </div>
      </div>

      {/* Weekly Calibration Table */}
      <div className="bg-white border border-slate-300">
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Weekly Out-of-Sample Calibration & Learning Curve
            </h3>
            <p className="text-[11px] text-slate-600 font-mono">
              Coverage stabilizes toward the nominal target as historical rolling window expands (D-2)
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-500 uppercase">
            STRICT ZERO DATA LEAKAGE
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider text-[11px] border-b border-slate-300">
              <tr>
                <th className="py-2 px-3 border-r border-slate-200">Period</th>
                <th className="py-2 px-3 border-r border-slate-200">Start Date</th>
                <th className="py-2 px-3 border-r border-slate-200">End Date</th>
                <th className="py-2 px-3 border-r border-slate-200 text-right">Realized Coverage</th>
                <th className="py-2 px-3 border-r border-slate-200 text-right">Average Buffer (MW)</th>
                <th className="py-2 px-3">Calibration Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {overallSim.weeklyBreakdown.map((w, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="py-1.5 px-3 border-r border-slate-200 font-bold text-slate-900">{w.week}</td>
                  <td className="py-1.5 px-3 border-r border-slate-200 text-slate-600">{w.startDate}</td>
                  <td className="py-1.5 px-3 border-r border-slate-200 text-slate-600">{w.endDate}</td>
                  <td className="py-1.5 px-3 border-r border-slate-200 text-right font-bold text-slate-900">{w.realizedCoveragePercent}%</td>
                  <td className="py-1.5 px-3 border-r border-slate-200 text-right text-slate-700">{w.avgBufferMW.toLocaleString()} MW</td>
                  <td className="py-1.5 px-3">
                    {idx === 0 ? (
                      <span className="text-[10px] font-bold text-amber-900 bg-amber-50 border border-amber-300 px-1.5 py-0.5 uppercase">
                        Early Warm-up (7-Day History)
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-900 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 uppercase">
                        Fully Calibrated
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Day Simulation Section */}
      {daySim && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-300 p-3 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Delivery Day Simulation: {daySim.date}
                </h3>
                <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 border ${
                  daySim.dayCoveragePercent === 100.0
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                    : daySim.dayCoveragePercent >= 80.0
                    ? 'bg-blue-50 text-blue-900 border-blue-300'
                    : 'bg-rose-50 text-rose-900 border-rose-300'
                }`}>
                  {daySim.dayCoveragePercent}% REALIZED COVERAGE
                </span>
              </div>
              <p className="text-[11px] text-slate-600 font-mono mt-0.5">
                Baseline Demand: {daySim.demandMW.toLocaleString()} MW | Average Buffer Volume: {daySim.avgBufferMW.toLocaleString()} MW
              </p>
            </div>

            <div className="text-right text-xs font-mono text-slate-700">
              SHORTFALL BREACHES: <span className="font-bold">{daySim.hours.filter(h => !h.isCovered).length}</span> / 24 HOURS
            </div>
          </div>

          {/* Hourly Procurement Stack Chart */}
          <div className="bg-white border border-slate-300">
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Hourly Procurement Stack (Base Thermal + Risk Buffer vs Actual Residual Demand)
              </h4>
              <p className="text-[11px] text-slate-600 font-mono">
                Total Hedged = Base Procurement + Dynamic Risk Buffer. Imbalance = Total Hedged - Actual Residual Demand.
              </p>
            </div>

            <div className="p-4">
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={daySim.hours} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
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
                      labelFormatter={h => `Settlement Hour ${h}:00`}
                    />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                    <Line type="monotone" dataKey="totalProcuredMW" name="Total Hedged Procurement (MW)" stroke="#0f172a" strokeWidth={2.5} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="actualResidualDemandMW" name="Actual Residual Demand (MW)" stroke="#b91c1c" strokeWidth={2} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="baseProcurementMW" name="Base Thermal Procurement (MW)" stroke="#475569" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
                    <Line type="monotone" dataKey="riskBufferMW" name="Risk Buffer Volume (MW)" stroke="#b45309" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Net Imbalance Position Chart */}
          <div className="bg-white border border-slate-300">
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Net Imbalance Position by Hour (Surplus vs Deficit Exposure)
              </h4>
              <p className="text-[11px] text-slate-600 font-mono">
                Positive = Utility net long (cashout surplus). Negative = Shortfall breach (penal cashout short).
              </p>
            </div>

            <div className="p-4">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={daySim.hours} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
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
                      formatter={(val) => [`${Number(val).toLocaleString()} MW`, 'Net Imbalance']}
                      labelFormatter={h => `Delivery Hour ${h}:00`}
                    />
                    <ReferenceLine y={0} stroke="#1e293b" strokeWidth={1.5} />
                    <Bar
                      dataKey="netImbalanceMW"
                      name="Net Imbalance (MW)"
                      fill="#15803d"
                      radius={[0, 0, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Hourly Procurement Ledger Table */}
          <div className="bg-white border border-slate-300">
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Hourly Procurement Ledger & Cashout Settlement Breakdown
                </h4>
                <p className="text-[11px] text-slate-600 font-mono">
                  Accounting of wind actuals, forecast, risk buffer, total hedged volume, and net settlement exposure
                </p>
              </div>
              <span className="text-[11px] font-mono text-slate-500 uppercase">Delivery Date: {daySim.date}</span>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead className="bg-slate-100 text-slate-700 sticky top-0 z-10 border-b border-slate-300 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-2 px-3 border-r border-slate-200">Hour</th>
                    <th className="py-2 px-3 border-r border-slate-200 text-right">Actual Wind</th>
                    <th className="py-2 px-3 border-r border-slate-200 text-right">Forecast Wind</th>
                    <th className="py-2 px-3 border-r border-slate-200 text-right">Base Procured</th>
                    <th className="py-2 px-3 border-r border-slate-200 text-right">Risk Buffer</th>
                    <th className="py-2 px-3 border-r border-slate-200 text-right">Total Hedged</th>
                    <th className="py-2 px-3 border-r border-slate-200 text-right">Net Imbalance</th>
                    <th className="py-2 px-3 border-r border-slate-200">Wind Regime</th>
                    <th className="py-2 px-3">Coverage Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {daySim.hours.map(h => (
                    <tr key={h.hour} className="hover:bg-slate-50">
                      <td className="py-1.5 px-3 border-r border-slate-200 font-bold text-slate-900">{h.hour}:00</td>
                      <td className="py-1.5 px-3 border-r border-slate-200 text-right text-slate-900 font-bold">{h.actualWindMW.toLocaleString()} MW</td>
                      <td className="py-1.5 px-3 border-r border-slate-200 text-right text-amber-800">{h.forecastWindMW.toLocaleString()} MW</td>
                      <td className="py-1.5 px-3 border-r border-slate-200 text-right text-slate-700">{h.baseProcurementMW.toLocaleString()} MW</td>
                      <td className="py-1.5 px-3 border-r border-slate-200 text-right text-blue-900 font-bold">{h.riskBufferMW.toLocaleString()} MW</td>
                      <td className="py-1.5 px-3 border-r border-slate-200 text-right text-slate-900 font-bold">{h.totalProcuredMW.toLocaleString()} MW</td>
                      <td className={`py-1.5 px-3 border-r border-slate-200 text-right font-bold ${h.netImbalanceMW >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
                        {h.netImbalanceMW >= 0 ? `+${h.netImbalanceMW.toLocaleString()}` : h.netImbalanceMW.toLocaleString()} MW
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-200">
                        <span className={`text-[10px] px-1.5 py-0.5 border font-bold uppercase ${
                          h.regime.includes('High')
                            ? 'bg-blue-50 text-blue-900 border-blue-300'
                            : 'bg-slate-100 text-slate-800 border-slate-300'
                        }`}>
                          {h.regime}
                        </span>
                      </td>
                      <td className="py-1.5 px-3">
                        {h.isCovered ? (
                          <span className="text-[10px] font-bold text-emerald-900 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 uppercase">
                            Covered
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-rose-900 bg-rose-50 border border-rose-300 px-1.5 py-0.5 uppercase">
                            Breach (-{h.shortfallMW.toLocaleString()} MW)
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
