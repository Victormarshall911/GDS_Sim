import React, { useState, useEffect, useCallback } from 'react';
import { Terminal } from './components/Terminal';
import { StatusBar } from './components/StatusBar';
import { CheatSheet } from './components/CheatSheet';
import { PracticePanel } from './components/PracticePanel';
import { PricingModal } from './components/PricingModal';
import { useTerminal } from './hooks/useTerminal';
import { executeCommand, getSession, resetSession } from './api';
import { DEFAULT_AGENT } from '@sabre-sim/shared';
import { BookOpen, Award, Sliders, RefreshCw, Monitor, Palette } from 'lucide-react';
import './styles/terminal.css';

export const App: React.FC = () => {
  const {
    entries,
    pushCommand,
    clearEntries,
    resetTerminal,
    getPreviousHistory,
    getNextHistory,
  } = useTerminal();

  const [inputValue, setInputValue] = useState<string>('');
  const [signedIn, setSignedIn] = useState<boolean>(true);
  const [agentId, setAgentId] = useState<string | null>(DEFAULT_AGENT?.agentId || '7890');
  const [pcc, setPcc] = useState<string>(DEFAULT_AGENT?.pcc || 'LOS01');
  const [dialect, setDialect] = useState<'sabre' | 'amadeus'>('sabre');
  const [currentPnr, setCurrentPnr] = useState<string | null>(null);
  const [hasWorkingPnr, setHasWorkingPnr] = useState<boolean>(false);
  const [uppercaseMode, setUppercaseMode] = useState<boolean>(true);

  // UI state
  const [showCheatSheet, setShowCheatSheet] = useState<boolean>(false);
  const [showPractice, setShowPractice] = useState<boolean>(false);
  const [showPricingModal, setShowPricingModal] = useState<boolean>(false);
  const [crtEffect, setCrtEffect] = useState<boolean>(false);
  const [theme, setTheme] = useState<'green' | 'amber' | 'matrix'>('green');

  // Load session on startup
  useEffect(() => {
    getSession()
      .then((data) => {
        setSignedIn(data.signedIn);
        setAgentId(data.agentId);
        setDialect(data.dialect);
        setCurrentPnr(data.currentPnr);
        setHasWorkingPnr(data.hasWorkingPnr);
        if (data.pcc) setPcc(data.pcc);
      })
      .catch(() => {});
  }, []);

  // Update theme on document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const handleExecute = useCallback(
    async (commandText: string) => {
      const trimmed = commandText.trim();
      setInputValue('');

      if (!trimmed) return;

      const upper = trimmed.toUpperCase();

      // Client-side quick clear
      if (upper === 'CLEAR' || upper === 'CLS') {
        clearEntries();
        return;
      }

      try {
        const res = await executeCommand(trimmed);
        pushCommand(trimmed, res.output);
        setSignedIn(res.signedIn);
        setAgentId(res.agentId);
        setDialect(res.dialect);
        setCurrentPnr(res.currentPnr);
        setHasWorkingPnr(res.hasWorkingPnr);
        if (res.pcc) setPcc(res.pcc);
      } catch (err: any) {
        pushCommand(trimmed, `SYSTEM COMMUNICATION ERROR: ${err.message || 'Server unreachable'}`);
      }
    },
    [clearEntries, pushCommand]
  );

  const handleArrowUp = () => {
    const prev = getPreviousHistory();
    if (prev !== null) {
      setInputValue(prev);
    }
  };

  const handleArrowDown = () => {
    const next = getNextHistory();
    if (next !== null) {
      setInputValue(next);
    }
  };

  const handleReset = async () => {
    if (window.confirm('Reset terminal session and clear current working PNR?')) {
      try {
        const res = await resetSession();
        setSignedIn(res.signedIn);
        setAgentId(res.agentId);
        setDialect(res.dialect);
        setCurrentPnr(null);
        setHasWorkingPnr(false);
        if (res.pcc) setPcc(res.pcc);
        resetTerminal();
      } catch {
        alert('Failed to reset session');
      }
    }
  };

  const toggleDialect = () => {
    const target = dialect === 'sabre' ? 'SET AMADEUS' : 'SET SABRE';
    handleExecute(target);
  };

  const cycleTheme = () => {
    if (theme === 'green') setTheme('amber');
    else if (theme === 'amber') setTheme('matrix');
    else setTheme('green');
  };

  return (
    <div className="app-container">
      {crtEffect && <div className="crt-overlay" />}

      {/* Navigation Header */}
      <header className="top-nav">
        <div className="brand-section">
          <div className="brand-title">SABRE GDS SIMULATOR</div>
          <button
            className={`badge ${dialect === 'sabre' ? 'badge-sabre' : 'badge-amadeus'}`}
            onClick={toggleDialect}
            title="Click to switch dialect"
            style={{ cursor: 'pointer', border: '1px solid currentColor' }}
          >
            DIALECT: {dialect.toUpperCase()}
          </button>
          {signedIn && agentId && (
            <span className="badge badge-agent">AGENT: {agentId}</span>
          )}
        </div>

        <div className="nav-controls">
          <button
            className={`nav-btn ${showCheatSheet ? 'active' : ''}`}
            onClick={() => {
              setShowCheatSheet(!showCheatSheet);
              setShowPractice(false);
            }}
            id="nav-cheatsheet-btn"
          >
            <BookOpen size={14} />
            <span>Command Reference</span>
          </button>

          <button
            className={`nav-btn ${showPractice ? 'active' : ''}`}
            onClick={() => {
              setShowPractice(!showPractice);
              setShowCheatSheet(false);
            }}
            id="nav-practice-btn"
          >
            <Award size={14} />
            <span>Practice Scenarios</span>
          </button>

          <button
            className="nav-btn"
            onClick={() => setShowPricingModal(true)}
            id="nav-pricing-btn"
          >
            <Sliders size={14} />
            <span>Pricing Rules</span>
          </button>

          <button
            className={`nav-btn ${uppercaseMode ? 'active' : ''}`}
            onClick={() => setUppercaseMode(!uppercaseMode)}
            title="Toggle Uppercase Input Mode"
          >
            <span>{uppercaseMode ? 'CAPS' : 'caps'}</span>
          </button>

          <button
            className={`nav-btn ${crtEffect ? 'active' : ''}`}
            onClick={() => setCrtEffect(!crtEffect)}
            title="Toggle CRT Scanlines"
          >
            <Monitor size={14} />
            <span>CRT</span>
          </button>

          <button
            className="nav-btn"
            onClick={cycleTheme}
            title="Switch Phosphor Theme"
          >
            <Palette size={14} />
            <span>{theme.toUpperCase()}</span>
          </button>

          <button
            className="nav-btn"
            onClick={handleReset}
            title="Reset Terminal Session"
          >
            <RefreshCw size={14} />
            <span>Reset</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Area */}
      <main className="main-workspace">
        <Terminal
          entries={entries}
          inputValue={inputValue}
          onInputChange={setInputValue}
          onSubmit={handleExecute}
          onArrowUp={handleArrowUp}
          onArrowDown={handleArrowDown}
          uppercaseMode={uppercaseMode}
        />

        <CheatSheet
          isOpen={showCheatSheet}
          onClose={() => setShowCheatSheet(false)}
          onSelectCommand={(cmd) => {
            setInputValue(cmd);
          }}
        />

        <PracticePanel
          isOpen={showPractice}
          onClose={() => setShowPractice(false)}
          onExecutePrompt={(cmd) => {
            setInputValue(cmd);
          }}
        />

        <PricingModal
          isOpen={showPricingModal}
          onClose={() => setShowPricingModal(false)}
        />
      </main>

      {/* Status Bar */}
      <StatusBar
        signedIn={signedIn}
        agentId={agentId}
        dialect={dialect}
        currentPnr={currentPnr}
        hasWorkingPnr={hasWorkingPnr}
        pcc={pcc}
      />
    </div>
  );
};
