import React from 'react';
import type { TerminalEntry } from '../hooks/useTerminal';

interface TerminalLineProps {
  entry: TerminalEntry;
}

export const TerminalLine: React.FC<TerminalLineProps> = ({ entry }) => {
  if (entry.type === 'command') {
    return (
      <div className="terminal-entry command-entry">
        <div className="input-line-echo">
          <span className="input-prompt-symbol">&gt;</span>
          <span className="input-text">{entry.content}</span>
        </div>
      </div>
    );
  }

  if (entry.type === 'system') {
    return (
      <div className="terminal-entry system-entry">
        <pre className="terminal-output-block system-banner">{entry.content}</pre>
      </div>
    );
  }

  return (
    <div className="terminal-entry output-entry">
      <pre className="terminal-output-block">{entry.content}</pre>
    </div>
  );
};
