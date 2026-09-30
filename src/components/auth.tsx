'use client';
import { useEffect, useState } from 'react';
import { Mail, Monitor, KeyRound } from 'lucide-react';
import { apiRequest, RequestError } from '@/lib/api-client';
import { useTraining } from './store';
import { Dialog } from './ui';
export function AuthDialog() {
  const {
    authOpen,
    setAuthOpen,
    startDevice,
    authConfigured: available,
    finishSignIn,
  } = useTraining();
  const [email, setEmail] = useState(''),
    [token, setToken] = useState(''),
    [sent, setSent] = useState(false),
    [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  if (!authOpen) return null;
  async function send() {
    setBusy(true);
    setError('');
    try {
      if (sent) {
        if (!confirmed) {
          await apiRequest('/api/auth/verify', { method: 'POST', body: { email, token } });
          setConfirmed(true);
        }
        await finishSignIn();
        setConfirmed(false);
        setToken('');
        setSent(false);
      } else {
        await apiRequest('/api/auth/otp', { method: 'POST', body: { email } });
        setCooldown(60);
        setSent(true);
      }
    } catch (e) {
      if (e instanceof RequestError && e.status === 401) setConfirmed(false);
      setError(e instanceof Error ? e.message : 'Sign-in failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog title="YOUR JOURNEY, SAVED" onClose={() => setAuthOpen(false)}>
      <div className="auth-symbol">
        <KeyRound size={27} />
      </div>
      <h2>Make it your own.</h2>
      <p className="body-copy">Browse freely. Choose how to save your progress.</p>
      {available ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <label>
            Email address
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              disabled={sent}
              placeholder="you@example.com"
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          {sent && (
            <label className="note-label">
              Email verification code
              <input
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6,10}"
                value={token}
                disabled={confirmed}
                onChange={(e) => setToken(e.target.value)}
              />
            </label>
          )}
          <button
            disabled={busy || (!sent && cooldown > 0)}
            className="button primary full auth-submit"
          >
            <Mail size={17} />
            {busy
              ? 'Please wait…'
              : sent
                ? confirmed
                  ? 'Retry cloud connection'
                  : 'Verify & sign in'
                : cooldown
                  ? `Try again in ${cooldown}s`
                  : 'Email me a code'}
          </button>
          {sent && (
            <>
              <p className="fine-print">
                Check your inbox. Cloud and device journals are separate.
              </p>
              <button
                type="button"
                className="text-button"
                disabled={busy || confirmed}
                onClick={() => {
                  setSent(false);
                  setToken('');
                  setError('');
                }}
              >
                Change email or request a new code
              </button>
            </>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </form>
      ) : (
        <div className="cloud-unavailable">
          <Mail size={19} />
          <div>
            <strong>Cloud sign-in isn’t connected yet.</strong>
            <p>This local preview needs a Supabase project.</p>
          </div>
        </div>
      )}
      <div className="divider-label">
        <span />
        OR
        <span />
      </div>
      <button className="button secondary full" onClick={() => void startDevice()}>
        <Monitor size={18} />
        Continue on this device
      </button>
      <p className="fine-print">
        No account needed for device mode. Progress stays in this browser, can be lost if storage is
        cleared, and does not sync. Export a backup in Me.
      </p>
    </Dialog>
  );
}
