import { useState, useCallback } from 'react';

export interface TerminalEntry {
  id: string;
  type: 'command' | 'output' | 'system';
  content: string;
  timestamp: string;
}

export function useTerminal() {
  const [entries, setEntries] = useState<TerminalEntry[]>([
    {
      id: 'welcome',
      type: 'system',
      content: [
        'SABRE GDS TERMINAL SIMULATOR  —  TRAINING EDITION (NIGERIA)',
        '═══════════════════════════════════════════════════════════════════════════════',
        'SYSTEM READY. AREA A  HOME PCC: LOS01  DATE: ' + new Date().toDateString().toUpperCase(),
        '',
        'QUICK START:',
        '  1. Sign in:                   SI*7890',
        '  2. Check flight availability: 1LOSLHR15NOV',
        '  3. Sell seat from line 1:     01Y1',
        '  4. Add passenger name:        -SMITH/JOHN MR',
        '  5. Add agency phone:          9234-802-123-4567-A',
        '  6. Add ticketing arrangement: 7TAW/',
        '  7. Add received from:         6SMITH',
        '  8. End and save PNR:          ER',
        '',
        'Type "HELP" at any time for the full command reference.',
        '═══════════════════════════════════════════════════════════════════════════════',
      ].join('\n'),
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);

  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const addEntry = useCallback((type: 'command' | 'output' | 'system', content: string) => {
    setEntries((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type,
        content,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  }, []);

  const pushCommand = useCallback(
    (commandText: string, outputText: string) => {
      const trimmed = commandText.trim();
      if (trimmed) {
        setHistory((prev) => [...prev, trimmed]);
        setHistoryIndex(-1);
      }

      addEntry('command', commandText);
      if (outputText) {
        addEntry('output', outputText);
      }
    },
    [addEntry]
  );

  const clearEntries = useCallback(() => {
    setEntries([]);
  }, []);

  const getPreviousHistory = useCallback((): string | null => {
    if (history.length === 0) return null;
    const newIdx = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
    setHistoryIndex(newIdx);
    return history[newIdx];
  }, [history, historyIndex]);

  const getNextHistory = useCallback((): string | null => {
    if (history.length === 0 || historyIndex === -1) return null;
    const newIdx = historyIndex + 1;
    if (newIdx >= history.length) {
      setHistoryIndex(-1);
      return '';
    }
    setHistoryIndex(newIdx);
    return history[newIdx];
  }, [history, historyIndex]);

  return {
    entries,
    addEntry,
    pushCommand,
    clearEntries,
    getPreviousHistory,
    getNextHistory,
  };
}
