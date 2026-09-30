'use client';
import { useState } from 'react';
import { Mail, Monitor, KeyRound } from 'lucide-react';
import { cloudClient } from '@/lib/storage';
import { useTraining } from './store';
import { Dialog } from './ui';
export function AuthDialog() {
  const { authOpen, setAuthOpen, startDevice } = useTraining();
  const [email, setEmail] = useState(''),
    [token, setToken] = useState(''),
    [sent, setSent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const available = Boolean(cloudClient());
  if (!authOpen) return null;
  async function send() {
    setBusy(true);
    setError('');
    try {
      const db = cloudClient()!;
      if (sent) {
        const { error } = await db.auth.verifyOtp({ email, token, type: 'email' });
        if (error) throw error;
      } else {
        const { error } = await db.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: true },
        });
        if (error) throw error;
        setSent(true);
      }
    } catch (e) {
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
                onChange={(e) => setToken(e.target.value)}
              />
            </label>
          )}
          <button disabled={busy} className="button primary full auth-submit">
            <Mail size={17} />
            {busy ? 'Please wait…' : sent ? 'Verify & sign in' : 'Email me a code'}
          </button>
          {sent && (
            <p className="fine-print">
              Check your inbox. Your cloud journal is separate from device-mode progress.
            </p>
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
