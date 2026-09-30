import { z } from 'zod';
import type { GodId } from './avatars';

export const items = {
  whey: { name: 'Whey Sachet', points: 25, color: '#c4efaa' },
  goblet: { name: 'Greek Goblet', points: 35, color: '#dab978' },
  smallWhey: { name: 'Small Whey', points: 15, color: '#b0ce98' },
  grapes: { name: 'Grapes', points: 30, color: '#baa5db' },
  ambrosia: { name: 'Ambrosia', points: 60, color: '#e5c788' },
} as const;
export type ItemId = keyof typeof items;
export type DailyItemId = 'whey' | 'goblet';
export type RewardItemId = 'smallWhey' | 'grapes' | 'ambrosia';
export const dailyItems: DailyItemId[] = ['whey', 'goblet'];
export const rewardItems: RewardItemId[] = ['smallWhey', 'grapes', 'ambrosia'];
const points = z.number().int().min(0).max(10000000);
const stock = z.number().int().min(0).max(10000);
export const bondSchema = z.object({
  points: z.object({
    zeus: points,
    athena: points,
    hermes: points,
    poseidon: points,
    ares: points,
  }),
  inventory: z.object({ smallWhey: stock, grapes: stock, ambrosia: stock }),
  claimed: z
    .array(z.string().regex(/^(zeus|athena|hermes|poseidon|ares):[2-6]$/))
    .max(25)
    .refine((rows) => new Set(rows).size === rows.length),
});
export const emptyBond: z.infer<typeof bondSchema> = {
  points: { zeus: 0, athena: 0, hermes: 0, poseidon: 0, ares: 0 },
  inventory: { smallWhey: 0, grapes: 0, ambrosia: 0 },
  claimed: [],
};
interface Reward {
  level: number;
  item: RewardItemId;
  quantity: number;
}
interface BondPath {
  thresholds: number[];
  rewards: Reward[];
}
function path(thresholds: number[], order: RewardItemId[]): BondPath {
  return {
    thresholds,
    rewards: order.map((item, i) => ({ level: i + 2, item, quantity: i === 2 || i === 4 ? 2 : 1 })),
  };
}
export const bondPaths: Record<GodId, BondPath> = {
  zeus: path(
    [0, 60, 140, 240, 360, 500],
    ['smallWhey', 'grapes', 'smallWhey', 'ambrosia', 'grapes'],
  ),
  athena: path(
    [0, 50, 130, 230, 350, 490],
    ['grapes', 'smallWhey', 'grapes', 'ambrosia', 'smallWhey'],
  ),
  hermes: path(
    [0, 45, 110, 200, 315, 455],
    ['smallWhey', 'grapes', 'grapes', 'smallWhey', 'ambrosia'],
  ),
  poseidon: path(
    [0, 65, 150, 255, 380, 525],
    ['grapes', 'smallWhey', 'smallWhey', 'ambrosia', 'ambrosia'],
  ),
  ares: path(
    [0, 70, 160, 270, 400, 550],
    ['smallWhey', 'smallWhey', 'grapes', 'ambrosia', 'smallWhey'],
  ),
};
