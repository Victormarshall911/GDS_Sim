import React, { useRef, useEffect } from 'react';
import { TerminalLine } from './TerminalLine';
import type { TerminalEntry } from '../hooks/useTerminal';

interface TerminalProps {
  entries: TerminalEntry[];
  inputValue: string;
  onInputChange: (val: string) => void;
  onSubmit: (cmd: string) => void;
  onArrowUp: () => void;
  onArrowDown: () => void;
}

export const Terminal: React.FC<TerminalProps> = ({
  entries,
  inputValue,
  onInputChange,
  onSubmit,
  onArrowUp,
  onArrowDown,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom whenever entries change
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [entries, inputValue]);

  // Keep input focused when clicking anywhere in terminal
  const handleTerminalClick = () => {
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit(inputValue);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      onArrowUp();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      onArrowDown();
    }
  };

  return (
    <div
      className="terminal-wrapper"
      ref={containerRef}
      onClick={handleTerminalClick}
      id="terminal-viewport"
    >
      <div className="terminal-scrollback">
        {entries.map((entry) => (
          <TerminalLine key={entry.id} entry={entry} />
        ))}
      </div>

      {/* Active Input Line */}
      <div className="active-input-row" id="terminal-active-line">
        <span className="input-prompt-symbol">&gt;</span>
        <input
          ref={inputRef}
          type="text"
          className="terminal-input-field"
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="characters"
          id="terminal-command-input"
        />
        <span className="blinking-cursor" />
      </div>
    </div>
  );
};
