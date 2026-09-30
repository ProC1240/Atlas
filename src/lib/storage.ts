import { emptyData, parseData, type TrainingData } from '@/domain/training';
import { apiRequest } from './api-client';

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
  return {
    async load() {
      const snapshot = await apiRequest<Snapshot>('/api/journal', { userId });
      return { data: parseData(snapshot.data), revision: snapshot.revision };
    },
    async save(data, revision) {
      const result = await apiRequest<{ revision: number }>('/api/journal', {
        method: 'PUT',
        userId,
        body: { data: parseData(data), revision },
      });
      return result.revision;
    },
  };
}
