'use client';
import { useRef, useState, type SetStateAction } from 'react';
import type { z } from 'zod';
import { draftKey, readDraft, writeDraft } from '@/lib/drafts';
import { useTraining } from './store';
export function useDraft<T>(form: string, initial: T, schema: z.ZodType<T>) {
  const { scope } = useTraining();
  const key = draftKey(scope, form);
  const [loaded] = useState(() => {
    try {
      const saved = readDraft(localStorage, key, schema);
      return { value: saved ?? initial, restored: saved !== null, error: false };
    } catch {
      return { value: initial, restored: false, error: true };
    }
  });
  const [value, render] = useState<T>(loaded.value);
  const [hasDraft, setHasDraft] = useState(loaded.restored);
  const [error, setError] = useState(loaded.error);
  const latest = useRef(value);
  const setValue = (update: SetStateAction<T>) => {
    const next =
      typeof update === 'function' ? (update as (previous: T) => T)(latest.current) : update;
    latest.current = next;
    render(next);
    try {
      writeDraft(localStorage, key, next, schema);
      setHasDraft(true);
      setError(false);
    } catch {
      setError(true);
    }
  };
  const clear = () => {
    try {
      const saved = readDraft(localStorage, key, schema);
      if (saved && JSON.stringify(saved) !== JSON.stringify(value)) return;
      localStorage.removeItem(key);
      setHasDraft(false);
      setError(false);
    } catch {
      setError(true);
    }
  };
  const reset = (next: T = initial) => {
    try {
      localStorage.removeItem(key);
      setHasDraft(false);
      setError(false);
    } catch {
      setError(true);
    }
    latest.current = next;
    render(next);
  };
  return { value, setValue, hasDraft, error, clear, reset, discard: () => reset() };
}
