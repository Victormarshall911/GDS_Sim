import React, { useState } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Terminal } from '../Terminal';

function TerminalHarness(props: { initialValue?: string; history?: string[]; uppercaseMode?: boolean }) {
  const [val, setVal] = useState(props.initialValue ?? '');
  const [historyIndex, setHistoryIndex] = useState(-1);
  const history = props.history ?? ['1LOSLHR15NOV', '01Y1', '-DOE/JOHN MR'];

  const handleArrowUp = () => {
    const nextIdx = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
    setHistoryIndex(nextIdx);
    setVal(history[nextIdx]);
  };

  const handleArrowDown = () => {
    if (historyIndex === -1) return;
    const nextIdx = historyIndex + 1;
    if (nextIdx >= history.length) {
      setHistoryIndex(-1);
      setVal('');
    } else {
      setHistoryIndex(nextIdx);
      setVal(history[nextIdx]);
    }
  };

  return (
    <Terminal
      entries={[]}
      inputValue={val}
      onInputChange={setVal}
      onSubmit={vi.fn()}
      onArrowUp={handleArrowUp}
      onArrowDown={handleArrowDown}
      uppercaseMode={props.uppercaseMode ?? true}
    />
  );
}

describe('Terminal Inline Cursor & Caret Behavior', () => {
  it('renders prompt inline with text-before, terminal-caret, and text-after spans', () => {
    render(<TerminalHarness initialValue="WP" />);

    expect(screen.getByText('>')).toBeDefined();
    expect(screen.getByTestId('text-before').textContent).toBe('WP');
    expect(screen.getByTestId('terminal-caret').textContent).toBe(' ');
    expect(screen.getByTestId('text-after').textContent).toBe('');
  });

  it('moves caret to the left on Left Arrow and highlights character under it in inverted block', () => {
    render(<TerminalHarness initialValue="SABRE" />);

    const input = screen.getByTestId('terminal-command-input') as HTMLInputElement;

    // Simulate cursor moving left by 1 (to index 4, over 'E')
    act(() => {
      input.setSelectionRange(4, 4);
      fireEvent.keyUp(input, { key: 'ArrowLeft' });
    });

    expect(screen.getByTestId('text-before').textContent).toBe('SABR');
    expect(screen.getByTestId('terminal-caret').textContent).toBe('E');
    expect(screen.getByTestId('text-after').textContent).toBe('');

    // Simulate cursor moving left to index 2 (over 'B')
    act(() => {
      input.setSelectionRange(2, 2);
      fireEvent.keyUp(input, { key: 'ArrowLeft' });
    });

    expect(screen.getByTestId('text-before').textContent).toBe('SA');
    expect(screen.getByTestId('terminal-caret').textContent).toBe('B');
    expect(screen.getByTestId('text-after').textContent).toBe('RE');
  });

  it('inserts characters in the middle of text at current caret position', () => {
    render(<TerminalHarness initialValue="HELO" />);

    const input = screen.getByTestId('terminal-command-input') as HTMLInputElement;

    // Move caret between 'E' and 'L' (index 2)
    act(() => {
      input.setSelectionRange(2, 2);
      fireEvent.keyUp(input);
    });

    expect(screen.getByTestId('text-before').textContent).toBe('HE');
    expect(screen.getByTestId('terminal-caret').textContent).toBe('L');
    expect(screen.getByTestId('text-after').textContent).toBe('O');

    // Simulate typing 'L' at position 2 -> new value "HELLO" with caret at 3
    act(() => {
      fireEvent.change(input, {
        target: { value: 'HELLO', selectionStart: 3, selectionEnd: 3 },
      });
    });

    expect(screen.getByTestId('text-before').textContent).toBe('HEL');
    expect(screen.getByTestId('terminal-caret').textContent).toBe('L');
    expect(screen.getByTestId('text-after').textContent).toBe('O');
  });

  it('handles Home and End keys to position caret at beginning and end of text', () => {
    render(<TerminalHarness initialValue="1LOSLHR15NOV" />);

    const input = screen.getByTestId('terminal-command-input') as HTMLInputElement;

    // Press Home -> caret at index 0
    act(() => {
      input.setSelectionRange(0, 0);
      fireEvent.keyDown(input, { key: 'Home' });
      fireEvent.keyUp(input, { key: 'Home' });
    });

    expect(screen.getByTestId('text-before').textContent).toBe('');
    expect(screen.getByTestId('terminal-caret').textContent).toBe('1');
    expect(screen.getByTestId('text-after').textContent).toBe('LOSLHR15NOV');

    // Press End -> caret at index 12 (end of text)
    act(() => {
      input.setSelectionRange(12, 12);
      fireEvent.keyDown(input, { key: 'End' });
      fireEvent.keyUp(input, { key: 'End' });
    });

    expect(screen.getByTestId('text-before').textContent).toBe('1LOSLHR15NOV');
    expect(screen.getByTestId('terminal-caret').textContent).toBe(' ');
    expect(screen.getByTestId('text-after').textContent).toBe('');
  });

  it('history recall puts the caret at the end of the recalled command', () => {
    render(<TerminalHarness history={['1LOSLHR15NOV', '01Y1']} />);

    const input = screen.getByTestId('terminal-command-input') as HTMLInputElement;

    // Press ArrowUp to recall last command ("01Y1")
    act(() => {
      fireEvent.keyDown(input, { key: 'ArrowUp' });
    });

    // Recalled command should be "01Y1" and caret should be at the end (index 4)
    expect(screen.getByTestId('text-before').textContent).toBe('01Y1');
    expect(screen.getByTestId('terminal-caret').textContent).toBe(' ');
    expect(screen.getByTestId('text-after').textContent).toBe('');
    expect(input.selectionStart).toBe(4);
  });
});
