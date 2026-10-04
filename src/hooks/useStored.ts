'use client';

import { useEffect, useState } from 'react';
import { subscribe } from '@/storage/StorageService';

/**
 * Reads a value from this browser's local storage after the page has
 * hydrated, and keeps it fresh when the given storage topic changes.
 *
 * Pages are pre-rendered at build time, where no player data exists, so the
 * first render must use `fallback` on both server and client; reading storage
 * during render would make the browser's HTML disagree with the server's.
 */
export function useStored<T>(read: () => T, fallback: T, topic?: string): T {
  const [value, setValue] = useState<T>(fallback);
  useEffect(() => {
    setValue(read());
    return topic ? subscribe(topic, () => setValue(read())) : undefined;
    // `read` is usually an inline closure; the topic decides when to refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic]);
  return value;
}
