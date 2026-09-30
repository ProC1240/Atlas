'use client';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  cloudClient,
  cloudRepository,
  deviceRepository,
  MODE_KEY,
  type TrainingRepository,
} from '@/lib/storage';
import { emptyData, type TrainingData } from '@/domain/training';
type Change = (data: TrainingData) => TrainingData;
type Mode = 'guest' | 'device' | 'cloud';
interface Store {
  data: TrainingData;
  ready: boolean;
  mode: Mode;
  email: string | null;
  saving: boolean;
  syncError: string | null;
  mutate: (change: Change) => TrainingData | null;
  requireSave: (action: () => void) => void;
  startDevice: () => Promise<void>;
  authOpen: boolean;
  setAuthOpen: (open: boolean) => void;
  toast: (message: string) => void;
  signOut: () => Promise<void>;
  retry: () => void;
}
const Context = createContext<Store | null>(null);
export function TrainingProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<TrainingData>(emptyData),
    [ready, setReady] = useState(false),
    [mode, setMode] = useState<Mode>('guest'),
    [email, setEmail] = useState<string | null>(null),
    [authOpen, setAuthOpen] = useState(false),
    [notice, setNotice] = useState(''),
    [saving, setSaving] = useState(false),
    [syncError, setSyncError] = useState<string | null>(null);
  const repository = useRef<TrainingRepository | null>(null),
    revision = useRef(0),
    pending = useRef<(() => void) | null>(null),
    latest = useRef(data),
    dirty = useRef(false),
    writing = useRef(false),
    generation = useRef(0),
    activeUser = useRef<string | null>(null);
  const toast = useCallback((message: string) => setNotice(message), []);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 4500);
    return () => clearTimeout(t);
  }, [notice]);
  const flush = useCallback(async () => {
    if (writing.current || !repository.current || !dirty.current) return;
    writing.current = true;
    setSaving(true);
    const gen = generation.current;
    try {
      while (dirty.current && gen === generation.current) {
        dirty.current = false;
        revision.current = await repository.current.save(latest.current, revision.current);
      }
      setSyncError(null);
    } catch (error) {
      dirty.current = true;
      setSyncError(
        error instanceof Error
          ? error.message
          : 'Unable to save. Export a backup before closing this tab.',
      );
    } finally {
      writing.current = false;
      setSaving(false);
    }
  }, []);
  const activate = useCallback(
    async (repo: TrainingRepository, newMode: Mode, userEmail: string | null = null) => {
      generation.current++;
      dirty.current = false;
      const snapshot = await repo.load();
      repository.current = repo;
      revision.current = snapshot.revision;
      latest.current = snapshot.data;
      setData(snapshot.data);
      setMode(newMode);
      setEmail(userEmail);
      setSyncError(null);
    },
    [],
  );
  useEffect(() => {
    let disposed = false;
    async function init() {
      try {
        if (localStorage.getItem(MODE_KEY) === '1') await activate(deviceRepository(), 'device');
        const db = cloudClient();
        if (db) {
          const {
            data: { session },
          } = await db.auth.getSession();
          if (session && !disposed) {
            await activate(cloudRepository(session.user.id), 'cloud', session.user.email ?? null);
            activeUser.current = session.user.id;
          }
        }
      } catch {
        setSyncError(
          'Saved data could not be loaded. Do not clear browser storage; recover your backup before making changes.',
        );
      } finally {
        if (!disposed) setReady(true);
      }
    }
    void init();
    const db = cloudClient();
    const subscription = db?.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session && session.user.id !== activeUser.current) {
        setTimeout(() => {
          if (disposed || session.user.id === activeUser.current) return;
          if (dirty.current || writing.current) {
            setSyncError('Finish saving or export this journal before switching accounts.');
            return;
          }
          void activate(cloudRepository(session.user.id), 'cloud', session.user.email ?? null)
            .then(() => {
              activeUser.current = session.user.id;
              setAuthOpen(false);
              pending.current = null;
              toast('Signed in. Your cloud journal is ready.');
            })
            .catch(() =>
              setSyncError(
                'Sign-in succeeded, but cloud storage is unavailable. Check the database setup.',
              ),
            );
        }, 0);
      }
    });
    return () => {
      disposed = true;
      subscription?.data.subscription.unsubscribe();
    };
  }, [activate, toast]);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty.current || writing.current) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);
  const mutate = useCallback(
    (change: Change) => {
      if (!repository.current) {
        setAuthOpen(true);
        return null;
      }
      const next = change(latest.current);
      if (next === latest.current) return next;
      latest.current = next;
      setData(next);
      dirty.current = true;
      void flush();
      return next;
    },
    [flush],
  );
  const requireSave = useCallback(
    (action: () => void) => {
      if (mode === 'guest') {
        pending.current = action;
        setAuthOpen(true);
      } else action();
    },
    [mode],
  );
  const startDevice = useCallback(async () => {
    try {
      await activate(deviceRepository(), 'device');
      localStorage.setItem(MODE_KEY, '1');
      setAuthOpen(false);
      toast('Device mode on. Export backups to keep your progress safe.');
      const action = pending.current;
      pending.current = null;
      action?.();
    } catch {
      toast('Browser storage is unavailable. Please allow local storage.');
    }
  }, [activate, toast]);
  const signOut = useCallback(async () => {
    if (writing.current || dirty.current) {
      toast('Resolve pending saves before signing out.');
      return;
    }
    const result = await cloudClient()?.auth.signOut();
    if (result?.error) {
      toast('Could not sign out. Please try again.');
      return;
    }
    localStorage.removeItem(MODE_KEY);
    generation.current++;
    activeUser.current = null;
    repository.current = null;
    setMode('guest');
    setEmail(null);
    latest.current = structuredClone(emptyData);
    setData(latest.current);
    toast('Signed out. Your saved journal has not been deleted.');
  }, [toast]);
  return (
    <Context.Provider
      value={{
        data,
        ready,
        mode,
        email,
        saving,
        syncError,
        mutate,
        requireSave,
        startDevice,
        authOpen,
        setAuthOpen,
        toast,
        signOut,
        retry: () => void flush(),
      }}
    >
      {children}
      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}
    </Context.Provider>
  );
}
export function useTraining() {
  const value = useContext(Context);
  if (!value) throw new Error('TrainingProvider missing');
  return value;
}
