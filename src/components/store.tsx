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
  cloudRepository,
  deviceRepository,
  MODE_KEY,
  type TrainingRepository,
} from '@/lib/storage';
import { apiRequest, RequestError, type AuthStatus } from '@/lib/api-client';
import { clearDrafts } from '@/lib/drafts';
import { emptyData, type TrainingData } from '@/domain/training';
type Change = (data: TrainingData) => TrainingData;
type Mode = 'guest' | 'device' | 'cloud';
interface Store {
  data: TrainingData;
  ready: boolean;
  mode: Mode;
  email: string | null;
  scope: string;
  authConfigured: boolean;
  authProviders: AuthStatus['providers'];
  beginGoogleSignIn: () => Promise<void>;
  saving: boolean;
  syncError: string | null;
  mutate: (change: Change, onSaved?: () => void) => TrainingData | null;
  requireSave: (action: () => void) => void;
  startDevice: () => Promise<void>;
  finishSignIn: () => Promise<void>;
  authOpen: boolean;
  setAuthOpen: (open: boolean) => void;
  toast: (message: string) => void;
  signOut: () => Promise<void>;
  retry: () => void;
}
const Context = createContext<Store | null>(null);
const AUTH_EVENT = 'atlas.auth.changed';
export function TrainingProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<TrainingData>(emptyData),
    [ready, setReady] = useState(false),
    [mode, setMode] = useState<Mode>('guest'),
    [email, setEmail] = useState<string | null>(null),
    [userId, setUserId] = useState<string | null>(null),
    [configured, setConfigured] = useState(false),
    [providers, setProviders] = useState<AuthStatus['providers']>({ google: false, email: false }),
    [authOpen, setAuthOpenState] = useState(false),
    [notice, setNotice] = useState(''),
    [saving, setSaving] = useState(false),
    [syncError, setSyncError] = useState<string | null>(null);
  const repository = useRef<TrainingRepository | null>(null),
    afterSave = useRef<Array<() => void>>([]),
    revision = useRef(0),
    pending = useRef<(() => void) | null>(null),
    latest = useRef(data),
    dirty = useRef(false),
    writing = useRef(false),
    generation = useRef(0),
    loading = useRef(0),
    activeUser = useRef<string | null>(null),
    expired = useRef(false);
  const toast = useCallback((message: string) => setNotice(message), []);
  const setAuthOpen = useCallback((open: boolean) => {
    if (!open) pending.current = null;
    setAuthOpenState(open);
  }, []);
  const announceAuth = () => {
    try {
      localStorage.setItem(AUTH_EVENT, crypto.randomUUID());
    } catch {}
  };
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 4500);
    return () => clearTimeout(t);
  }, [notice]);
  const flush = useCallback(async () => {
    if (writing.current || !repository.current || !dirty.current || expired.current) return;
    const repo = repository.current,
      gen = generation.current;
    writing.current = true;
    setSaving(true);
    try {
      while (dirty.current && gen === generation.current) {
        dirty.current = false;
        const callbacks = afterSave.current.splice(0);
        try {
          revision.current = await repo.save(latest.current, revision.current);
          if (gen === generation.current) callbacks.forEach((callback) => callback());
        } catch (error) {
          if (gen === generation.current) afterSave.current.unshift(...callbacks);
          throw error;
        }
      }
      if (gen === generation.current) setSyncError(null);
    } catch (error) {
      if (gen === generation.current) {
        dirty.current = true;
        if (error instanceof RequestError && error.status === 401) expired.current = true;
        setSyncError(
          error instanceof Error
            ? error.message
            : 'Unable to save. Export a backup before closing.',
        );
      }
    } finally {
      writing.current = false;
      setSaving(false);
    }
  }, []);
  const activate = useCallback(
    async (repo: TrainingRepository, newMode: Mode, user: AuthStatus['user'] = null) => {
      const ticket = ++loading.current;
      let snapshot;
      try {
        snapshot = await repo.load();
      } catch (error) {
        if (ticket === loading.current && newMode === 'cloud' && user) {
          repository.current = null;
          activeUser.current = user.id;
          setUserId(user.id);
          setEmail(user.email);
          setMode('cloud');
          latest.current = structuredClone(emptyData);
          setData(latest.current);
        }
        throw error;
      }
      if (ticket !== loading.current) return;
      generation.current++;
      dirty.current = false;
      afterSave.current = [];
      expired.current = false;
      repository.current = repo;
      revision.current = snapshot.revision;
      latest.current = snapshot.data;
      activeUser.current = user?.id ?? null;
      setUserId(user?.id ?? null);
      setData(snapshot.data);
      setMode(newMode);
      setEmail(user?.email ?? null);
      setSyncError(null);
    },
    [],
  );
  const reset = useCallback(() => {
    generation.current++;
    loading.current++;
    repository.current = null;
    activeUser.current = null;
    expired.current = false;
    dirty.current = false;
    afterSave.current = [];
    setUserId(null);
    setMode('guest');
    setEmail(null);
    latest.current = structuredClone(emptyData);
    setData(latest.current);
    setSyncError(null);
  }, []);
  useEffect(() => {
    let disposed = false;
    async function init() {
      try {
        const status = await apiRequest<AuthStatus>('/api/auth/session');
        if (disposed) return;
        setConfigured(status.configured);
        setProviders(status.providers);
        if (status.user) {
          localStorage.removeItem(MODE_KEY);
          await activate(cloudRepository(status.user.id), 'cloud', status.user);
        } else if (localStorage.getItem(MODE_KEY) === '1')
          await activate(deviceRepository(), 'device');
        if (disposed) return;
        const url = new URL(window.location.href);
        const result = url.searchParams.get('auth');
        if (result) {
          url.searchParams.delete('auth');
          window.history.replaceState(
            window.history.state,
            '',
            url.pathname + url.search + url.hash,
          );
          if (result === 'success' && status.user) {
            announceAuth();
            toast('Signed in. Your cloud journal is ready.');
          } else {
            setAuthOpenState(true);
            toast('Google sign-in was cancelled or expired. Please try again.');
          }
        }
      } catch {
        if (!disposed)
          setSyncError(
            'Saved data could not be loaded. Keep browser storage and retry or reload before making changes.',
          );
      } finally {
        if (!disposed) setReady(true);
      }
    }
    void init();
    return () => {
      disposed = true;
      loading.current++;
    };
  }, [activate, toast]);
  const beginGoogleSignIn = useCallback(async () => {
    if (dirty.current || writing.current)
      throw new Error('Resolve pending saves or export a backup before continuing with Google.');
    const { url } = await apiRequest<{ url: string }>('/api/auth/google', {
      method: 'POST',
      body: { next: window.location.pathname },
    });
    if (dirty.current || writing.current)
      throw new Error('Your journal changed. Finish saving, then try Google sign-in again.');
    window.location.assign(url);
  }, []);
  const finishSignIn = useCallback(async () => {
    const status = await apiRequest<AuthStatus>('/api/auth/session');
    if (!status.user)
      throw new RequestError(401, 'Your session ended. Request a new sign-in code.');
    if (writing.current) throw new Error('Wait for the current save to finish.');
    if (dirty.current) {
      if (activeUser.current !== status.user.id)
        throw new Error('Export your unsaved journal before switching accounts.');
      expired.current = false;
      await flush();
    } else await activate(cloudRepository(status.user.id), 'cloud', status.user);
    localStorage.removeItem(MODE_KEY);
    setConfigured(true);
    setAuthOpenState(false);
    pending.current = null;
    announceAuth();
    toast('Signed in. Your cloud journal is ready.');
  }, [activate, flush, toast]);
  useEffect(() => {
    if (!ready) return;
    let busy = false,
      disposed = false;
    async function check() {
      if (busy || document.visibilityState === 'hidden') return;
      busy = true;
      try {
        const status = await apiRequest<AuthStatus>('/api/auth/session');
        if (disposed) return;
        setConfigured(status.configured);
        setProviders(status.providers);
        if ((status.user?.id ?? null) === activeUser.current) return;
        if (dirty.current || writing.current) {
          expired.current = true;
          setSyncError(
            'Your account changed or session ended. Export unsaved data, then sign in again or reload.',
          );
          return;
        }
        const previous = activeUser.current;
        if (previous) clearDrafts('cloud:' + previous);
        if (status.user) await activate(cloudRepository(status.user.id), 'cloud', status.user);
        else if (previous) reset();
      } catch {
        /* Transient connectivity failures must not erase the journal. */
      } finally {
        busy = false;
      }
    }
    const storage = (event: StorageEvent) => {
      if (event.key === AUTH_EVENT) void check();
    };
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('storage', storage);
    return () => {
      disposed = true;
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('storage', storage);
    };
  }, [ready, activate, reset]);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty.current || writing.current) e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);
  const mutate = useCallback(
    (change: Change, onSaved?: () => void) => {
      if (!repository.current || expired.current) {
        setAuthOpenState(true);
        return null;
      }
      const next = change(latest.current);
      if (next === latest.current && !dirty.current) {
        onSaved?.();
        return next;
      }
      if (onSaved) afterSave.current.push(onSaved);
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
      if (mode === 'guest' || expired.current) {
        pending.current = action;
        setAuthOpenState(true);
      } else action();
    },
    [mode],
  );
  const startDevice = useCallback(async () => {
    if (activeUser.current || dirty.current || writing.current) {
      toast('Finish saving and sign out before switching to device mode.');
      return;
    }
    try {
      await activate(deviceRepository(), 'device');
      localStorage.setItem(MODE_KEY, '1');
      setAuthOpenState(false);
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
    try {
      if (activeUser.current) {
        await apiRequest('/api/auth/signout', { method: 'POST', body: {} });
        clearDrafts('cloud:' + activeUser.current);
      }
      localStorage.removeItem(MODE_KEY);
      pending.current = null;
      reset();
      announceAuth();
      toast('Signed out. Your saved journal has not been deleted.');
    } catch {
      toast('Could not sign out. Please try again.');
    }
  }, [reset, toast]);
  return (
    <Context.Provider
      value={{
        data,
        ready,
        mode,
        email,
        scope: userId ? 'cloud:' + userId : mode,
        authConfigured: configured,
        authProviders: providers,
        beginGoogleSignIn,
        saving,
        syncError,
        mutate,
        requireSave,
        startDevice,
        finishSignIn,
        authOpen,
        setAuthOpen,
        toast,
        signOut,
        retry: () => {
          if (expired.current) setAuthOpenState(true);
          else if (!repository.current) window.location.reload();
          else void flush();
        },
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
