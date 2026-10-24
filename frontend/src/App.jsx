import React, { useState, Component } from 'react';
import DayAheadView from './components/DayAheadView';
import AccuracyLab from './components/AccuracyLab';
import ProcurementSim from './components/ProcurementSim';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('UI Render Error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-50 border border-red-300 font-mono text-xs text-red-900 my-4">
          <div className="font-bold text-sm uppercase tracking-wider mb-2">Workspace Render Exception:</div>
          <div className="bg-white border border-red-200 p-3 overflow-x-auto text-red-800">
            {this.state.error?.toString()}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4 px-3 py-1.5 bg-red-700 text-white font-bold uppercase text-[11px] tracking-wider"
          >
            Reset Workspace View
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState('day-ahead');
  const [selectedCutoff, setSelectedCutoff] = useState('11');

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      {/* Institutional Top Header */}
      <header className="border-b border-slate-300 bg-white sticky top-0 z-50">
        {/* System Bar */}
        <div className="border-b border-slate-200 bg-slate-900 text-slate-200 px-4 py-1.5 text-[11px] font-mono">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="font-bold text-white tracking-wider">UK DAM OPERATIONS</span>
              <span className="text-slate-400">|</span>
              <span>SYSTEM: NATIONAL GRID ESO & ELEXON BMRS</span>
              <span className="text-slate-400">|</span>
              <span>AUDIT WINDOW: 2026-01-01 TO 2026-02-01</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-emerald-400 font-semibold">FEED: ONLINE (744 INTERVALS)</span>
              <span className="text-slate-400">|</span>
              <span>BENCHMARK CUTOFF: 11:00 UTC</span>
            </div>
          </div>
        </div>

        {/* Main Branding Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-slate-950 font-sans">
                WindCast UK
              </span>
              <span className="text-[11px] font-mono uppercase bg-slate-200 text-slate-800 px-2 py-0.5 border border-slate-300">
                Decision Support Terminal
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Wholesale Day-Ahead Power Procurement & Wind Forecast Risk Analytics
            </p>
          </div>

          <div className="text-right text-xs font-mono text-slate-600 hidden sm:block">
            <div>DATASET: ELEXON FUELHH (WIND) & WINDFOR</div>
            <div className="text-[11px] text-slate-500">SCOPE: NATIONAL GB WIND GENERATION</div>
          </div>
        </div>

        {/* Flat Enterprise Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex border-t border-slate-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('day-ahead')}
            className={`py-2.5 px-4 font-semibold text-xs tracking-wider uppercase border-b-2 whitespace-nowrap transition-none ${
              activeTab === 'day-ahead'
                ? 'border-blue-800 text-blue-900 bg-slate-50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            1. Day-Ahead Decision Desk
          </button>

          <button
            onClick={() => setActiveTab('accuracy')}
            className={`py-2.5 px-4 font-semibold text-xs tracking-wider uppercase border-b-2 whitespace-nowrap transition-none ${
              activeTab === 'accuracy'
                ? 'border-blue-800 text-blue-900 bg-slate-50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            2. Forecast Accuracy Lab
          </button>

          <button
            onClick={() => setActiveTab('procurement')}
            className={`py-2.5 px-4 font-semibold text-xs tracking-wider uppercase border-b-2 whitespace-nowrap transition-none ${
              activeTab === 'procurement'
                ? 'border-blue-800 text-blue-900 bg-slate-50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            3. Procurement & Risk Simulator
          </button>
        </div>
      </header>

      {/* Main Trading Desk Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <ErrorBoundary>
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
        </ErrorBoundary>
      </main>

      {/* Institutional Enterprise Footer */}
      <footer className="border-t border-slate-300 bg-white mt-auto py-3 text-xs text-slate-600 font-mono">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span className="font-bold text-slate-800">
              UK WHOLESALE POWER TRADING PLATFORM
            </span>
            <span className="mx-2 text-slate-400">|</span>
            <span>STRICTLY ELEXON BMRS FUELHH & WINDFOR FEEDS</span>
          </div>
          <div className="text-right text-[11px] text-slate-500">
            <span>React + Python FastAPI | Google DeepMind Antigravity AI Disclosure</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
