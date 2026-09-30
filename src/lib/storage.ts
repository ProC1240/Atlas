import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { emptyData, parseData, type TrainingData } from '@/domain/training';

export const DEVICE_KEY = 'atlas.training.v1';
export const MODE_KEY = 'atlas.device.enabled';
export interface Snapshot {
  data: TrainingData;
  revision: number;
}
export interface TrainingRepository {
  load(): Promise<Snapshot>;
  save(data: TrainingData, revision: number): Promise<number>;
}
let client: SupabaseClient | null = null;
export function cloudClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return client ?? (client = createClient(url, key));
}
export function deviceRepository(): TrainingRepository {
  let lastRead: string | null = null;
  return {
    async load() {
      const raw = localStorage.getItem(DEVICE_KEY);
      const data = raw ? parseData(JSON.parse(raw)) : structuredClone(emptyData);
      lastRead = raw;
      return { data, revision: 0 };
    },
    async save(data) {
      if (localStorage.getItem(DEVICE_KEY) !== lastRead)
        throw new Error(
          'Another tab changed your journal. Export this version, then reload before saving again.',
        );
      const serialized = JSON.stringify(parseData(data));
      localStorage.setItem(DEVICE_KEY, serialized);
      lastRead = serialized;
      return 0;
    },
  };
}
export function cloudRepository(userId: string): TrainingRepository {
  const db = cloudClient();
  if (!db) throw new Error('Cloud is not configured.');
  return {
    async load() {
      const { data, error } = await db
        .from('training_states')
        .select('payload,revision')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return {
        data: data ? parseData(data.payload) : structuredClone(emptyData),
        revision: data?.revision ?? 0,
      };
    },
    async save(data, revision) {
      const { data: next, error } = await db.rpc('save_training_state', {
        p_payload: parseData(data),
        p_revision: revision,
      });
      if (error)
        throw new Error(
          error.message.includes('conflict')
            ? 'Another session updated your data. Export this device, then reload before saving again.'
            : error.message,
        );
      return next as number;
    },
  };
}
