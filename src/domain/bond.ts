import { avatarProgress, type GodId } from './avatars';
import { checkIn, dateKey, type TrainingData } from './training';
import {
  bondPaths,
  dailyItems,
  items,
  rewardItems,
  type DailyItemId,
  type RewardItemId,
} from './bond-catalog';
export * from './bond-catalog';

export function bondProgress(data: TrainingData, god: GodId = data.equipped) {
  return bondProgressForPoints(data.bond.points[god], god);
}
export function bondProgressForPoints(total: number, god: GodId) {
  const thresholds = bondPaths[god].thresholds;
  let index = 0;
  while (index < thresholds.length - 1 && total >= thresholds[index + 1]) index++;
  const max = index === thresholds.length - 1;
  return {
    total,
    level: index + 1,
    current: total - thresholds[index],
    needed: max ? 0 : thresholds[index + 1] - thresholds[index],
    max,
  };
}
export function dailyAvailable(data: TrainingData, today = dateKey()) {
  return !data.fedDays.includes(today);
}
export function giveDailyItem(
  data: TrainingData,
  item: DailyItemId,
  god: GodId = data.equipped,
  today = dateKey(),
): TrainingData {
  if (
    !dailyItems.includes(item) ||
    !avatarProgress(god, data).unlocked ||
    !dailyAvailable(data, today)
  )
    return data;
  const checked = checkIn(data, today);
  return {
    ...checked,
    fedDays: [...data.fedDays, today],
    bond: {
      ...data.bond,
      points: { ...data.bond.points, [god]: data.bond.points[god] + items[item].points },
    },
  };
}
export function claimReward(data: TrainingData, god: GodId, level: number): TrainingData {
  const reward = bondPaths[god].rewards.find((r) => r.level === level),
    key = `${god}:${level}`;
  if (
    !reward ||
    !avatarProgress(god, data).unlocked ||
    bondProgress(data, god).level < level ||
    data.bond.claimed.includes(key)
  )
    return data;
  return {
    ...data,
    bond: {
      ...data.bond,
      claimed: [...data.bond.claimed, key],
      inventory: {
        ...data.bond.inventory,
        [reward.item]: data.bond.inventory[reward.item] + reward.quantity,
      },
    },
  };
}
export function giveRewardItem(
  data: TrainingData,
  item: RewardItemId,
  god: GodId = data.equipped,
): TrainingData {
  if (
    !rewardItems.includes(item) ||
    !avatarProgress(god, data).unlocked ||
    data.bond.inventory[item] < 1
  )
    return data;
  return {
    ...data,
    bond: {
      ...data.bond,
      inventory: { ...data.bond.inventory, [item]: data.bond.inventory[item] - 1 },
      points: { ...data.bond.points, [god]: data.bond.points[god] + items[item].points },
    },
  };
}
