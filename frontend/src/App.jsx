import React, { useState } from 'react';
import { LayoutDashboard, Activity, ShieldCheck, Wind, ExternalLink, Info } from 'lucide-react';
import DayAheadView from './components/DayAheadView';
import AccuracyLab from './components/AccuracyLab';
import ProcurementSim from './components/ProcurementSim';

export default function App() {
  const [activeTab, setActiveTab] = useState('day-ahead');
  const [selectedCutoff, setSelectedCutoff] = useState('11');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Wind className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-white">WindCast UK</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                  Day-Ahead DAM
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                UK Day-Ahead Market Wind Decision & Forecast Accuracy Engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Elexon BMRS Stream: Jan 2026</span>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-1 border-t border-slate-800/60 overflow-x-auto">
          <button
            onClick={() => setActiveTab('day-ahead')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition ${
              activeTab === 'day-ahead'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Day-Ahead Decision Desk</span>
          </button>

          <button
            onClick={() => setActiveTab('accuracy')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition ${
              activeTab === 'accuracy'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Forecast Accuracy Lab</span>
          </button>

          <button
            onClick={() => setActiveTab('procurement')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition ${
              activeTab === 'procurement'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
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

      {/* Footer & Compliance Disclosures */}
      <footer className="border-t border-slate-800 bg-slate-900/60 py-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <p className="font-semibold text-slate-300">
              REint Full Stack SWE Challenge Submission
            </p>
            <p className="text-[11px] text-slate-500">
              Strictly Elexon BMRS data (FUELHH WIND & WINDFOR). No external demand or pricing data.
            </p>
          </div>

          <div className="text-center sm:text-right text-[11px] text-slate-500 space-y-0.5">
            <p>Built with React + Python FastAPI + Docker</p>
            <p>AI Tools Disclosure: Built with Google DeepMind Antigravity</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
