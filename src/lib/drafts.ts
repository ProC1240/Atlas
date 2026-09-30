import { z } from 'zod';
const PREFIX = 'atlas.draft.v1:';
export const DRAFT_TTL = 7 * 24 * 60 * 60 * 1000;
export function draftKey(scope: string, form: string) {
  return `${PREFIX}${encodeURIComponent(scope)}:${encodeURIComponent(form)}`;
}
export function readDraft<T>(
  storage: Pick<Storage, 'getItem' | 'removeItem'>,
  key: string,
  schema: z.ZodType<T>,
  now = Date.now(),
): T | null {
  const raw = storage.getItem(key);
  if (!raw) return null;
  try {
    if (raw.length > 64000) throw new Error('size');
    const envelope = z
      .object({ version: z.literal(1), savedAt: z.number().int(), value: schema })
      .parse(JSON.parse(raw));
    if (envelope.savedAt > now || now - envelope.savedAt > DRAFT_TTL) throw new Error('expired');
    return envelope.value;
  } catch {
    storage.removeItem(key);
    return null;
  }
}
export function writeDraft<T>(
  storage: Pick<Storage, 'setItem'>,
  key: string,
  value: T,
  schema: z.ZodType<T>,
) {
  const text = JSON.stringify({ version: 1, savedAt: Date.now(), value: schema.parse(value) });
  if (text.length > 64000) throw new Error('Draft is too large.');
  storage.setItem(key, text);
}
export function clearDrafts(scope: string) {
  try {
    const prefix = `${PREFIX}${encodeURIComponent(scope)}:`;
    for (const key of Object.keys(localStorage))
      if (key.startsWith(prefix)) localStorage.removeItem(key);
  } catch {}
}
const number = z.number().finite().min(-1_000_000).max(1_000_000);
export const workoutDraftSchema = z.object({
  date: z.string().max(10),
  note: z.string().max(500),
  sets: z
    .array(z.object({ weight: number.nullable(), reps: number.nullable() }))
    .min(1)
    .max(30),
});
export const profileDraftSchema = z.object({
  name: z.string().max(40),
  height: number.nullable(),
  weight: number.nullable(),
  age: number.nullable(),
  sex: z.enum(['male', 'female']).nullable(),
  activity: number,
  waterGoal: number.nullable(),
  weeklyGoal: number.nullable(),
});
export type WorkoutDraft = z.infer<typeof workoutDraftSchema>;
export type ProfileDraft = z.infer<typeof profileDraftSchema>;
