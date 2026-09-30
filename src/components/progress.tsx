'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, CalendarDays, Dumbbell, Pencil, Trash2 } from 'lucide-react';
import {
  dateKey,
  rangeFor,
  summarize,
  shiftDay,
  bodyMetrics,
  type Workout,
} from '@/domain/training';
import { exerciseById, muscleById, type MuscleId } from '@/domain/catalog';
import { useTraining } from './store';
import { SectionHeading, Dialog } from './ui';
import { ExerciseDialog } from './exercise-dialog';
export function Progress() {
  const { data, mutate, toast } = useTraining();
  const [date, setDate] = useState(dateKey()),
    [period, setPeriod] = useState<'day' | 'week' | 'month'>('week'),
    [editing, setEditing] = useState<Workout | null>(null),
    [deleting, setDeleting] = useState<Workout | null>(null);
  const { start, end } = rangeFor(date, period),
    stats = summarize(data, start, end),
    metrics = bodyMetrics(data.profile);
  const sorted = [...stats.logs].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
  );
  function step(direction: number) {
    if (period === 'month') {
      const d = new Date(`${date}T12:00:00`);
      setDate(dateKey(new Date(d.getFullYear(), d.getMonth() + direction, 1)));
    } else setDate(shiftDay(date, direction * (period === 'week' ? 7 : 1)));
  }
  const chartDays: Array<string> = [];
  for (let day = start; day <= end; day = shiftDay(day, 1)) chartDays.push(day);
  const maxSets = Math.max(1, ...chartDays.map((d) => summarize(data, d, d).sets));
  return (
    <>
      <SectionHeading title="Your progress.">
        <Link className="button secondary" href="/anatomy">
          Log a workout
        </Link>
      </SectionHeading>
      <div className="progress-controls">
        <div className="segmented">
          {(['day', 'week', 'month'] as const).map((p) => (
            <button key={p} className={period === p ? 'active' : ''} onClick={() => setPeriod(p)}>
              {p[0].toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
        <div className="date-picker">
          <button className="icon-button" aria-label="Previous period" onClick={() => step(-1)}>
            <ArrowLeft size={17} />
          </button>
          <label>
            <CalendarDays size={16} />
            <input
              aria-label="Choose progress date"
              type="date"
              value={date}
              onChange={(e) => {
                if (e.target.value) setDate(e.target.value);
              }}
            />
          </label>
          <button className="icon-button" aria-label="Next period" onClick={() => step(1)}>
            <ArrowRight size={17} />
          </button>
        </div>
        <span className="quiet-label">{start === end ? start : `${start} — ${end}`}</span>
      </div>
      <div className="progress-summary">
        <div className="card">
          <span className="eyebrow">TRAINING DAYS</span>
          <strong>
            {stats.days}
            <small> days</small>
          </strong>
        </div>
        <div className="card">
          <span className="eyebrow">WORKING SETS</span>
          <strong>
            {stats.sets}
            <small> sets</small>
          </strong>
        </div>
        <div className="card">
          <span className="eyebrow">EXTERNAL LOAD VOLUME</span>
          <strong>
            {stats.volume.toLocaleString()}
            <small> kg·reps</small>
          </strong>
        </div>
        <div className="card">
          <span className="eyebrow">WATER LOGGED</span>
          <strong>
            {stats.water.toFixed(2).replace(/0$/, '')}
            <small> L</small>
          </strong>
        </div>
      </div>
      <div className="progress-main">
        <section className="card history-card">
          <div className="card-top">
            <h3>Training activity</h3>
            <span className="tag">
              {period === 'day' ? 'Today’s selection' : `${chartDays.length} days`}
            </span>
          </div>
          <div className={`activity-chart ${period === 'month' ? 'month' : ''}`}>
            {chartDays.map((d, i) => {
              const n = summarize(data, d, d).sets;
              return (
                <div key={d} title={`${d}: ${n} sets`}>
                  <span>{n || ''}</span>
                  <div className="bar-track">
                    <i style={{ height: n ? `${Math.max(5, (n / maxSets) * 100)}%` : '3px' }} />
                  </div>
                  <small>
                    {period === 'week'
                      ? new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short' })
                      : period === 'month'
                        ? i % 5 === 0
                          ? Number(d.slice(-2))
                          : ''
                        : Number(d.slice(-2))}
                  </small>
                </div>
              );
            })}
          </div>
          <p className="fine-print">
            Sets logged. Volume excludes carries and bodyweight contribution.
          </p>
        </section>
        <section className="card muscle-balance">
          <h3>Where you focused</h3>
          {Object.entries(stats.byMuscle).length ? (
            Object.entries(stats.byMuscle)
              .sort((a, b) => b[1] - a[1])
              .map(([m, sets]) => (
                <div key={m}>
                  <span>
                    {muscleById[m as MuscleId].name}
                    <small>{sets} sets</small>
                  </span>
                  <div className="linear-track">
                    <i
                      style={{
                        width: `${(sets / Math.max(...(Object.values(stats.byMuscle) as number[]))) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))
          ) : (
            <div className="empty-state compact">
              <Dumbbell size={26} />
              <p>Your first workout starts the story.</p>
            </div>
          )}
          <p className="fine-print">
            Primary muscle sets. Compound exercises can count toward more than one group.
          </p>
        </section>
      </div>
      <section className="card journal">
        <div className="card-top">
          <h3>Training journal</h3>
          <span className="quiet-label">{sorted.length} entries</span>
        </div>
        {sorted.length ? (
          sorted.map((w) => {
            const ex = exerciseById[w.exerciseId];
            return (
              <div className="journal-row" key={w.id}>
                <div className="journal-date">
                  <strong>{Number(w.date.slice(-2))}</strong>
                  <span>
                    {new Date(`${w.date}T12:00:00`).toLocaleDateString('en-US', { month: 'short' })}
                  </span>
                </div>
                <div className="journal-name">
                  <strong>{ex.name}</strong>
                  <p>
                    {w.sets.length} sets ·{' '}
                    {w.sets
                      .map((s) => `${s.weight} kg × ${s.reps}${ex.metric === 'meters' ? ' m' : ''}`)
                      .join(' / ')}
                  </p>
                  {w.note && <small>{w.note}</small>}
                </div>
                <button
                  className="icon-button"
                  aria-label={`Edit ${ex.name}`}
                  onClick={() => setEditing(w)}
                >
                  <Pencil size={16} />
                </button>
                <button
                  className="icon-button"
                  aria-label={`Delete ${ex.name}`}
                  onClick={() => setDeleting(w)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })
        ) : (
          <div className="empty-state">
            <CalendarDays size={30} />
            <h3>A fresh page.</h3>
            <p>No workouts in this period.</p>
            <Link className="button secondary" href="/anatomy">
              Find an exercise
            </Link>
          </div>
        )}
      </section>
      <div className="body-metrics">
        <div>
          <span className="eyebrow">BODY SNAPSHOT</span>
          <p>Current profile · not historical measurements</p>
        </div>
        <div>
          <span>BMI estimate</span>
          <strong>{metrics.bmi ? metrics.bmi.toFixed(1) : '—'}</strong>
        </div>
        <div>
          <span>TDEE estimate</span>
          <strong>
            {metrics.tdee ? metrics.tdee.toLocaleString() : '—'}
            <small> kcal/day</small>
          </strong>
        </div>
        <Link href="/me" className="text-button">
          Edit profile
        </Link>
        <p className="fine-print">
          Adult estimates, not a diagnosis or calorie prescription. BMI does not measure body
          composition. TDEE uses the Mifflin–St Jeor equation with your activity factor.
        </p>
      </div>
      {editing && (
        <ExerciseDialog
          exercise={exerciseById[editing.exerciseId]}
          existing={editing}
          onClose={() => setEditing(null)}
        />
      )}{' '}
      {deleting && (
        <Dialog title="Remove workout" onClose={() => setDeleting(null)}>
          <h2>Delete this entry?</h2>
          <p className="body-copy">
            {exerciseById[deleting.exerciseId].name} · {deleting.date}. This cannot be undone.
          </p>
          <div className="dialog-actions">
            <button className="button secondary" onClick={() => setDeleting(null)}>
              Keep entry
            </button>
            <button
              className="button danger"
              onClick={() => {
                mutate((d) => ({ ...d, workouts: d.workouts.filter((w) => w.id !== deleting.id) }));
                setDeleting(null);
                toast('Workout removed.');
              }}
            >
              Delete entry
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
