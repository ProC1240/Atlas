'use client';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { RotateCcw, Search, SlidersHorizontal, Move3D, BookOpen, X } from 'lucide-react';
import { exercises, muscles, muscleById, type Exercise, type MuscleId } from '@/domain/catalog';
import { SectionHeading } from './ui';
import { ExerciseDialog } from './exercise-dialog';
const AnatomyScene = dynamic(() => import('./scene').then((m) => m.AnatomyScene), {
  ssr: false,
  loading: () => (
    <div className="scene-fallback">
      <span className="loading-orbit" />
    </div>
  ),
});
export function Anatomy() {
  const [selected, setSelected] = useState<MuscleId | null>(null),
    [back, setBack] = useState(false),
    [reset, setReset] = useState(0),
    [search, setSearch] = useState(''),
    [equipment, setEquipment] = useState('All equipment'),
    [location, setLocation] = useState('Anywhere'),
    [type, setType] = useState('All types'),
    [pattern, setPattern] = useState('All patterns'),
    [emphasis, setEmphasis] = useState('All regions'),
    [filters, setFilters] = useState(false),
    [expanded, setExpanded] = useState(false),
    [active, setActive] = useState<Exercise | null>(null);
  const muscle = selected ? muscleById[selected] : null;
  function choose(id: MuscleId) {
    setSelected(id);
    setBack(muscleById[id].view === 'back');
    setEmphasis('All regions');
    setReset((n) => n + 1);
  }
  const filtered = exercises.filter(
    (e) =>
      (!selected || e.primary.includes(selected)) &&
      e.name.toLowerCase().includes(search.toLowerCase()) &&
      (equipment === 'All equipment' ||
        (equipment === 'Free weights'
          ? ['Dumbbell', 'Barbell'].includes(e.equipment)
          : e.equipment === equipment)) &&
      (location === 'Anywhere' || e.location.includes(location as 'Home' | 'Gym')) &&
      (type === 'All types' || e.type === type) &&
      (pattern === 'All patterns' || e.pattern === pattern) &&
      (emphasis === 'All regions' || e.emphasis === emphasis),
  );
  return (
    <>
      <SectionHeading title="Find your focus.">
        <span className="quiet-label">
          <span className="status-dot" />
          28 guide-based exercises
        </span>
      </SectionHeading>
      <div className="anatomy-layout">
        <section className="anatomy-stage card">
          <div className="stage-heading">
            <span className="eyebrow">INTERACTIVE ANATOMY</span>
            <div className="segmented small">
              <button
                className={!back ? 'active' : ''}
                onClick={() => {
                  setBack(false);
                  setReset((n) => n + 1);
                }}
              >
                Front
              </button>
              <button
                className={back ? 'active' : ''}
                onClick={() => {
                  setBack(true);
                  setReset((n) => n + 1);
                }}
              >
                Back
              </button>
            </div>
          </div>
          <div className="stage-orbit" />
          <AnatomyScene selected={selected} onSelect={choose} back={back} reset={reset} />
          <div className="stage-bottom">
            <span>
              <Move3D size={15} />
              Drag to rotate · Click to explore
            </span>
            <button
              className="icon-button"
              aria-label="Reset full body view"
              onClick={() => {
                setSelected(null);
                setBack(false);
                setReset((n) => n + 1);
                setEmphasis('All regions');
              }}
            >
              <RotateCcw size={17} />
            </button>
          </div>
          <p className="model-disclaimer">Stylized 3D illustration · Not a medical model</p>
          {selected && (
            <div className="selected-label">
              <span className="red-dot" />
              {muscle?.name}
              <button
                aria-label="Clear muscle selection"
                onClick={() => {
                  setSelected(null);
                  setEmphasis('All regions');
                }}
              >
                <X size={14} />
              </button>
            </div>
          )}
        </section>
        <section className="anatomy-browser">
          <div className="muscle-picker" aria-label="Muscle groups">
            {muscles.map((m) => (
              <button
                key={m.id}
                className={selected === m.id ? 'active' : ''}
                onClick={() => choose(m.id)}
              >
                {m.name}
              </button>
            ))}
          </div>
          {muscle ? (
            <div className="muscle-info">
              <button
                className="back-link"
                onClick={() => {
                  setSelected(null);
                  setEmphasis('All regions');
                }}
              >
                All muscles
              </button>
              <div className="muscle-title">
                <h2>{muscle.name}</h2>
                <span className="tag coral">{muscle.latin}</span>
              </div>
              <p>{muscle.description}</p>
              <details>
                <summary>
                  Structures <span>{muscle.structures.length}</span>
                </summary>
                <ul>
                  {muscle.structures.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
                <small>
                  Guide pages {muscle.pages.join(', ')}. Visible surface regions are simplified.
                </small>
              </details>
              {selected === 'chest' && (
                <div className="region-pills">
                  {[
                    ['All regions', 'All regions'],
                    ['Clavicular', 'Upper · clavicular'],
                    ['Sternocostal', 'Sternocostal'],
                  ].map(([v, t]) => (
                    <button
                      key={v}
                      className={emphasis === v ? 'active' : ''}
                      onClick={() => setEmphasis(v)}
                    >
                      {t}
                    </button>
                  ))}
                  <span className="fine-print">
                    Regional emphasis, not separate “upper / middle / lower” muscles.
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="muscle-info">
              <h2>
                A little knowledge.
                <br />A stronger you.
              </h2>
              <p>Select a muscle on the sculpture, or explore the library below.</p>
            </div>
          )}
          <div className="library-toolbar">
            <label className="search-field">
              <Search size={17} />
              <input
                aria-label="Search exercises"
                placeholder="Find an exercise"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <button
              className={`icon-button filter-button ${filters ? 'selected' : ''}`}
              aria-label="Exercise filters"
              aria-expanded={filters}
              onClick={() => setFilters(!filters)}
            >
              <SlidersHorizontal size={18} />
            </button>
          </div>
          {filters && (
            <div className="filter-grid">
              {[
                {
                  label: 'Equipment',
                  value: equipment,
                  set: setEquipment,
                  options: [
                    'All equipment',
                    'Free weights',
                    'Bodyweight',
                    'Dumbbell',
                    'Barbell',
                    'Cable',
                    'Machine',
                    'Pull-up bar',
                  ],
                },
                {
                  label: 'Location',
                  value: location,
                  set: setLocation,
                  options: ['Anywhere', 'Home', 'Gym'],
                },
                {
                  label: 'Type',
                  value: type,
                  set: setType,
                  options: ['All types', 'Compound', 'Isolation', 'Carry', 'Anti-rotation'],
                },
                {
                  label: 'Pattern',
                  value: pattern,
                  set: setPattern,
                  options: [
                    'All patterns',
                    'Push',
                    'Pull',
                    'Squat',
                    'Hinge',
                    'Lunge',
                    'Carry',
                    'Rotation',
                    'Accessory',
                  ],
                },
              ].map((f) => (
                <label key={f.label}>
                  {f.label}
                  <select value={f.value} onChange={(e) => f.set(e.target.value)}>
                    {f.options.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          )}
          <div className="list-caption">
            <span>{filtered.length} EXERCISES</span>
            <span>
              PDF-REFERENCED <BookOpen size={12} />
            </span>
          </div>
          <div className="exercise-list">
            {(expanded ? filtered : filtered.slice(0, 8)).map((e, i) => (
              <button className="exercise-row" key={e.id} onClick={() => setActive(e)}>
                <span className="exercise-num">{String(i + 1).padStart(2, '0')}</span>
                <span>
                  <strong>{e.name}</strong>
                  <small>
                    {e.equipment}
                    <i /> {e.type}
                  </small>
                </span>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="empty-state">
                <Search size={28} />
                <h3>No exercises match.</h3>
                <button
                  className="text-button"
                  onClick={() => {
                    setSearch('');
                    setEquipment('All equipment');
                    setLocation('Anywhere');
                    setType('All types');
                    setPattern('All patterns');
                    setEmphasis('All regions');
                  }}
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
          {filtered.length > 8 && (
            <button
              className="button secondary full library-expand"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? 'Show fewer exercises' : `View all ${filtered.length} exercises`}
            </button>
          )}
        </section>
      </div>
      {active && <ExerciseDialog exercise={active} onClose={() => setActive(null)} />}
    </>
  );
}
