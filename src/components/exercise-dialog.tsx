'use client';
import { useState } from 'react';
import { Check, Plus, Trash2, BookOpen } from 'lucide-react';
import { type Exercise, muscleById, source } from '@/domain/catalog';
import { dateKey, saveWorkout, workoutSchema, type Workout } from '@/domain/training';
import { useTraining } from './store';
import { Dialog } from './ui';
import { Movement } from './movement';

export function ExerciseDialog({
  exercise,
  onClose,
  existing,
}: {
  exercise: Exercise;
  onClose: () => void;
  existing?: Workout;
}) {
  const { mutate, requireSave, toast } = useTraining();
  const [tab, setTab] = useState<'learn' | 'log'>(existing ? 'log' : 'learn');
  const [sets, setSets] = useState(
      existing?.sets ?? [
        { weight: 0, reps: 10 },
        { weight: 0, reps: 10 },
        { weight: 0, reps: 10 },
      ],
    ),
    [date, setDate] = useState(existing?.date ?? dateKey()),
    [note, setNote] = useState(existing?.note ?? ''),
    [error, setError] = useState('');
  const unit =
    exercise.metric === 'meters' ? 'Meters' : exercise.metric === 'seconds' ? 'Seconds' : 'Reps';
  function submit() {
    setError('');
    try {
      const workout: Workout = workoutSchema.parse({
        id: existing?.id ?? crypto.randomUUID(),
        exerciseId: exercise.id,
        date,
        sets,
        note,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      });
      if (date > dateKey()) throw new Error('Future date');
      requireSave(() => {
        mutate((d) => saveWorkout(d, workout));
        toast(existing ? 'Workout updated.' : 'Workout saved. One step stronger.');
        onClose();
      });
    } catch {
      setError('Check the date and sets. Use a non-negative load and at least 1 rep or meter.');
    }
  }
  return (
    <Dialog title="Exercise library" onClose={onClose} wide>
      <div className="exercise-dialog-top">
        <div>
          <div className="pills">
            <span className="tag">{exercise.equipment}</span>
            <span className="tag muted">{exercise.type}</span>
          </div>
          <h2>{exercise.name}</h2>
        </div>
        <div className="segmented">
          <button className={tab === 'learn' ? 'active' : ''} onClick={() => setTab('learn')}>
            Learn
          </button>
          <button className={tab === 'log' ? 'active' : ''} onClick={() => setTab('log')}>
            Log workout
          </button>
        </div>
      </div>
      {tab === 'learn' ? (
        <div className="exercise-learn">
          <Movement exercise={exercise} />
          <div className="exercise-copy">
            <p className="eyebrow">TARGET MUSCLES</p>
            <div className="pills">
              {exercise.primary.map((m) => (
                <span className="tag" key={m}>
                  {muscleById[m].name}
                </span>
              ))}
            </div>
            <p className="body-copy">{exercise.summary}</p>
            <ol className="cues">
              {exercise.cues.map((cue, i) => (
                <li key={cue}>
                  <span>0{i + 1}</span>
                  {cue}
                </li>
              ))}
            </ol>
            <div className="source-note">
              <BookOpen size={15} />
              <span>
                {source.title}
                <br />
                <strong>Pages {exercise.pages.join(', ')}</strong> · Adapted cues
              </span>
            </div>
            <p className="fine-print">
              Use a comfortable, controlled range. Stop if you develop sharp or increasing pain.
            </p>
            <button className="button primary full" onClick={() => setTab('log')}>
              Log this exercise
            </button>
          </div>
        </div>
      ) : (
        <form
          className="log-form"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="form-top">
            <label>
              Training date
              <input
                type="date"
                value={date}
                max={dateKey()}
                required
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <p className="fine-print">
              Load in kg. Use 0 for bodyweight.
              <br />
              Dumbbells: enter combined external load.
            </p>
          </div>
          <div className="sets-header">
            <span>SET</span>
            <span>LOAD · KG</span>
            <span>{unit.toUpperCase()}</span>
            <span />
          </div>
          {sets.map((set, i) => (
            <div className="set-row" key={i}>
              <span className="set-number">{String(i + 1).padStart(2, '0')}</span>
              <input
                aria-label={`Set ${i + 1} weight`}
                type="number"
                min="0"
                max="1500"
                step=".25"
                required
                value={set.weight}
                onChange={(e) =>
                  setSets(
                    sets.map((s, j) => (j === i ? { ...s, weight: e.target.valueAsNumber } : s)),
                  )
                }
              />
              <input
                aria-label={`Set ${i + 1} ${unit.toLowerCase()}`}
                type="number"
                min="1"
                max="10000"
                step="1"
                required
                value={set.reps}
                onChange={(e) =>
                  setSets(
                    sets.map((s, j) => (j === i ? { ...s, reps: e.target.valueAsNumber } : s)),
                  )
                }
              />
              <button
                type="button"
                className="icon-button"
                disabled={sets.length === 1}
                aria-label={`Remove set ${i + 1}`}
                onClick={() => setSets(sets.filter((_, j) => j !== i))}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="button secondary full"
            disabled={sets.length >= 30}
            onClick={() => setSets([...sets, { ...sets[sets.length - 1] }])}
          >
            <Plus size={17} />
            Add set
          </button>
          <label className="note-label">
            Notes <span className="dim">optional</span>
            <textarea
              maxLength={500}
              placeholder="How did it feel?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="button primary full" type="submit">
            <Check size={18} />
            {existing ? 'Save changes' : 'Save workout'}
          </button>
        </form>
      )}
    </Dialog>
  );
}
