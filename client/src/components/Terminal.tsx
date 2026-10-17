import React, { useRef, useEffect, useState, useCallback } from 'react';
import { TerminalLine } from './TerminalLine';
import type { TerminalEntry } from '../hooks/useTerminal';

interface TerminalProps {
  entries: TerminalEntry[];
  inputValue: string;
  onInputChange: (val: string) => void;
  onSubmit: (cmd: string) => void;
  onArrowUp: () => void;
  onArrowDown: () => void;
  uppercaseMode?: boolean;
}

export const Terminal: React.FC<TerminalProps> = ({
  entries,
  inputValue,
  onInputChange,
  onSubmit,
  onArrowUp,
  onArrowDown,
  uppercaseMode = true,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [caretPos, setCaretPos] = useState<number>(inputValue.length);
  const [isInteracting, setIsInteracting] = useState<boolean>(false);
  const blinkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHistoryNavRef = useRef<boolean>(false);

  // Auto-scroll to bottom whenever entries or input changes
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [entries, inputValue]);

  // Stop blinking and stay solid during typing or movement, resuming blink after 500ms
  const resetBlinkTimer = useCallback(() => {
    setIsInteracting(true);
    if (blinkTimerRef.current) {
      clearTimeout(blinkTimerRef.current);
    }
    blinkTimerRef.current = setTimeout(() => {
      setIsInteracting(false);
    }, 500);
  }, []);

  useEffect(() => {
    return () => {
      if (blinkTimerRef.current) {
        clearTimeout(blinkTimerRef.current);
      }
    };
  }, []);

  // Synchronize caret position from native input selectionStart
  const syncCaretFromInput = useCallback(() => {
    if (inputRef.current) {
      const pos = inputRef.current.selectionStart ?? inputRef.current.value.length;
      setCaretPos(pos);
      resetBlinkTimer();
    }
  }, [resetBlinkTimer]);

  // Keep caret within valid range and handle history recall jumping to the end
  useEffect(() => {
    if (isHistoryNavRef.current) {
      isHistoryNavRef.current = false;
      const endPos = inputValue.length;
      setCaretPos(endPos);
      if (inputRef.current) {
        inputRef.current.setSelectionRange(endPos, endPos);
      }
      resetBlinkTimer();
    } else if (caretPos > inputValue.length) {
      setCaretPos(inputValue.length);
    }
  }, [inputValue, caretPos, resetBlinkTimer]);

  // Keep input focused when clicking anywhere in terminal
  const handleTerminalClick = (e: React.MouseEvent) => {
    if (inputRef.current && e.target !== inputRef.current) {
      inputRef.current.focus();
      syncCaretFromInput();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    resetBlinkTimer();

    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit(inputValue);
      setCaretPos(0);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      isHistoryNavRef.current = true;
      onArrowUp();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      isHistoryNavRef.current = true;
      onArrowDown();
      return;
    }

    // For Left, Right, Home, End, Backspace, Delete, Ctrl+Arrow, etc.:
    // Let browser perform default native action on input, then update caret position.
    requestAnimationFrame(syncCaretFromInput);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    resetBlinkTimer();
    const rawVal = e.target.value;
    const val = uppercaseMode ? rawVal.toUpperCase() : rawVal;
    const pos = e.target.selectionStart ?? val.length;

    onInputChange(val);
    setCaretPos(pos);

    // Ensure selection range stays preserved at insertion point
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.setSelectionRange(pos, pos);
      }
    });
  };

  const handleKeyUp = () => {
    syncCaretFromInput();
  };

  const handleSelect = () => {
    syncCaretFromInput();
  };

  const handleClick = () => {
    syncCaretFromInput();
  };

  const handleInput = () => {
    syncCaretFromInput();
  };

  // Safe caret bounds
  const safeCaret = Math.min(Math.max(0, caretPos), inputValue.length);
  const textBefore = inputValue.slice(0, safeCaret);
  const caretChar = inputValue[safeCaret] !== undefined ? inputValue[safeCaret] : ' ';
  const textAfter = inputValue.slice(safeCaret + 1);

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

      {/* Active Input Line - Inline flow */}
      <div className="active-input-row" id="terminal-active-line">
        <span className="input-prompt-symbol">&gt;&nbsp;</span>
        <div className="terminal-editor-container">
          <input
            ref={inputRef}
            type="text"
            className="terminal-hidden-input"
            value={inputValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
            onClick={handleClick}
            onSelect={handleSelect}
            onInput={handleInput}
            autoFocus
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            id="terminal-command-input"
            data-testid="terminal-command-input"
            aria-label="Sabre terminal command input"
          />
          <div className="terminal-visible-line" aria-hidden="true">
            <span className="text-before" data-testid="text-before">{textBefore}</span>
            <span
              className={`terminal-caret ${isInteracting ? 'solid' : 'blinking'}`}
              data-testid="terminal-caret"
            >
              {caretChar}
            </span>
            <span className="text-after" data-testid="text-after">{textAfter}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
