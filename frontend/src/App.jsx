import React, { useState } from 'react';
import { LayoutDashboard, Activity, ShieldCheck, Wind, ExternalLink, Info } from 'lucide-react';
import DayAheadView from './components/DayAheadView';
import AccuracyLab from './components/AccuracyLab';
import ProcurementSim from './components/ProcurementSim';

export default function App() {
  const [activeTab, setActiveTab] = useState('day-ahead');
  const [selectedCutoff, setSelectedCutoff] = useState('11');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-blue-700 text-white flex items-center justify-center shadow-xs">
              <Wind className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-base tracking-tight text-slate-900">WindCast UK</span>
                <span className="text-[11px] font-medium tracking-wide px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  Day-Ahead Wholesale
                </span>
              </div>
              <p className="text-xs text-slate-500">
                UK Day-Ahead Market Wind Decision Support & Forecast Accuracy Engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              <span>Elexon BMRS Live Audit: Jan 2026</span>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-1 border-t border-slate-100 overflow-x-auto">
          <button
            onClick={() => setActiveTab('day-ahead')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors ${
              activeTab === 'day-ahead'
                ? 'border-blue-700 text-blue-700 bg-blue-50/40'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Day-Ahead Decision Desk</span>
          </button>

          <button
            onClick={() => setActiveTab('accuracy')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors ${
              activeTab === 'accuracy'
                ? 'border-blue-700 text-blue-700 bg-blue-50/40'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Forecast Accuracy Lab</span>
          </button>

          <button
            onClick={() => setActiveTab('procurement')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors ${
              activeTab === 'procurement'
                ? 'border-blue-700 text-blue-700 bg-blue-50/40'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Procurement & Risk Simulator</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'day-ahead' && (
          <DayAheadView
            selectedCutoff={selectedCutoff}
            onCutoffChange={setSelectedCutoff}
          />
        )}
        {activeTab === 'accuracy' && (
          <AccuracyLab
            selectedCutoff={selectedCutoff}
            onCutoffChange={setSelectedCutoff}
          />
        )}
        {activeTab === 'procurement' && (
          <ProcurementSim
            selectedCutoff={selectedCutoff}
            onCutoffChange={setSelectedCutoff}
          />
        )}
      </main>

      {/* Institutional Footer */}
      <footer className="border-t border-slate-200 bg-white mt-auto py-5 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <span className="font-semibold text-slate-700">
              Full Stack SWE Challenge Submission
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Strictly Elexon BMRS data (FUELHH WIND & WINDFOR). No external demand or pricing data.
            </p>
          </div>
          <div className="text-right text-[11px] text-slate-500">
            <div>Built with React + Python FastAPI + Docker</div>
            <div className="mt-0.5">AI Tools Disclosure: Built with Google DeepMind Antigravity</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
