import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Award } from 'lucide-react';
import { getScenarios, checkScenario, type ScenarioDefinition, type CheckScenarioResponse } from '../api';

interface PracticePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onExecutePrompt?: (cmd: string) => void;
  dialect?: 'sabre' | 'amadeus';
}

export const PracticePanel: React.FC<PracticePanelProps> = ({
  isOpen,
  onClose,
  onExecutePrompt,
  dialect = 'sabre',
}) => {
  const [scenarios, setScenarios] = useState<ScenarioDefinition[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [filterDialect, setFilterDialect] = useState<'all' | 'sabre' | 'amadeus'>(dialect);
  const [loading, setLoading] = useState<boolean>(false);
  const [checkResult, setCheckResult] = useState<CheckScenarioResponse | null>(null);

  useEffect(() => {
    setFilterDialect(dialect);
  }, [dialect]);

  useEffect(() => {
    if (isOpen) {
      getScenarios()
        .then((data) => {
          if (data && data.length > 0) {
            setScenarios(data);
            // Default to first scenario matching current dialect
            const firstMatch = data.find((s) => s.dialect === dialect) ?? data[0];
            setSelectedId(firstMatch.id);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, dialect]);

  const displayedScenarios =
    filterDialect === 'all'
      ? scenarios
      : scenarios.filter((s) => s.dialect === filterDialect || (!s.dialect && filterDialect === 'sabre'));

  const activeScenario =
    scenarios.find((s) => s.id === selectedId) ?? displayedScenarios[0] ?? scenarios[0];

  const handleEvaluate = async () => {
    if (!activeScenario) return;
    setLoading(true);
    try {
      const res = await checkScenario(activeScenario.id);
      setCheckResult(res);
    } catch (err: any) {
      alert(`Error checking scenario: ${err.message || 'Server error'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <aside className="side-drawer" id="practice-drawer">
      <div className="drawer-header">
        <div className="drawer-title">
          <Award size={18} className="text-amber" />
          <span>SIWES Practice Mode ({dialect.toUpperCase()})</span>
        </div>
        <button className="drawer-close" onClick={onClose} aria-label="Close Practice Mode">
          <X size={18} />
        </button>
      </div>

      <div className="drawer-body">
        <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '10px' }}>
          Select a realistic agency scenario, book it in the terminal, then click <strong>Evaluate My Booking</strong> for automatic SIWES grading.
        </p>

        {/* Dialect Filter Tabs */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
          {(['amadeus', 'sabre', 'all'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className={`nav-btn ${filterDialect === mode ? 'active' : ''}`}
              style={{
                fontSize: '11px',
                padding: '3px 8px',
                borderRadius: '4px',
                textTransform: 'uppercase',
                border: filterDialect === mode ? '1px solid var(--term-green)' : '1px solid var(--term-border)',
                background: filterDialect === mode ? 'rgba(0, 255, 102, 0.15)' : 'transparent',
                color: filterDialect === mode ? 'var(--term-green)' : '#9ca3af',
                cursor: 'pointer',
              }}
              onClick={() => {
                setFilterDialect(mode);
                const nextMatch =
                  mode === 'all'
                    ? scenarios[0]
                    : scenarios.find((s) => s.dialect === mode || (!s.dialect && mode === 'sabre'));
                if (nextMatch) setSelectedId(nextMatch.id);
                setCheckResult(null);
              }}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Scenario Selection Cards */}
        <div className="scenario-selector">
          {displayedScenarios.map((sc) => {
            const isSelected = sc.id === activeScenario?.id;
            return (
              <div
                key={sc.id}
                className={`scenario-card ${isSelected ? 'active' : ''}`}
                onClick={() => {
                  setSelectedId(sc.id);
                  setCheckResult(null);
                }}
              >
                <div className="scenario-title">{sc.title}</div>
                <div className="scenario-meta">
                  <span
                    className="badge"
                    style={{
                      background:
                        sc.difficulty === 'Beginner'
                          ? 'rgba(0, 255, 102, 0.15)'
                          : sc.difficulty === 'Intermediate'
                          ? 'rgba(255, 176, 0, 0.15)'
                          : 'rgba(255, 51, 102, 0.15)',
                      color:
                        sc.difficulty === 'Beginner'
                          ? 'var(--term-green)'
                          : sc.difficulty === 'Intermediate'
                          ? 'var(--term-amber)'
                          : 'var(--term-red)',
                    }}
                  >
                    {sc.difficulty}
                  </span>
                  {sc.dialect && (
                    <span
                      className="badge"
                      style={{
                        background: sc.dialect === 'amadeus' ? 'rgba(0, 229, 255, 0.15)' : 'rgba(255, 176, 0, 0.15)',
                        color: sc.dialect === 'amadeus' ? '#00e5ff' : '#ffb000',
                        fontSize: '9px',
                        marginLeft: '4px',
                      }}
                    >
                      {sc.dialect.toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="scenario-desc">{sc.description}</div>
              </div>
            );
          })}
        </div>

        {/* Active Scenario Objectives */}
        {activeScenario && (
          <div style={{ marginTop: '14px' }}>
            <h4
              style={{
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: 'var(--term-green)',
                marginBottom: '8px',
              }}
            >
              Step-by-Step Objectives
            </h4>
            <div style={{ background: 'var(--term-surface)', padding: '10px', borderRadius: '6px' }}>
              {activeScenario.objectives.map((obj, i) => (
                <div key={obj.id} className="objective-item">
                  <span style={{ color: 'var(--term-green)', fontWeight: 'bold' }}>{i + 1}.</span>
                  <div style={{ flex: 1 }}>
                    <div>{obj.description}</div>
                    {obj.hint && (
                      <span
                        className="objective-hint"
                        onClick={() => onExecutePrompt?.(obj.hint)}
                        title="Click to copy into terminal"
                        style={{ cursor: 'pointer' }}
                      >
                        Hint: {obj.hint}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              className="check-button"
              onClick={handleEvaluate}
              disabled={loading}
              id="evaluate-booking-btn"
            >
              {loading ? 'Evaluating Booking...' : 'Evaluate My Booking'}
            </button>
          </div>
        )}

        {/* Evaluation Feedback */}
        {checkResult && (
          <div className={`feedback-card ${checkResult.passed ? 'passed' : 'failed'}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              {checkResult.passed ? (
                <CheckCircle size={20} color="var(--term-green)" />
              ) : (
                <AlertCircle size={20} color="var(--term-amber)" />
              )}
              <strong style={{ fontSize: '14px' }}>
                Score: {checkResult.score}/100 — {checkResult.passed ? 'PASSED' : 'NEEDS WORK'}
              </strong>
            </div>

            {checkResult.recordLocator && (
              <div style={{ marginBottom: '8px', fontSize: '12px' }}>
                Saved Record Locator: <span style={{ color: 'var(--term-green)', fontWeight: 'bold' }}>{checkResult.recordLocator}</span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {checkResult.feedback.map((line, idx) => (
                <div key={idx} style={{ fontSize: '12px', color: line.startsWith('✓') ? '#a0ffa0' : line.startsWith('✗') ? '#ffb0b0' : '#ffffff' }}>
                  {line}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
