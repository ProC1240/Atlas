'use client';
import { useRef, useState } from 'react';
import {
  Download,
  Upload,
  ShieldCheck,
  LogOut,
  UserRound,
  BookOpen,
  Cloud,
  Monitor,
  MessageSquare,
  Save,
} from 'lucide-react';
import { profileSchema, parseData, type TrainingData } from '@/domain/training';
import { source } from '@/domain/catalog';
import { useTraining } from './store';
import { Dialog, SectionHeading } from './ui';
function download(name: string, text: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function Me() {
  const { data, mode, email, mutate, requireSave, toast, signOut, setAuthOpen } = useTraining();
  const [profile, setProfile] = useState(data.profile),
    [error, setError] = useState(''),
    [imported, setImported] = useState<TrainingData | null>(null),
    [report, setReport] = useState(false),
    [reportText, setReportText] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const update = (key: keyof typeof profile, value: string) =>
    setProfile((p) => ({
      ...p,
      [key]: key === 'name' || key === 'sex' ? value || null : value === '' ? null : Number(value),
    }));
  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 5_000_000) throw new Error('size');
      const parsed = parseData(JSON.parse(await file.text()));
      setImported(parsed);
    } catch {
      toast('Invalid backup. Choose an ATLAS JSON export under 5 MB.');
    }
    if (input.current) input.current.value = '';
  }
  function save() {
    setError('');
    const parsed = profileSchema.safeParse(profile);
    if (!parsed.success) {
      setError(
        'Check your profile. Adult age: 18–100, height: 100–250 cm, weight: 25–400 kg. Goals: 1–7 days and 0.5–6 L.',
      );
      return;
    }
    requireSave(() => {
      mutate((d) => ({ ...d, profile: parsed.data }));
      toast('Profile updated.');
    });
  }
  return (
    <>
      <SectionHeading title="Your profile." />
      <div className="settings-layout">
        <section className="card profile-card">
          <div className="card-top">
            <h3>Personal profile</h3>
            <UserRound size={21} />
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <label>
              Display name
              <input
                maxLength={40}
                required
                value={profile.name}
                onChange={(e) => update('name', e.target.value)}
              />
            </label>
            <div className="form-grid">
              <label>
                Height <small>cm · optional</small>
                <input
                  type="number"
                  step=".1"
                  min="100"
                  max="250"
                  value={profile.height ?? ''}
                  onChange={(e) => update('height', e.target.value)}
                  placeholder="175"
                />
              </label>
              <label>
                Weight <small>kg · optional</small>
                <input
                  type="number"
                  step=".1"
                  min="25"
                  max="400"
                  value={profile.weight ?? ''}
                  onChange={(e) => update('weight', e.target.value)}
                  placeholder="70"
                />
              </label>
              <label>
                Age <small>18+ · optional</small>
                <input
                  type="number"
                  min="18"
                  max="100"
                  value={profile.age ?? ''}
                  onChange={(e) => update('age', e.target.value)}
                  placeholder="25"
                />
              </label>
              <label>
                Formula sex <small>for TDEE only</small>
                <select value={profile.sex ?? ''} onChange={(e) => update('sex', e.target.value)}>
                  <option value="">Not specified</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </label>
            </div>
            <label>
              Activity estimate
              <select value={profile.activity} onChange={(e) => update('activity', e.target.value)}>
                <option value="1.2">Mostly sedentary · 1.2</option>
                <option value="1.375">Lightly active · 1.375</option>
                <option value="1.55">Moderately active · 1.55</option>
                <option value="1.725">Very active · 1.725</option>
                <option value="1.9">Extremely active · 1.9</option>
              </select>
            </label>
            <div className="form-grid">
              <label>
                Weekly training goal <small>days</small>
                <input
                  type="number"
                  min="1"
                  max="7"
                  value={profile.weeklyGoal}
                  onChange={(e) => update('weeklyGoal', e.target.value)}
                />
              </label>
              <label>
                Daily water goal <small>liters</small>
                <input
                  type="number"
                  min=".5"
                  max="6"
                  step=".25"
                  value={profile.waterGoal}
                  onChange={(e) => update('waterGoal', e.target.value)}
                />
              </label>
            </div>
            <p className="fine-print">
              Body measurements are optional. Goals are editable preferences, not personalized
              recommendations. Your avatar does not infer body composition from BMI.
            </p>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="button primary" type="submit">
              <Save size={17} />
              Save profile
            </button>
          </form>
        </section>
        <div className="settings-side">
          <section className="card">
            <div className="card-top">
              <h3>Account & storage</h3>
              <ShieldCheck size={20} />
            </div>
            <div className="storage-status">
              {mode === 'cloud' ? <Cloud size={25} /> : <Monitor size={25} />}
              <div>
                <strong>
                  {mode === 'guest'
                    ? 'Guest browsing'
                    : mode === 'device'
                      ? 'Device mode'
                      : 'Cloud journal'}
                </strong>
                <p>
                  {email ??
                    (mode === 'device'
                      ? 'Saved in this browser only.'
                      : 'No progress is being saved yet.')}
                </p>
              </div>
            </div>
            {mode === 'guest' ? (
              <button className="button secondary full" onClick={() => setAuthOpen(true)}>
                Choose a save mode
              </button>
            ) : (
              <button className="button secondary full" onClick={() => void signOut()}>
                <LogOut size={17} />
                {mode === 'cloud' ? 'Sign out' : 'Leave device mode'}
              </button>
            )}
            <p className="fine-print">
              Leaving does not delete saved progress. Cloud and device journals are separate; use
              export/import to move data.
            </p>
          </section>
          <section className="card">
            <div className="card-top">
              <h3>Your data, yours.</h3>
              <Download size={20} />
            </div>
            <p className="body-copy">Keep a portable copy of your training journal.</p>
            <div className="data-actions">
              <button
                className="button secondary"
                onClick={() => {
                  download(
                    `atlas-backup-${new Date().toISOString().slice(0, 10)}.json`,
                    JSON.stringify(data, null, 2),
                  );
                  toast('Backup download started.');
                }}
              >
                <Download size={17} />
                Export
              </button>
              <button className="button secondary" onClick={() => input.current?.click()}>
                <Upload size={17} />
                Import
              </button>
              <input
                ref={input}
                className="sr-only"
                type="file"
                accept="application/json,.json"
                onChange={(e) => void importFile(e.target.files?.[0])}
              />
            </div>
            <p className="fine-print">
              Backups contain your profile and training data. Store them privately.
            </p>
          </section>
          <section className="card source-card">
            <div className="card-top">
              <h3>About ATLAS</h3>
              <BookOpen size={20} />
            </div>
            <strong>{source.title}</strong>
            <details className="about-details">
              <summary>Sources & limitations</summary>
              <p className="fine-print">
                Adapted from the supplied 54-page guide. 3D models and movement studies are
                illustrations, not medical models or individualized coaching.
              </p>
              <p className="fine-print">
                Gifts and bond levels are virtual game items, not supplement or alcohol
                recommendations. Progress is locally editable; paid ownership is not enabled.
              </p>
            </details>
          </section>
          <button className="text-button report-button" onClick={() => setReport(true)}>
            <MessageSquare size={16} />
            Report an issue
          </button>
        </div>
      </div>
      {imported && (
        <Dialog title="IMPORT BACKUP" onClose={() => setImported(null)}>
          <h2>Replace this journal?</h2>
          <p className="body-copy">
            This backup contains {imported.workouts.length} workouts and {imported.water.length}{' '}
            water entries. Export your current data first if you want to keep it.
          </p>
          <div className="dialog-actions">
            <button className="button secondary" onClick={() => setImported(null)}>
              Cancel
            </button>
            <button
              className="button primary"
              onClick={() =>
                requireSave(() => {
                  mutate(() => imported);
                  setProfile(imported.profile);
                  setImported(null);
                  toast('Backup imported.');
                })
              }
            >
              Replace & import
            </button>
          </div>
        </Dialog>
      )}
      {report && (
        <Dialog title="REPORT AN ISSUE" onClose={() => setReport(false)}>
          <h2>Help shape ATLAS.</h2>
          <label>
            What happened?
            <textarea
              maxLength={3000}
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              placeholder="Describe the issue and steps to reproduce it."
              rows={5}
            />
          </label>
          <p className="fine-print">
            Downloads a report for you to share with the developer. Nothing is submitted
            automatically; no health data is included.
          </p>
          <button
            className="button primary full"
            disabled={!reportText.trim()}
            onClick={() => {
              download(
                'atlas-issue.txt',
                `ATLAS web preview v0.1\nDate: ${new Date().toISOString()}\nPage: ${location.pathname}\n\n${reportText}`,
                'text/plain',
              );
              setReport(false);
            }}
          >
            Download report <Download size={17} />
          </button>
        </Dialog>
      )}
    </>
  );
}
