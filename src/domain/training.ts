import { z } from 'zod';
import { exerciseById, type MuscleId } from './catalog';
import { bondSchema, emptyBond } from './bond-catalog';

export function dateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function shiftDay(key: string, offset: number): string {
  const d = new Date(`${key}T12:00:00`);
  d.setDate(d.getDate() + offset);
  return dateKey(d);
}
export function validDay(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(new Date(`${value}T12:00:00`).valueOf()) &&
    dateKey(new Date(`${value}T12:00:00`)) === value
  );
}
const daySchema = z.string().refine(validDay);
export const setSchema = z.object({
  weight: z.number().finite().min(0).max(1500),
  reps: z.number().int().min(1).max(10000),
});
export const workoutSchema = z.object({
  id: z.string().min(1).max(128),
  exerciseId: z.string().refine((id) => Boolean(exerciseById[id])),
  date: daySchema,
  sets: z.array(setSchema).min(1).max(30),
  note: z.string().max(500),
  createdAt: z.string().datetime(),
});
export type Workout = z.infer<typeof workoutSchema>;
export const profileSchema = z.object({
  name: z.string().trim().min(1).max(40),
  height: z.number().min(100).max(250).nullable(),
  weight: z.number().min(25).max(400).nullable(),
  age: z.number().int().min(18).max(100).nullable(),
  sex: z.enum(['male', 'female']).nullable(),
  activity: z.number().min(1.2).max(1.9),
  waterGoal: z.number().min(0.5).max(6),
  weeklyGoal: z.number().int().min(1).max(7),
});
export const dataSchema = z.object({
  version: z.literal(1),
  profile: profileSchema,
  workouts: z
    .array(workoutSchema)
    .max(10000)
    .refine(
      (rows) => new Set(rows.map((row) => row.id)).size === rows.length,
      'Duplicate workout IDs',
    ),
  water: z
    .array(
      z.object({
        id: z.string().min(1).max(128),
        date: daySchema,
        ml: z.number().int().min(1).max(3000),
      }),
    )
    .max(30000)
    .refine(
      (rows) => new Set(rows.map((row) => row.id)).size === rows.length,
      'Duplicate water entry IDs',
    ),
  checkins: z.array(daySchema).max(10000),
  fedDays: z.array(daySchema).max(10000),
  equipped: z.enum(['zeus', 'athena', 'hermes', 'poseidon', 'ares']),
  bond: bondSchema.default(() => structuredClone(emptyBond)),
});
export type TrainingData = z.infer<typeof dataSchema>;
export const emptyData: TrainingData = {
  version: 1,
  profile: {
    name: 'Athlete',
    height: null,
    weight: null,
    age: null,
    sex: null,
    activity: 1.375,
    waterGoal: 2.5,
    weeklyGoal: 4,
  },
  workouts: [],
  water: [],
  checkins: [],
  fedDays: [],
  equipped: 'zeus',
  bond: structuredClone(emptyBond),
};
export function parseData(input: unknown): TrainingData {
  const data = dataSchema.parse(input);
  // Older journals stored whey days without identifying the recipient avatar.
  if (input && typeof input === 'object' && !('bond' in input))
    data.bond.points[data.equipped] = new Set(data.fedDays).size * 30;
  return data;
}
export function rangeFor(date: string, period: 'day' | 'week' | 'month') {
  const d = new Date(`${date}T12:00:00`);
  if (period === 'day') return { start: date, end: date };
  if (period === 'week') {
    const n = (d.getDay() + 6) % 7;
    const start = shiftDay(date, -n);
    return { start, end: shiftDay(start, 6) };
  }
  return {
    start: dateKey(new Date(d.getFullYear(), d.getMonth(), 1)),
    end: dateKey(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
  };
}
export function summarize(data: TrainingData, start: string, end: string) {
  const logs = data.workouts.filter((w) => w.date >= start && w.date <= end);
  const byMuscle: Partial<Record<MuscleId, number>> = {};
  let volume = 0,
    sets = 0,
    reps = 0;
  for (const log of logs) {
    sets += log.sets.length;
    const ex = exerciseById[log.exerciseId];
    for (const m of ex.primary) byMuscle[m] = (byMuscle[m] ?? 0) + log.sets.length;
    if (!ex.metric || ex.metric === 'reps')
      for (const s of log.sets) {
        volume += s.weight * s.reps;
        reps += s.reps;
      }
  }
  return {
    logs,
    sets,
    reps,
    volume,
    days: new Set(logs.map((w) => w.date)).size,
    water:
      data.water.filter((w) => w.date >= start && w.date <= end).reduce((a, w) => a + w.ml, 0) /
      1000,
    byMuscle,
  };
}
export function currentStreak(days: string[], today = dateKey()): number {
  const unique = new Set(days);
  let cursor = unique.has(today) ? today : shiftDay(today, -1),
    count = 0;
  while (unique.has(cursor)) {
    count++;
    cursor = shiftDay(cursor, -1);
  }
  return count;
}
export function checkIn(data: TrainingData, today = dateKey()): TrainingData {
  if (data.checkins.includes(today)) return data;
  return { ...data, checkins: [...data.checkins, today] };
}
export function saveWorkout(data: TrainingData, workout: Workout): TrainingData {
  const valid = workoutSchema.parse(workout);
  if (valid.date > dateKey()) throw new Error('Choose today or an earlier date.');
  return { ...data, workouts: [valid, ...data.workouts.filter((w) => w.id !== valid.id)] };
}
export function bodyMetrics(p: TrainingData['profile']) {
  const bmi = p.weight && p.height ? p.weight / (p.height / 100) ** 2 : null;
  const bmr =
    p.weight && p.height && p.age && p.sex
      ? 10 * p.weight + 6.25 * p.height - 5 * p.age + (p.sex === 'male' ? 5 : -161)
      : null;
  return { bmi, tdee: bmr ? Math.round(bmr * p.activity) : null };
}
