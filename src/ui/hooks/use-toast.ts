import { useCallback, useEffect, useRef, useState } from 'react';
import { playCozyChime } from '../utils/cozy-sound.js';

export interface ToastController {
  readonly toastMessage: string | null;
  readonly showToast: (msg: string, soundKind?: 'pop' | 'success') => void;
}

export function useToast(soundEnabled: boolean): ToastController {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  const showToast = useCallback(
    (msg: string, soundKind: 'pop' | 'success' = 'success'): void => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
      setToastMessage(msg);
      playCozyChime(soundEnabled, soundKind);
      timerRef.current = window.setTimeout(() => {
        setToastMessage(null);
        timerRef.current = null;
      }, 2800);
    },
    [soundEnabled],
  );

  useEffect(() => {
    return (): void => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  return { toastMessage, showToast };
}
