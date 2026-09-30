import { type TrainingData } from './training';
export type GodId = 'zeus' | 'athena' | 'hermes' | 'poseidon' | 'ares';
export const avatars = [
  {
    id: 'zeus' as const,
    name: 'Zeus',
    title: 'The sky keeper',
    accent: '#b7d9be',
    description: 'Quiet power. Unshakable resolve.',
    rule: 'Free starter',
    requirement: 0,
    kind: 'free',
  },
  {
    id: 'athena' as const,
    name: 'Athena',
    title: 'The wise warrior',
    accent: '#c9c29b',
    description: 'Train with intention.',
    rule: 'Free starter',
    requirement: 0,
    kind: 'free',
  },
  {
    id: 'hermes' as const,
    name: 'Hermes',
    title: 'The swift messenger',
    accent: '#b5d7d2',
    description: 'Small steps. Relentless momentum.',
    rule: 'Check in on 3 days',
    requirement: 3,
    kind: 'checkins',
  },
  {
    id: 'poseidon' as const,
    name: 'Poseidon',
    title: 'The tide master',
    accent: '#87b8c9',
    description: 'Find your rhythm.',
    rule: 'Train on 5 days',
    requirement: 5,
    kind: 'training',
  },
  {
    id: 'ares' as const,
    name: 'Ares',
    title: 'The iron will',
    accent: '#c79783',
    description: 'Earn your strength.',
    rule: 'Check in on 7 days',
    requirement: 7,
    kind: 'checkins',
  },
];
export function avatarProgress(id: string, data: TrainingData) {
  const a = avatars.find((a) => a.id === id) ?? avatars[0];
  const current =
    a.kind === 'free'
      ? 0
      : a.kind === 'training'
        ? new Set(data.workouts.map((w) => w.date)).size
        : new Set(data.checkins).size;
  return {
    unlocked: a.kind === 'free' || current >= a.requirement,
    current,
    required: a.requirement,
  };
}
