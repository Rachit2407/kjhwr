import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { ShieldCheck, Sliders, AlertTriangle, ArrowRight, CheckCircle2, TrendingDown, Calendar } from 'lucide-react';
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
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  if (error && !overallSim) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
        <p className="font-semibold text-sm">Error running procurement simulation:</p>
        <p className="text-xs mt-0.5">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Parameter Control Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-700" />
              <h2 className="text-sm font-semibold text-slate-900">
                Day-Ahead Wholesale Procurement & Out-of-Sample Risk Buffer
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Calibrating a rolling shortfall buffer (D-2) to hedge against wind forecasting error in Day-Ahead power procurement
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Cutoff:</label>
            <select
              value={selectedCutoff}
              onChange={e => onCutoffChange(e.target.value)}
              className="bg-white border border-slate-300 px-3 py-1.5 rounded-md text-xs font-medium text-slate-800 focus:outline-none shadow-xs"
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <div className="flex justify-between items-center text-xs text-slate-700 font-semibold mb-1">
              <span>Consumer Demand (MW):</span>
              <span className="font-mono text-blue-700 font-bold">{demand.toLocaleString()} MW</span>
            </div>
            <input
              type="range"
              min="15000"
              max="45000"
              step="1000"
              value={demand}
              onChange={e => setDemand(Number(e.target.value))}
              className="w-full accent-blue-700 cursor-pointer"
            />
            <span className="text-[11px] text-slate-500">Synthetic utility load assumption</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Risk Confidence Quantile
            </label>
            <div className="flex gap-1.5">
              {[0.80, 0.90, 0.95].map(q => (
                <button
                  key={q}
                  onClick={() => setQuantile(q)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                    quantile === q
                      ? 'bg-blue-700 text-white border-blue-700 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  P{Math.round(q * 100)}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">Shortfall hedge confidence</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Simulation Delivery Date
            </label>
            <div className="flex items-center gap-2 bg-white border border-slate-300 px-3 py-1.5 rounded-md text-sm shadow-xs">
              <Calendar className="w-4 h-4 text-slate-500" />
              <input
                type="date"
                min="2026-01-02"
                max="2026-02-01"
                value={simDate}
                onChange={e => setSimDate(e.target.value)}
                className="bg-transparent focus:outline-none text-slate-800 text-xs font-medium"
              />
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">Jan 15 (100%), Jan 12 (Storm), Jan 28</span>
          </div>

          <div className="flex flex-col justify-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={biasCorrection}
                onChange={e => setBiasCorrection(e.target.checked)}
                className="w-4 h-4 text-blue-700 rounded border-slate-300 focus:ring-blue-600"
              />
              <span className="text-xs font-semibold text-slate-800">
                Separate Rolling Bias
              </span>
            </label>
            <span className="text-[11px] text-slate-500 mt-0.5 leading-snug">
              Diagnostic reframing: shrinks buffer & increases base thermal; total hedged volume identical
            </span>
          </div>
        </div>
      </div>

      {/* Out-of-Sample Calibration Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Overall Realized Coverage
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-slate-900">
            {overallSim.overallCoveragePercent}%
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Target: P{Math.round(overallSim.riskQuantile * 100)} Nominal ({overallSim.totalEvaluatedHours} total hours)
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Post-Warmup Coverage
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-blue-700">
            {overallSim.postWarmupCoveragePercent}%
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Jan 9 – Feb 1 (excluding Week 1 warm-up)
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Average Rolling Risk Buffer
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-slate-900">
            {overallSim.averageBufferMW.toLocaleString()} <span className="text-xs font-normal text-slate-500">MW</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {biasCorrection ? 'De-biased buffer volume' : 'Unadjusted nominal buffer volume'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Mean Uncovered Shortfall
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-rose-700">
            {overallSim.meanUncoveredShortfallMW.toLocaleString()} <span className="text-xs font-normal text-slate-500">MW</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Average residual deficit during breach hours
          </div>
        </div>
      </div>

      {/* Weekly Calibration Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Weekly Out-of-Sample Calibration & Learning Curve
            </h3>
            <p className="text-xs text-slate-500">
              Coverage stabilizes toward the nominal target as the historical training window expands
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500">D-2 Rolling Window</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Period</th>
                <th className="py-2.5 px-3">Start Date</th>
                <th className="py-2.5 px-3">End Date</th>
                <th className="py-2.5 px-3 text-right">Realized Coverage</th>
                <th className="py-2.5 px-3 text-right">Average Buffer (MW)</th>
                <th className="py-2.5 px-3">Operational Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {overallSim.weeklyBreakdown.map((w, idx) => (
                <tr key={idx} className="hover:bg-blue-50/40 transition-colors">
                  <td className="py-2 px-3 font-semibold text-slate-900 font-sans">{w.week}</td>
                  <td className="py-2 px-3 text-slate-600">{w.startDate}</td>
                  <td className="py-2 px-3 text-slate-600">{w.endDate}</td>
                  <td className="py-2 px-3 text-right font-bold text-slate-900">{w.realizedCoveragePercent}%</td>
                  <td className="py-2 px-3 text-right text-slate-700">{w.avgBufferMW.toLocaleString()} MW</td>
                  <td className="py-2 px-3 font-sans">
                    {idx === 0 ? (
                      <span className="text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                        Early Warm-up (Low History)
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                        Calibrated History
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Day Simulation Header */}
      {daySim && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-900">
                  Delivery Day Simulation: {daySim.date}
                </h3>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${
                  daySim.dayCoveragePercent === 100.0
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : daySim.dayCoveragePercent >= 80.0
                    ? 'bg-blue-50 text-blue-800 border-blue-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}>
                  {daySim.dayCoveragePercent}% Realized Coverage
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Baseline Demand: {daySim.demandMW.toLocaleString()} MW | Average Risk Buffer: {daySim.avgBufferMW.toLocaleString()} MW
              </p>
            </div>

            <div className="text-right text-xs text-slate-600 font-mono">
              Breaches: {daySim.hours.filter(h => !h.isCovered).length} / 24 hours
            </div>
          </div>

          {/* Hourly Procurement Stack Chart */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-3">
            <div className="border-b border-slate-100 pb-2">
              <h4 className="text-sm font-semibold text-slate-900">
                Hourly Procurement Stack (Base Thermal + Risk Buffer vs Actual Residual Demand)
              </h4>
              <p className="text-xs text-slate-500">
                Total Hedged = Base Procurement + Dynamic Risk Buffer. Net Imbalance = Total Hedged - Actual Residual Demand.
              </p>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={daySim.hours} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="hour" stroke="#64748b" tickFormatter={h => `${h}:00`} fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '6px', fontSize: '12px' }}
                    formatter={(val, name) => [`${Number(val).toLocaleString()} MW`, name]}
                    labelFormatter={h => `Delivery Hour ${h}:00`}
                  />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey="totalProcuredMW" name="Total Hedged Procurement (MW)" stroke="#1e3a8a" strokeWidth={2.5} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="actualResidualDemandMW" name="Actual Residual Demand (MW)" stroke="#dc2626" strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="baseProcurementMW" name="Base Thermal Procurement (MW)" stroke="#64748b" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
                  <Line type="monotone" dataKey="riskBufferMW" name="Risk Buffer Volume (MW)" stroke="#d97706" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Net Imbalance Position Chart */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-3">
            <div className="border-b border-slate-100 pb-2">
              <h4 className="text-sm font-semibold text-slate-900">
                Net Imbalance Position by Hour (Surplus vs Deficit Exposure)
              </h4>
              <p className="text-xs text-slate-500">
                Positive (Green) = Utility is net long (excess energy to cashout). Negative (Red) = Shortfall breach (penal cashout short).
              </p>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={daySim.hours} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="hour" stroke="#64748b" tickFormatter={h => `${h}:00`} fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '6px', fontSize: '12px' }}
                    formatter={(val) => [`${Number(val).toLocaleString()} MW`, 'Net Imbalance']}
                    labelFormatter={h => `Delivery Hour ${h}:00`}
                  />
                  <ReferenceLine y={0} stroke="#475569" strokeWidth={1.5} />
                  <Bar
                    dataKey="netImbalanceMW"
                    name="Net Imbalance (MW)"
                    fill="#16a34a"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Hourly Breakdown Table */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">
                  Hourly Procurement Ledger & Imbalance Resolution
                </h4>
                <p className="text-xs text-slate-500">
                  Detailed accounting of forecast, actuals, risk buffer, base procurement, and resulting position
                </p>
              </div>
              <span className="text-xs text-slate-500 font-mono">Date: {daySim.date}</span>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 sticky top-0 z-10 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Hour</th>
                    <th className="py-2.5 px-3 text-right">Actual Wind</th>
                    <th className="py-2.5 px-3 text-right">Forecast Wind</th>
                    <th className="py-2.5 px-3 text-right">Base Procured</th>
                    <th className="py-2.5 px-3 text-right">Risk Buffer</th>
                    <th className="py-2.5 px-3 text-right">Total Hedged</th>
                    <th className="py-2.5 px-3 text-right">Net Imbalance</th>
                    <th className="py-2.5 px-3">Regime</th>
                    <th className="py-2.5 px-3">Coverage Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {daySim.hours.map(h => (
                    <tr key={h.hour} className="hover:bg-blue-50/40 transition-colors">
                      <td className="py-2 px-3 font-semibold text-slate-900 font-sans">{h.hour}:00</td>
                      <td className="py-2 px-3 text-right text-slate-900 font-bold">{h.actualWindMW.toLocaleString()} MW</td>
                      <td className="py-2 px-3 text-right text-amber-700">{h.forecastWindMW.toLocaleString()} MW</td>
                      <td className="py-2 px-3 text-right text-slate-700">{h.baseProcurementMW.toLocaleString()} MW</td>
                      <td className="py-2 px-3 text-right text-blue-700 font-semibold">{h.riskBufferMW.toLocaleString()} MW</td>
                      <td className="py-2 px-3 text-right text-slate-900 font-bold">{h.totalProcuredMW.toLocaleString()} MW</td>
                      <td className={`py-2 px-3 text-right font-bold ${h.netImbalanceMW >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {h.netImbalanceMW >= 0 ? `+${h.netImbalanceMW.toLocaleString()}` : h.netImbalanceMW.toLocaleString()} MW
                      </td>
                      <td className="py-2 px-3 font-sans">
                        <span className={`text-[11px] px-2 py-0.5 rounded border font-medium ${
                          h.regime.includes('High')
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {h.regime}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-sans">
                        {h.isCovered ? (
                          <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                            Covered
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
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
