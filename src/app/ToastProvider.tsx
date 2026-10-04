import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { onAchievementUnlocked } from '@/achievements/AchievementService';
import { playSound } from '@/services/audio';

export interface Toast {
  id: number;
  icon: string;
  title: string;
  body?: string;
}

interface ToastApi {
  push: (toast: Omit<Toast, 'id'>) => void;
}

const ToastContext = createContext<ToastApi>({ push: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const DURATION = 4200;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const push = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = nextId.current++;
    setToasts((list) => [...list.slice(-3), { ...toast, id }]);
    window.setTimeout(() => {
      setToasts((list) => list.filter((t) => t.id !== id));
    }, DURATION);
  }, []);

  // Achievement unlocks surface as non-blocking toasts, never modal dialogs.
  useEffect(
    () =>
      onAchievementUnlocked((def) => {
        push({
          icon: def.icon ?? '🏆',
          title: `Achievement Unlocked — ${def.name}`,
          body: def.description,
        });
        playSound('achievement');
      }),
    [push],
  );

  const api = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div className="toast" key={t.id}>
            <span className="toast-icon" aria-hidden="true">
              {t.icon}
            </span>
            <div>
              <div className="toast-title">{t.title}</div>
              {t.body && <div className="toast-body">{t.body}</div>}
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
