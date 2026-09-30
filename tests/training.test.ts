import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  dateKey,
  validDay,
  shiftDay,
  rangeFor,
  emptyData,
  parseData,
  saveWorkout,
  summarize,
  checkIn,
  currentStreak,
  bodyMetrics,
  type Workout,
} from '../src/domain/training';
import { avatarProgress } from '../src/domain/avatars';
import { exercises, muscles } from '../src/domain/catalog';
import { deviceRepository, DEVICE_KEY } from '../src/lib/storage';
const fresh = () => structuredClone(emptyData);
const log = (id = 'w1'): Workout => ({
  id,
  exerciseId: 'bench-press',
  date: '2026-01-02',
  sets: [
    { weight: 40, reps: 10 },
    { weight: 40, reps: 8 },
  ],
  note: '',
  createdAt: '2026-01-02T10:00:00Z',
});
test('calendar dates reject impossible dates and preserve local date arithmetic', () => {
  assert.equal(validDay('2026-02-30'), false);
  assert.equal(validDay('2024-02-29'), true);
  assert.equal(shiftDay('2026-01-01', -1), '2025-12-31');
});
test('week starts Monday and crosses year boundaries', () =>
  assert.deepEqual(rangeFor('2026-01-01', 'week'), { start: '2025-12-29', end: '2026-01-04' }));
test('month handles leap year', () =>
  assert.deepEqual(rangeFor('2024-02-15', 'month'), { start: '2024-02-01', end: '2024-02-29' }));
test('workout upsert updates rather than duplicates', () => {
  let d = saveWorkout(fresh(), log());
  d = saveWorkout(d, { ...log(), sets: [{ weight: 45, reps: 6 }] });
  assert.equal(d.workouts.length, 1);
  assert.equal(d.workouts[0].sets[0].weight, 45);
});
test('future dates and invalid sets cannot be saved', () => {
  assert.throws(() => saveWorkout(fresh(), { ...log(), date: shiftDay(dateKey(), 1) }));
  assert.throws(() => saveWorkout(fresh(), { ...log(), sets: [{ weight: -5, reps: 2 }] }));
  assert.throws(() => saveWorkout(fresh(), { ...log(), sets: [{ weight: 0, reps: 0 }] }));
});
test('summary uses inclusive dates and external load only', () => {
  const d = saveWorkout(fresh(), log());
  const s = summarize(d, '2026-01-02', '2026-01-02');
  assert.equal(s.sets, 2);
  assert.equal(s.reps, 18);
  assert.equal(s.volume, 720);
  assert.equal(s.days, 1);
  assert.equal(s.byMuscle.chest, 2);
  assert.equal(summarize(d, '2026-01-03', '2026-01-04').sets, 0);
});
test('carries do not inflate repetition volume', () => {
  const d = saveWorkout(fresh(), {
    ...log(),
    exerciseId: 'farmer-carry',
    sets: [{ weight: 40, reps: 30 }],
  });
  assert.equal(summarize(d, '2026-01-02', '2026-01-02').volume, 0);
  assert.equal(summarize(d, '2026-01-02', '2026-01-02').sets, 1);
});
test('check-in is limited to once a day', () => {
  let d = fresh();
  d = checkIn(d, '2026-01-01');
  d = checkIn(d, '2026-01-01');
  assert.equal(d.checkins.length, 1);
});
test('streak allows today not checked yet, ignores duplicates and future dates', () => {
  assert.equal(
    currentStreak(['2026-01-01', '2026-01-02', '2026-01-02', '2026-01-04'], '2026-01-03'),
    2,
  );
  assert.equal(currentStreak(['2026-01-01'], '2026-01-04'), 0);
});
test('avatar rules count unique days', () => {
  const d = fresh();
  d.checkins = ['2026-01-01', '2026-01-01', '2026-01-02'];
  assert.equal(avatarProgress('zeus', d).unlocked, true);
  assert.equal(avatarProgress('hermes', d).unlocked, false);
  d.checkins.push('2026-01-03');
  assert.equal(avatarProgress('hermes', d).unlocked, true);
  assert.equal(avatarProgress('ares', d).unlocked, false);
});
test('backup schema rejects corrupt or unknown exercise data', () => {
  assert.throws(() => parseData({ version: 1 }));
  assert.throws(() => parseData({ ...fresh(), workouts: [{ ...log(), exerciseId: 'missing' }] }));
  assert.throws(() => parseData({ ...fresh(), profile: { ...emptyData.profile, weight: NaN } }));
  assert.deepEqual(parseData(fresh()), fresh());
});
test('body estimates require optional measurements', () => {
  assert.deepEqual(bodyMetrics(fresh().profile), { bmi: null, tdee: null });
  const m = bodyMetrics({
    ...fresh().profile,
    height: 175,
    weight: 70,
    age: 25,
    sex: 'male',
    activity: 1.2,
  });
  assert.ok(Math.abs(m.bmi! - 22.857142) < 0.001);
  assert.equal(m.tdee, 2009);
});
test('backup rejects duplicate records and unknown avatars', () => {
  assert.throws(() => parseData({ ...fresh(), workouts: [log(), log()] }));
  assert.throws(() => parseData({ ...fresh(), equipped: 'unknown' }));
});
test('all exercises have valid muscle IDs and PDF page references', () => {
  assert.equal(exercises.length, 28);
  assert.equal(new Set(exercises.map((e) => e.id)).size, 28);
  for (const e of exercises) {
    assert.ok(e.pages.length > 0);
    assert.ok(e.pages.every((p) => p >= 1 && p <= 54));
    assert.ok(e.primary.every((m) => muscles.some((g) => g.id === m)));
    assert.ok(e.cues.length >= 3);
  }
});
test('device repository persists and detects other-tab edits', async () => {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => values.get(k) ?? null,
      setItem: (k: string, v: string) => values.set(k, v),
    },
  });
  const first = deviceRepository(),
    second = deviceRepository();
  await first.load();
  await second.load();
  await first.save(saveWorkout(fresh(), log()), 0);
  assert.equal(JSON.parse(values.get(DEVICE_KEY)!).workouts.length, 1);
  await assert.rejects(() => second.save(fresh(), 0), /Another tab/);
});
