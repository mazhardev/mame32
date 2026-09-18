import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import './words.css';

export type LetterState = 'correct' | 'present' | 'absent' | 'empty' | 'pending';

const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

/**
 * Captures physical keyboard letters, Backspace and Enter for word games.
 * Ignores typing inside form fields and never steals the shell's P/R/F
 * shortcuts when `reserveShellKeys` is set (games without letter entry).
 */
export function useLetterKeys(onKey: (key: string) => void, enabled: boolean): void {
  const ref = useRef(onKey);
  ref.current = onKey;
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag && /^(INPUT|TEXTAREA|SELECT)$/.test(tag)) return;
      if (e.key === 'Enter') {
        if (tag === 'BUTTON') return;
        e.preventDefault();
        ref.current('enter');
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        ref.current('backspace');
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        // Letter keys are game input while this hook is active; the shell's
        // shortcuts stay available through the toolbar buttons.
        e.preventDefault();
        e.stopPropagation();
        ref.current(e.key.toLowerCase());
      }
    };
    // Capture phase so letters reach the game before the shell's shortcuts.
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [enabled]);
}

export function WordKeyboard({
  onKey,
  states = {},
  disabled = false,
  enterLabel = 'Enter',
}: {
  onKey: (key: string) => void;
  states?: Record<string, LetterState | undefined>;
  disabled?: boolean;
  enterLabel?: string;
}) {
  return (
    <div className="word-keyboard" role="group" aria-label="On-screen keyboard">
      {ROWS.map((row, i) => (
        <div className="kb-row" key={row}>
          {i === 2 && (
            <button
              type="button"
              className="kb-key wide"
              disabled={disabled}
              onClick={() => onKey('enter')}
            >
              {enterLabel}
            </button>
          )}
          {row.split('').map((ch) => (
            <button
              type="button"
              key={ch}
              className={`kb-key ${states[ch] ?? ''}`}
              disabled={disabled}
              aria-label={`${ch.toUpperCase()}${states[ch] ? `, ${states[ch]}` : ''}`}
              onClick={() => onKey(ch)}
            >
              {ch}
            </button>
          ))}
          {i === 2 && (
            <button
              type="button"
              className="kb-key wide"
              disabled={disabled}
              aria-label="Backspace"
              onClick={() => onKey('backspace')}
            >
              ⌫
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export function Tile({
  letter,
  state = 'empty',
  size,
}: {
  letter?: string;
  state?: LetterState;
  size?: number;
}) {
  return (
    <span
      className={`word-tile ${state}`}
      style={size ? { width: size, height: size, fontSize: size * 0.5 } : undefined}
    >
      {letter ?? ''}
    </span>
  );
}

export function TileRow({
  word,
  length,
  states,
  size,
  label,
}: {
  word: string;
  length: number;
  states?: LetterState[];
  size?: number;
  label?: string;
}) {
  return (
    <div className="tile-row" aria-label={label ?? (word ? word.toUpperCase() : 'empty row')}>
      {Array.from({ length }, (_, i) => (
        <Tile
          key={i}
          letter={word[i]}
          state={states?.[i] ?? (word[i] ? 'pending' : 'empty')}
          size={size}
        />
      ))}
    </div>
  );
}

/**
 * A text box for typed answers. Uses a real input so phones show their own
 * keyboard; the value is kept lowercase letters only.
 */
export function AnswerInput({
  onSubmit,
  disabled = false,
  placeholder = 'Type your answer',
  maxLength = 12,
  buttonLabel = 'Enter',
  autoFocus = true,
}: {
  onSubmit: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
  buttonLabel?: string;
  autoFocus?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const submit = () => {
    const el = inputRef.current;
    if (!el || disabled) return;
    const value = el.value.toLowerCase().replace(/[^a-z]/g, '');
    if (!value) return;
    onSubmit(value);
    el.value = '';
    el.focus();
  };
  useEffect(() => {
    if (!disabled && autoFocus) inputRef.current?.focus();
  }, [disabled, autoFocus]);
  return (
    <form
      className="word-input"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <input
        ref={inputRef}
        className="input"
        disabled={disabled}
        placeholder={placeholder}
        maxLength={maxLength}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        aria-label={placeholder}
        onChange={(e) => {
          e.currentTarget.value = e.currentTarget.value.replace(/[^a-zA-Z]/g, '');
        }}
      />
      <button type="submit" className="btn btn-primary" disabled={disabled}>
        {buttonLabel}
      </button>
    </form>
  );
}

/** Intro card with a Start button, shown before a round begins. */
export function StartPanel({ children, onStart }: { children: ReactNode; onStart: () => void }) {
  return (
    <div className="word-layout">
      <div className="word-panel">
        {children}
        <button className="btn btn-primary btn-lg" onClick={onStart}>
          Start
        </button>
      </div>
    </div>
  );
}

/** Centered column layout used by most word games. */
export function WordLayout({ children }: { children: ReactNode }) {
  return <div className="word-layout">{children}</div>;
}

/** Short-lived status line (invalid word, hints). */
export function WordToast({ message }: { message: string | null }) {
  return (
    <div className="word-toast" role="status" aria-live="polite">
      {message}
    </div>
  );
}
