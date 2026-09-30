import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyData, parseData } from '../src/domain/training';
import {
  bondProgress,
  bondProgressForPoints,
  bondPaths,
  claimReward,
  dailyAvailable,
  giveDailyItem,
  giveRewardItem,
} from '../src/domain/bond';
const fresh = () => structuredClone(emptyData);
test('animated bond readings use the same level boundaries as saved progress', () => {
  assert.deepEqual(bondProgressForPoints(59, 'zeus'), {
    total: 59,
    level: 1,
    current: 59,
    needed: 60,
    max: false,
  });
  assert.deepEqual(bondProgressForPoints(60, 'zeus'), {
    total: 60,
    level: 2,
    current: 0,
    needed: 80,
    max: false,
  });
  assert.equal(bondProgressForPoints(50, 'athena').level, 2);
  assert.equal(bondProgressForPoints(500, 'zeus').max, true);
});
test('daily offering checks in and adds the item value once', () => {
  const d = giveDailyItem(fresh(), 'whey', 'zeus', '2026-09-01');
  assert.deepEqual(d.checkins, ['2026-09-01']);
  assert.equal(d.bond.points.zeus, 25);
  assert.equal(giveDailyItem(d, 'goblet', 'athena', '2026-09-01'), d);
  assert.equal(dailyAvailable(d, '2026-09-01'), false);
});
test('goblet grants a different value and each avatar has its own level', () => {
  let d = giveDailyItem(fresh(), 'goblet', 'zeus', '2026-09-01');
  d = giveDailyItem(d, 'goblet', 'zeus', '2026-09-02');
  assert.equal(d.bond.points.zeus, 70);
  assert.equal(bondProgress(d, 'zeus').level, 2);
  assert.equal(bondProgress(d, 'athena').level, 1);
  assert.equal(d.bond.points.athena, 0);
});
test('level gates and reward claim are idempotent', () => {
  let d = fresh();
  assert.equal(claimReward(d, 'zeus', 2), d);
  d.bond.points.zeus = 60;
  d = claimReward(d, 'zeus', 2);
  assert.equal(d.bond.inventory.smallWhey, 1);
  assert.equal(claimReward(d, 'zeus', 2), d);
  assert.equal(claimReward(d, 'athena', 2), d);
  assert.equal(claimReward(d, 'zeus', 999), d);
});
test('reward inventory is consumed once and adds bond to the selected avatar', () => {
  let d = fresh();
  d.bond.points.zeus = 60;
  d = claimReward(d, 'zeus', 2);
  d = giveRewardItem(d, 'smallWhey', 'athena');
  assert.equal(d.bond.inventory.smallWhey, 0);
  assert.equal(d.bond.points.athena, 15);
  assert.equal(d.bond.points.zeus, 60);
  assert.equal(giveRewardItem(d, 'smallWhey', 'athena'), d);
  assert.deepEqual(d.checkins, []);
});
test('locked avatars cannot receive gifts or claim rewards', () => {
  const d = fresh();
  d.bond.points.ares = 1000;
  d.bond.inventory.ambrosia = 1;
  assert.equal(giveDailyItem(d, 'goblet', 'ares', '2026-09-01'), d);
  assert.equal(giveRewardItem(d, 'ambrosia', 'ares'), d);
  assert.equal(claimReward(d, 'ares', 2), d);
});
test('avatars have independent reward paths and capped displayed level', () => {
  assert.notDeepEqual(bondPaths.zeus, bondPaths.athena);
  const d = fresh();
  d.bond.points.zeus = 1000;
  assert.equal(bondProgress(d).level, 6);
  assert.equal(bondProgress(d).max, true);
});
test('legacy journals keep workouts and migrate old whey progress once', () => {
  const { bond, ...old } = fresh();
  old.fedDays = ['2026-09-01', '2026-09-02'];
  old.checkins = [...old.fedDays];
  const migrated = parseData(old);
  assert.equal(migrated.bond.points.zeus, 60);
  assert.deepEqual(migrated.checkins, old.checkins);
  assert.deepEqual(parseData(JSON.parse(JSON.stringify(migrated))), migrated);
});
test('backup validation rejects negative inventory and duplicate claims', () => {
  const d = fresh();
  d.bond.inventory.grapes = -1;
  assert.throws(() => parseData(d));
  d.bond.inventory.grapes = 0;
  d.bond.claimed = ['zeus:2', 'zeus:2'];
  assert.throws(() => parseData(d));
});
