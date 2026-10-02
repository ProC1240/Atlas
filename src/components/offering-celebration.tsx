'use client';
import dynamic from 'next/dynamic';
import { memo, useCallback, useEffect, useState, type CSSProperties } from 'react';
import { avatars, type GodId } from '@/domain/avatars';
import { bondProgressForPoints, items, type ItemId } from '@/domain/bond';
import { ItemArt } from './item-art';
import { Ring } from './ui';

const AvatarScene = memo(
  dynamic(() => import('./avatar-scene').then((m) => m.AvatarScene), { ssr: false }),
);
export interface OfferingReceipt {
  from: number;
  to: number;
  item: ItemId;
}
const motes = Array.from(
  { length: 24 },
  (_, i) =>
    ({
      '--spread-x': `${Math.cos(i * 2.4) * (35 + (i % 5) * 15)}px`,
      '--spread-y': `${Math.sin(i * 2.4) * 45}px`,
      '--drift-x': `${Math.cos(i * 1.7) * 24}px`,
      '--delay': `${950 + i * 34}ms`,
      '--size': `${3 + (i % 4) * 1.5}px`,
    }) as CSSProperties,
);

export function OfferingCelebration({
  god,
  receipt,
  onClose,
}: {
  god: GodId;
  receipt: OfferingReceipt;
  onClose: () => void;
}) {
  const [ready, setReady] = useState(false);
  const [total, setTotal] = useState(receipt.from);
  const [complete, setComplete] = useState(false);
  const reveal = useCallback(() => setReady(true), []);
  const progress = bondProgressForPoints(total, god);
  const leveledUp = progress.level > bondProgressForPoints(receipt.from, god).level;
  const name = avatars.find((a) => a.id === god)!.name;
  useEffect(() => {
    if (!ready) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const fraction = preference.matches ? 1 : Math.min(1, Math.max(0, (elapsed - 1550) / 1550));
      setTotal(Math.round(receipt.from + (receipt.to - receipt.from) * fraction));
      if (preference.matches || elapsed >= 3450) setComplete(true);
      else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [ready, receipt]);
  return (
    <div
      className={`offering-celebration ${ready ? 'playing' : ''} ${complete ? 'complete' : ''}`}
      style={{ '--gift-color': items[receipt.item].color } as CSSProperties}
      data-total={total}
      data-complete={complete}
    >
      <div className="ceremony-title">
        <span className="eyebrow">{leveledUp ? 'LEVEL UP' : 'DIVINE OFFERING'}</span>
        <h2>{name}</h2>
      </div>
      <div className="ceremony-stage">
        <div className="ceremony-halo" aria-hidden="true" />
        <div className="ceremony-avatar">
          <AvatarScene god={god} ceremony onReady={reveal} />
        </div>
        <div className="ceremony-pulse" aria-hidden="true" />
        <div className="ceremony-item" aria-hidden="true">
          <ItemArt item={receipt.item} />
        </div>
        <div className="ceremony-particles" aria-hidden="true">
          {motes.map((style, i) => (
            <i key={i} style={style} />
          ))}
        </div>
      </div>
      <div className={`ceremony-progress ${leveledUp ? 'leveled-up' : ''}`}>
        <Ring
          value={progress.max ? 1 : progress.current}
          max={progress.max ? 1 : progress.needed}
          size={72}
        >
          <strong key={progress.level} className="ceremony-level">
            {progress.level}
          </strong>
        </Ring>
        <div>
          <strong>Level {progress.level}</strong>
          <span>{progress.max ? 'Max bond' : `${progress.current} / ${progress.needed} bond`}</span>
        </div>
        <span className="ceremony-gain">+{total - receipt.from}</span>
      </div>
      <p className="ceremony-result" role="status">
        {complete
          ? `${items[receipt.item].name} · +${receipt.to - receipt.from} bond${leveledUp ? ' · Level up!' : ''}`
          : items[receipt.item].name}
      </p>
      <button
        autoFocus
        className={`button ${complete ? 'primary' : 'secondary'}`}
        onClick={onClose}
      >
        {complete ? 'Continue' : 'Skip animation'}
      </button>
    </div>
  );
}
