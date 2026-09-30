'use client';
import Link from 'next/link';
import {
  LayoutDashboard,
  Scan,
  ChartNoAxesCombined,
  Sparkles,
  UserRound,
  Cloud,
  Monitor,
  AlertCircle,
} from 'lucide-react';
import { Overview } from './overview';
import { Anatomy } from './anatomy';
import { Progress } from './progress';
import { Avatar } from './avatar';
import { Me } from './me';
import { BondPage } from './bond-page';
import { AuthDialog } from './auth';
import { useTraining } from './store';
export type Section = 'overview' | 'anatomy' | 'progress' | 'avatar' | 'me' | 'bond';
const navigation = [
  { id: 'overview', label: 'Overview', href: '/', icon: LayoutDashboard },
  { id: 'anatomy', label: 'Anatomy', href: '/anatomy', icon: Scan },
  { id: 'progress', label: 'Progress', href: '/progress', icon: ChartNoAxesCombined },
  { id: 'avatar', label: 'My Atlas', href: '/avatar', icon: Sparkles },
];
export function AppShell({ section }: { section: Section }) {
  const { ready, mode, scope, data, saving, syncError, setAuthOpen, retry } = useTraining();
  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="app-header">
        <Link href="/" className="brand" aria-label="ATLAS home">
          <span className="brand-mark">
            <img src="/atlas-logo.png" alt="" />
          </span>
          <span>ATLAS</span>
        </Link>
        <nav aria-label="Primary navigation" className="desktop-nav">
          {navigation.map((n) => (
            <Link
              key={n.id}
              href={n.href}
              className={
                section === n.id || (section === 'bond' && n.id === 'avatar') ? 'active' : ''
              }
              aria-current={section === n.id ? 'page' : undefined}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          {mode === 'guest' ? (
            <button className="sign-in" onClick={() => setAuthOpen(true)}>
              Sign in
            </button>
          ) : (
            <span
              className="save-status"
              title={mode === 'device' ? 'Saved on this browser only' : 'Cloud journal'}
            >
              {mode === 'device' ? <Monitor size={14} /> : <Cloud size={14} />}
              <span>
                {saving
                  ? 'Saving…'
                  : syncError
                    ? 'Unsaved'
                    : mode === 'device'
                      ? 'On device'
                      : 'Synced'}
              </span>
            </span>
          )}
          <Link
            href="/me"
            className={`profile-button ${section === 'me' ? 'active' : ''}`}
            aria-label="Me and settings"
          >
            {mode === 'guest' ? <UserRound size={18} /> : data.profile.name.charAt(0).toUpperCase()}
          </Link>
        </div>
      </header>
      {syncError && (
        <div className="save-error" role="alert">
          <AlertCircle size={18} />
          <span>{syncError}</span>
          <button onClick={retry}>Retry save</button>
        </div>
      )}
      <main key={`${section}:${scope}`} id="main" className="main-content page-enter" tabIndex={-1}>
        {!ready ? (
          <div className="page-loading">
            <span className="loading-orbit" />
            <p>Preparing your space…</p>
          </div>
        ) : section === 'overview' ? (
          <Overview />
        ) : section === 'anatomy' ? (
          <Anatomy />
        ) : section === 'progress' ? (
          <Progress />
        ) : section === 'avatar' ? (
          <Avatar />
        ) : section === 'bond' ? (
          <BondPage />
        ) : (
          <Me />
        )}
      </main>
      <footer className="app-footer">
        <span>ATLAS</span>
        <Link href="/me">Settings</Link>
      </footer>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {navigation.map((n) => {
          const Icon = n.icon;
          return (
            <Link
              key={n.id}
              href={n.href}
              className={
                section === n.id || (section === 'bond' && n.id === 'avatar') ? 'active' : ''
              }
              aria-current={section === n.id ? 'page' : undefined}
            >
              <Icon size={20} />
              <span>{n.label}</span>
            </Link>
          );
        })}
        <Link href="/me" className={section === 'me' ? 'active' : ''}>
          <UserRound size={20} />
          <span>Me</span>
        </Link>
      </nav>
      <AuthDialog />
    </div>
  );
}
