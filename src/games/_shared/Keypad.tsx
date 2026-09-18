import { useEffect, useRef } from 'react';
import './words/words.css';

/** Captures digits, Backspace and Enter from the physical keyboard. */
export function useDigitKeys(onKey: (key: string) => void, enabled: boolean): void {
  const ref = useRef(onKey);
  ref.current = onKey;
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag && /^(INPUT|TEXTAREA|SELECT)$/.test(tag)) return;
      if (/^[0-9]$/.test(e.key)) ref.current(e.key);
      else if (e.key === 'Backspace') ref.current('backspace');
      else if (e.key === 'Enter' && tag !== 'BUTTON') ref.current('enter');
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enabled]);
}

export function Keypad({
  onKey,
  disabled = false,
  disabledDigits = [],
}: {
  onKey: (key: string) => void;
  disabled?: boolean;
  disabledDigits?: string[];
}) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'backspace', '0', 'enter'];
  return (
    <div
      role="group"
      aria-label="Number keypad"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 72px))',
        gap: 8,
        justifyContent: 'center',
      }}
    >
      {keys.map((k) => (
        <button
          key={k}
          type="button"
          className={`kb-key ${k === 'enter' ? 'correct' : ''}`}
          style={{ maxWidth: 'none', height: 52, fontSize: '1.2rem' }}
          disabled={disabled || disabledDigits.includes(k)}
          aria-label={k === 'backspace' ? 'Backspace' : k === 'enter' ? 'Enter' : k}
          onClick={() => onKey(k)}
        >
          {k === 'backspace' ? '⌫' : k === 'enter' ? '↵' : k}
        </button>
      ))}
    </div>
  );
}
