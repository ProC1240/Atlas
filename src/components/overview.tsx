'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useState } from 'react';
import { Plus, Droplets, Flame, Dumbbell, Check, Undo2, Scan, Heart } from 'lucide-react';
import { dateKey, summarize, rangeFor, currentStreak, shiftDay } from '@/domain/training';
import { type GodId, avatars } from '@/domain/avatars';
import { useTraining } from './store';
import { Ring } from './ui';
import { bondProgress, dailyAvailable } from '@/domain/bond';
import { OfferingDialog } from './offering-dialog';
const AvatarScene = dynamic(() => import('./scene').then((m) => m.AvatarScene), { ssr: false });
export function Overview() {
  const { data, mutate, requireSave, toast } = useTraining();
  const today = dateKey(),
    week = rangeFor(today, 'week'),
    weekly = summarize(data, week.start, week.end),
    daily = summarize(data, today, today),
    streak = currentStreak(data.checkins),
    bond = bondProgress(data),
    god = avatars.find((a) => a.id === data.equipped) ?? avatars[0],
    checked = !dailyAvailable(data);
  const [offering, setOffering] = useState(false);
  const addWater = () =>
    requireSave(() => {
      mutate((d) => ({
        ...d,
        water: [...d.water, { id: crypto.randomUUID(), date: today, ml: 250 }],
      }));
      toast('250 ml added.');
    });
  const lastWater = data.water.filter((w) => w.date === today).at(-1);
  return (
    <>
      <div className="overview-bond-header">
        <h1 className="sr-only">Overview</h1>
        <Link
          className="bond-summary"
          href="/bond"
          aria-label={`View ${god.name} bond, level ${bond.level}`}
        >
          <Ring value={bond.max ? 1 : bond.current} max={bond.max ? 1 : bond.needed} size={76}>
            <strong>{bond.level}</strong>
          </Ring>
          <span>
            <strong>{god.name}</strong>
            <small>{bond.max ? 'Max bond' : `${bond.current} / ${bond.needed} bond`}</small>
          </span>
        </Link>
        <span className="date-display">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      </div>
      <div className="overview-hero-grid">
        <section className="hero card">
          <div className="hero-copy">
            <h2>
              Build your
              <br />
              own <em>legend.</em>
            </h2>
            <Link href="/anatomy" className="button primary">
              Explore anatomy
            </Link>
            <div className="hero-footer">
              <span className="tiny-orbit">A</span>
              <Link href="/avatar" aria-label={`View ${god.name} in your collection`}>
                {god.name}
              </Link>
            </div>
          </div>
          <div className="hero-sculpture">
            <div className="hero-halo" />
            <div className="arch-lines" />
            <AvatarScene god={god.id as GodId} />
          </div>
        </section>
        <section className="card ritual-card">
          <div className="card-top">
            <span className="eyebrow">DAILY RITUAL</span>
            <Flame size={20} />
          </div>
          <div className="streak-number">
            {streak}
            <span>day streak</span>
          </div>
          <div className="week-dots">
            {Array.from({ length: 7 }, (_, i) => {
              const day = shiftDay(week.start, i);
              return (
                <div
                  key={day}
                  className={data.checkins.includes(day) ? 'done' : day === today ? 'today' : ''}
                >
                  <span>
                    {new Date(`${day}T12:00:00`).toLocaleDateString('en-US', { weekday: 'narrow' })}
                  </span>
                  <i>
                    {data.checkins.includes(day) ? (
                      <Check size={15} />
                    ) : day === today ? (
                      <span />
                    ) : null}
                  </i>
                </div>
              );
            })}
          </div>
          <button
            className={`button full ${checked ? 'secondary' : 'primary'}`}
            disabled={checked}
            onClick={() => setOffering(true)}
          >
            {checked ? <Check size={17} /> : <Plus size={17} />}{' '}
            {checked ? 'Checked in' : 'Choose a gift'}
          </button>
        </section>
      </div>
      <div className="metrics-grid">
        <Link href="/progress" className="card metric-card">
          <Ring value={weekly.days} max={data.profile.weeklyGoal}>
            <Dumbbell size={21} />
          </Ring>
          <div>
            <span>This week</span>
            <strong>
              {weekly.days}
              <small> / {data.profile.weeklyGoal}</small>
            </strong>
            <p>training days</p>
          </div>
        </Link>
        <div className="card metric-card water-metric">
          <Ring value={daily.water} max={data.profile.waterGoal} color="#80cfc8">
            <Droplets size={21} />
          </Ring>
          <div>
            <span>Hydration</span>
            <strong>
              {daily.water.toFixed(2).replace(/0$/, '')}
              <small> L</small>
            </strong>
            <p>of {data.profile.waterGoal} L today</p>
          </div>
          <button
            className="water-add icon-button"
            onClick={addWater}
            aria-label="Add 250 ml water"
          >
            <Plus size={17} />
          </button>
          {lastWater && (
            <button
              className="water-undo"
              aria-label="Undo last water entry"
              onClick={() => {
                mutate((d) => ({ ...d, water: d.water.filter((w) => w.id !== lastWater.id) }));
                toast('Last water entry removed.');
              }}
            >
              <Undo2 size={12} />
            </button>
          )}
        </div>
        <Link href="/progress" className="card metric-card">
          <Ring value={daily.sets} max={Math.max(daily.sets, 12)} color="#cbbb84">
            <span className="ring-number">{daily.sets}</span>
          </Ring>
          <div>
            <span>Today’s work</span>
            <strong>
              {daily.reps}
              <small> reps</small>
            </strong>
            <p>{daily.logs.length} exercises logged</p>
          </div>
        </Link>
        <Link href="/bond" className="card metric-card">
          <Ring
            value={bond.max ? 1 : bond.current}
            max={bond.max ? 1 : bond.needed}
            color="#b9a8cd"
          >
            <Heart size={21} />
          </Ring>
          <div>
            <span>{god.name}’s bond</span>
            <strong>
              {bond.level}
              <small> / LEVEL</small>
            </strong>
            <p>{bond.max ? 'Max level' : `${bond.needed - bond.current} to next level`}</p>
          </div>
        </Link>
      </div>
      <div className="overview-bottom">
        <section className="card weekly-card">
          <div className="card-top">
            <div>
              <h3>Your weekly rhythm</h3>
            </div>
            <Link href="/progress" className="text-button">
              View progress
            </Link>
          </div>
          <div className="weekly-chart">
            {Array.from({ length: 7 }, (_, i) => {
              const day = shiftDay(week.start, i),
                n = summarize(data, day, day).sets;
              return (
                <div key={day} className={day === today ? 'today' : ''}>
                  <span>{n || '—'}</span>
                  <div className="bar-track">
                    <i
                      style={{
                        height: n
                          ? `${Math.max(8, (n / Math.max(12, ...Array.from({ length: 7 }, (_, j) => summarize(data, shiftDay(week.start, j), shiftDay(week.start, j)).sets))) * 100)}%`
                          : '4px',
                      }}
                    />
                  </div>
                  <small>
                    {new Date(`${day}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short' })}
                  </small>
                </div>
              );
            })}
          </div>
          <p className="fine-print">Working sets logged · Monday to Sunday</p>
        </section>
        <section className="card explore-card">
          <div className="explore-icon">
            <Scan size={35} />
          </div>
          <h3>
            Strength starts
            <br />
            with understanding.
          </h3>
          <Link href="/anatomy" className="text-button">
            Find your next movement
          </Link>
        </section>
      </div>
      {offering && <OfferingDialog god={data.equipped} onClose={() => setOffering(false)} />}
    </>
  );
}
