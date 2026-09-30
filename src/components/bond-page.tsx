'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useState } from 'react';
import { Check, Gift, Heart, Lock } from 'lucide-react';
import { avatars, avatarProgress, type GodId } from '@/domain/avatars';
import { bondPaths, bondProgress, claimReward, dailyAvailable, items } from '@/domain/bond';
import { useTraining } from './store';
import { Ring } from './ui';
import { ItemArt } from './item-art';
import { OfferingDialog } from './offering-dialog';
const AvatarScene = dynamic(() => import('./scene').then((m) => m.AvatarScene), { ssr: false });

export function BondPage() {
  const { data, mutate, requireSave, toast } = useTraining();
  const [god, setGod] = useState<GodId>(data.equipped),
    [offering, setOffering] = useState(false);
  const avatar = avatars.find((a) => a.id === god)!,
    progress = bondProgress(data, god),
    unlocked = avatarProgress(god, data).unlocked,
    path = bondPaths[god];
  return (
    <div className="bond-page">
      <div className="bond-page-heading">
        <Link href="/" className="back-link">
          Overview
        </Link>
        <h1>Divine bond</h1>
        <Link href="/avatar" className="text-button">
          Collection
        </Link>
      </div>
      <div className="bond-avatar-tabs" aria-label="Avatar bond">
        {avatars.map((a) => (
          <button
            key={a.id}
            aria-pressed={god === a.id}
            className={god === a.id ? 'active' : ''}
            onClick={() => setGod(a.id)}
          >
            {!avatarProgress(a.id, data).unlocked && <Lock size={11} />} {a.name}
          </button>
        ))}
      </div>
      <section className="bond-sanctuary card">
        <span className="sanctuary-word" aria-hidden="true">
          {avatar.name}
        </span>
        <div className="bond-arch" />
        <div className="bond-avatar-scene">
          <AvatarScene god={god} interactive />
        </div>
        <div className="bond-identity">
          <span className="eyebrow">{avatar.title}</span>
          <h2>{avatar.name}</h2>
          <div className="bond-reading">
            <Ring
              value={progress.max ? 1 : progress.current}
              max={progress.max ? 1 : progress.needed}
              size={64}
            >
              <strong>{progress.level}</strong>
            </Ring>
            <div>
              <strong>Level {progress.level}</strong>
              <p>{progress.max ? 'Max bond' : `${progress.current} / ${progress.needed} bond`}</p>
            </div>
          </div>
          {unlocked ? (
            <button className="button primary" onClick={() => setOffering(true)}>
              <Heart size={16} />
              {dailyAvailable(data) ? 'Give a gift' : 'Inventory'}
            </button>
          ) : (
            <span className="tag muted">
              <Lock size={13} />
              {avatar.rule}
            </span>
          )}
        </div>
      </section>
      <section className="reward-section">
        <div className="card-top">
          <h3>Level rewards</h3>
          <span>
            {data.bond.claimed.filter((k) => k.startsWith(`${god}:`)).length} /{' '}
            {path.rewards.length} claimed
          </span>
        </div>
        <div className="reward-scroll" tabIndex={0} aria-label={`${avatar.name} level rewards`}>
          <div className="reward-track">
            {path.rewards.map((reward) => {
              const claimed = data.bond.claimed.includes(`${god}:${reward.level}`),
                ready = unlocked && progress.level >= reward.level;
              return (
                <article
                  key={`${god}:${reward.level}`}
                  className={`reward-stop ${claimed ? 'claimed' : ready ? 'ready' : 'locked'}`}
                >
                  <div className="reward-level">
                    <span>{claimed ? <Check size={14} /> : reward.level}</span>
                    <small>LEVEL {reward.level}</small>
                  </div>
                  <div className="reward-card">
                    <ItemArt item={reward.item} />
                    <strong>
                      {items[reward.item].name} <span>×{reward.quantity}</span>
                    </strong>
                    <small>+{items[reward.item].points} bond each</small>
                    <button
                      className={`button small ${ready && !claimed ? 'primary' : 'secondary'}`}
                      disabled={!ready || claimed}
                      aria-label={`${claimed ? 'Claimed' : 'Claim'} level ${reward.level} reward`}
                      onClick={() =>
                        requireSave(() => {
                          mutate((d) => claimReward(d, god, reward.level));
                          toast(`${items[reward.item].name} ×${reward.quantity} added.`);
                        })
                      }
                    >
                      {claimed ? (
                        <>
                          <Check size={13} />
                          Claimed
                        </>
                      ) : ready ? (
                        <>
                          <Gift size={13} />
                          Claim
                        </>
                      ) : (
                        <>
                          <Lock size={12} />
                          {path.thresholds[reward.level - 1]} bond
                        </>
                      )}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>
      {offering && <OfferingDialog god={god} onClose={() => setOffering(false)} />}
    </div>
  );
}
