'use client';
import { useRef, useState } from 'react';
import { Check, Heart } from 'lucide-react';
import { avatars, type GodId } from '@/domain/avatars';
import {
  dailyAvailable,
  dailyItems,
  giveDailyItem,
  giveRewardItem,
  items,
  rewardItems,
  type ItemId,
  type RewardItemId,
} from '@/domain/bond';
import { Dialog } from './ui';
import { ItemArt } from './item-art';
import { useTraining } from './store';
import { OfferingCelebration, type OfferingReceipt } from './offering-celebration';

export function OfferingDialog({ onClose, god }: { onClose: () => void; god: GodId }) {
  const { data, mutate, requireSave, toast } = useTraining();
  const [selected, setSelected] = useState<ItemId>(() =>
    dailyAvailable(data)
      ? 'whey'
      : (rewardItems.find((id) => data.bond.inventory[id] > 0) ?? 'whey'),
  );
  const [receipt, setReceipt] = useState<OfferingReceipt | null>(null);
  const submitted = useRef(false);
  const available = dailyAvailable(data);
  const isDaily = selected === 'whey' || selected === 'goblet';
  const canGive = isDaily ? available : data.bond.inventory[selected as RewardItemId] > 0;
  const owned = rewardItems.filter((id) => data.bond.inventory[id] > 0);
  const name = avatars.find((a) => a.id === god)!.name;
  function give() {
    if (submitted.current) return;
    requireSave(() => {
      if (submitted.current) return;
      submitted.current = true;
      let from = 0;
      const result = mutate((d) => {
        from = d.bond.points[god];
        return selected === 'whey' || selected === 'goblet'
          ? giveDailyItem(d, selected, god)
          : giveRewardItem(d, selected, god);
      });
      if (!result || result.bond.points[god] === from) {
        submitted.current = false;
        toast('This gift is no longer available.');
        return;
      }
      setReceipt({ from, to: result.bond.points[god], item: selected });
    });
  }
  if (receipt)
    return (
      <Dialog
        title={`${name.toUpperCase()} · DIVINE BOND`}
        className="ceremony-dialog"
        onClose={onClose}
      >
        <OfferingCelebration god={god} receipt={receipt} onClose={onClose} />
      </Dialog>
    );
  return (
    <Dialog title="OFFERING" onClose={onClose}>
      <h2>A gift for {name}.</h2>
      <div className="offering-caption">
        <span>Daily gift</span>
        <span>{available ? 'Choose 1 · Free' : 'Claimed today'}</span>
      </div>
      <div className="offering-grid">
        {dailyItems.map((id) => (
          <button
            key={id}
            disabled={!available}
            aria-pressed={selected === id}
            className={`offering-item ${selected === id ? 'selected' : ''}`}
            onClick={() => setSelected(id)}
          >
            <ItemArt item={id} />
            <strong>{items[id].name}</strong>
            <span>
              <Heart size={12} />+{items[id].points}
            </span>
            {selected === id && <Check className="item-check" size={14} />}
          </button>
        ))}
      </div>
      {owned.length > 0 && (
        <>
          <div className="offering-caption">
            <span>Your inventory</span>
          </div>
          <div className="inventory-picks">
            {owned.map((id) => (
              <button
                key={id}
                aria-pressed={selected === id}
                className={`inventory-pick ${selected === id ? 'selected' : ''}`}
                onClick={() => setSelected(id)}
              >
                <ItemArt item={id} />
                <span>
                  <strong>{items[id].name}</strong>
                  <small>+{items[id].points} bond</small>
                </span>
                <b>×{data.bond.inventory[id]}</b>
              </button>
            ))}
          </div>
        </>
      )}
      <button className="button primary full" disabled={!canGive} onClick={give}>
        {isDaily
          ? available
            ? 'Give & check in'
            : 'Daily gift claimed'
          : `Give ${items[selected].name}`}
        <Heart size={16} />
      </button>
    </Dialog>
  );
}
