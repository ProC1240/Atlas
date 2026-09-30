'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useState } from 'react';
import { Check, Lock, Heart, Crown, Shield, Feather, Waves, Swords } from 'lucide-react';
import { avatars, avatarProgress, type GodId } from '@/domain/avatars';
import { bondProgress, dailyAvailable } from '@/domain/bond';
import { useTraining } from './store';
import { SectionHeading, Ring } from './ui';
import { OfferingDialog } from './offering-dialog';
const AvatarScene = dynamic(() => import('./scene').then((m) => m.AvatarScene), { ssr: false });
const symbols = { zeus: Crown, athena: Shield, hermes: Feather, poseidon: Waves, ares: Swords };
export function Avatar() {
  const { data, mutate, requireSave, toast } = useTraining();
  const [preview, setPreview] = useState<GodId>(data.equipped),
    [offering, setOffering] = useState(false);
  const current = avatars.find((a) => a.id === preview)!,
    progress = avatarProgress(preview, data),
    bond = bondProgress(data, preview);
  return (
    <>
      <SectionHeading title="Your collection.">
        <Link href="/bond" className="text-button">
          Bond & rewards
        </Link>
      </SectionHeading>
      <div className="avatar-layout">
        <section className="card avatar-showcase">
          <div className="avatar-stage-label">
            <span className="eyebrow">{current.title}</span>
            <span className="tag muted">{progress.unlocked ? 'Unlocked' : 'Preview'}</span>
          </div>
          <div
            className="avatar-aura"
            style={{ background: `radial-gradient(ellipse, ${current.accent}26, transparent 65%)` }}
          />
          <div className="avatar-roman" aria-hidden="true">
            {['I', 'II', 'III', 'IV', 'V'][avatars.findIndex((a) => a.id === preview)]}
          </div>
          <div className="avatar-3d">
            <AvatarScene god={preview} interactive />
          </div>
          <div className="avatar-intro">
            <h2>{current.name}</h2>
            {progress.unlocked ? (
              <button
                className={`button ${data.equipped === preview ? 'secondary' : 'primary'}`}
                disabled={data.equipped === preview}
                onClick={() =>
                  requireSave(() => {
                    mutate((d) => ({ ...d, equipped: preview }));
                    toast(`${current.name} equipped.`);
                  })
                }
              >
                {data.equipped === preview ? (
                  <>
                    <Check size={17} />
                    Equipped
                  </>
                ) : (
                  <>Choose {current.name}</>
                )}
              </button>
            ) : (
              <div className="unlock-progress">
                <span>
                  <Lock size={14} />
                  {current.rule}
                  <strong>
                    {Math.min(progress.current, progress.required)} / {progress.required}
                  </strong>
                </span>
                <div className="linear-track">
                  <i
                    style={{ width: `${Math.min(progress.current / progress.required, 1) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </section>
        <div className="avatar-side">
          <section className="card companion-ritual">
            <div className="card-top">
              <h3>{current.name}’s bond</h3>
              <Heart size={18} />
            </div>
            <div className="ritual-level">
              <Ring value={bond.max ? 1 : bond.current} max={bond.max ? 1 : bond.needed} size={80}>
                <span className="ring-number">{bond.level}</span>
              </Ring>
              <div>
                <strong>Level {bond.level}</strong>
                <p>{bond.max ? 'Max bond' : `${bond.current} / ${bond.needed} bond`}</p>
              </div>
            </div>
            <button
              className="button primary full"
              disabled={!progress.unlocked}
              onClick={() => setOffering(true)}
            >
              <Heart size={16} />
              {dailyAvailable(data) ? 'Choose a gift' : 'Inventory'}
            </button>
          </section>
          <section className="card collection">
            <div className="card-top">
              <h3>Avatars</h3>
              <span className="quiet-label">
                {avatars.filter((a) => avatarProgress(a.id, data).unlocked).length} / 5
              </span>
            </div>
            {avatars.map((a) => {
              const Icon = symbols[a.id],
                unlocked = avatarProgress(a.id, data).unlocked;
              return (
                <button
                  className={`god-option ${preview === a.id ? 'selected' : ''}`}
                  key={a.id}
                  aria-pressed={preview === a.id}
                  onClick={() => setPreview(a.id)}
                >
                  <span className="god-symbol" style={{ color: a.accent }}>
                    <Icon size={23} />
                  </span>
                  <span>
                    <strong>{a.name}</strong>
                    <small>{unlocked ? `Level ${bondProgress(data, a.id).level}` : a.rule}</small>
                  </span>
                  {data.equipped === a.id ? (
                    <Check size={17} />
                  ) : !unlocked ? (
                    <Lock size={14} />
                  ) : null}
                </button>
              );
            })}
          </section>
        </div>
      </div>
      {offering && <OfferingDialog god={preview} onClose={() => setOffering(false)} />}
    </>
  );
}
