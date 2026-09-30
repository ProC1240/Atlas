'use client';
import { useEffect, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import type { Exercise } from '@/domain/catalog';
type Point = [number, number];
type Pose = Point[];
// Joint order: head, shoulder, hip, elbow, hand, knee, ankle, far elbow, far hand, far knee, far ankle.
const standing: Pose = [
  [170, 66],
  [170, 101],
  [170, 184],
  [185, 139],
  [190, 171],
  [180, 235],
  [180, 282],
  [151, 139],
  [148, 171],
  [154, 235],
  [154, 282],
];
function poses(ex: Exercise): [Pose, Pose] | null {
  const s = standing.map((p) => [...p] as Point),
    e = standing.map((p) => [...p] as Point);
  switch (ex.animation) {
    case 'curl':
      e[4] = [194, 105];
      e[8] = [132, 105];
      return [s, e];
    case 'squat':
      return [
        s,
        [
          [183, 122],
          [180, 151],
          [139, 207],
          [207, 165],
          [188, 143],
          [208, 223],
          [180, 282],
          [170, 175],
          [188, 143],
          [192, 230],
          [154, 282],
        ],
      ];
    case 'hinge':
      return [
        s,
        [
          [229, 155],
          [203, 171],
          [139, 187],
          [208, 211],
          [213, 247],
          [178, 237],
          [180, 282],
          [188, 213],
          [190, 247],
          [153, 240],
          [154, 282],
        ],
      ];
    case 'overhead':
      s[3] = [216, 113];
      s[4] = [214, 71];
      s[7] = [124, 113];
      s[8] = [124, 71];
      e[3] = [194, 60];
      e[4] = [194, 20];
      e[7] = [146, 60];
      e[8] = [146, 20];
      return [s, e];
    case 'raise':
      e[3] = [221, 107];
      e[4] = [263, 114];
      e[7] = [119, 107];
      e[8] = [77, 114];
      return [s, e];
    case 'calf':
      return [s, e.map((p, i) => [p[0], p[1] - (i === 6 || i === 10 ? 0 : 16)] as Point)];
    case 'legextension':
    case 'legcurl': {
      const a: Pose = [
        [135, 82],
        [135, 119],
        [143, 193],
        [154, 154],
        [174, 182],
        [216, 193],
        [216, 266],
        [118, 157],
        [130, 184],
        [208, 202],
        [208, 270],
      ];
      const b = a.map((p) => [...p] as Point);
      b[6] = [282, 179];
      b[10] = [275, 192];
      return ex.animation === 'legcurl' ? [b, a] : [a, b];
    }
    case 'triceps':
      if (ex.id === 'pressdown') {
        s[3] = [191, 139];
        s[4] = [233, 139];
        e[3] = [191, 139];
        e[4] = [196, 183];
        s[7] = [173, 141];
        s[8] = [216, 141];
        e[7] = [173, 141];
        e[8] = [179, 183];
      } else {
        s[3] = [151, 50];
        s[4] = [124, 90];
        e[3] = [151, 50];
        e[4] = [151, 12];
        s[7] = [183, 50];
        s[8] = [161, 90];
        e[7] = [183, 50];
        e[8] = [183, 12];
      }
      return [s, e];
    case 'lunge':
      s[5] = [220, 233];
      s[6] = [235, 282];
      s[9] = [121, 232];
      s[10] = [95, 282];
      e[0] = [170, 113];
      e[1] = [170, 148];
      e[2] = [170, 220];
      e[3] = [188, 184];
      e[4] = [190, 218];
      e[7] = [151, 184];
      e[8] = [148, 218];
      e[5] = [236, 229];
      e[6] = [235, 282];
      e[9] = [129, 278];
      e[10] = [95, 282];
      return [s, e];
    case 'press':
      if (ex.id === 'machine-press') return null;
      return [
        [
          [90, 170],
          [124, 177],
          [213, 201],
          [129, 220],
          [129, 177],
          [245, 217],
          [245, 282],
          [140, 209],
          [140, 166],
          [236, 222],
          [236, 282],
        ],
        [
          [90, 170],
          [124, 177],
          [213, 201],
          [126, 127],
          [128, 79],
          [245, 217],
          [245, 282],
          [139, 128],
          [140, 85],
          [236, 222],
          [236, 282],
        ],
      ];
    case 'pushup':
      return [
        [
          [240, 133],
          [212, 145],
          [142, 177],
          [218, 194],
          [225, 244],
          [91, 205],
          [41, 236],
          [204, 195],
          [211, 244],
          [83, 205],
          [32, 236],
        ],
        [
          [248, 202],
          [215, 211],
          [136, 222],
          [183, 233],
          [225, 244],
          [85, 232],
          [41, 236],
          [178, 225],
          [211, 244],
          [80, 224],
          [32, 236],
        ],
      ];
    case 'rotation':
      s[3] = [198, 135];
      s[4] = [183, 118];
      e[3] = [220, 113];
      e[4] = [266, 113];
      s[7] = [190, 137];
      s[8] = [183, 118];
      e[7] = [216, 121];
      e[8] = [266, 113];
      return [s, e];
    default:
      return null;
  }
}
export function Movement({ exercise }: { exercise: Exercise }) {
  const pair = poses(exercise),
    [playing, setPlaying] = useState(false),
    [phase, setPhase] = useState(0);
  useEffect(() => {
    setPhase(0);
    setPlaying(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, [exercise.id]);
  useEffect(() => {
    if (!playing || !pair) return;
    let frame = 0,
      last = 0;
    const tick = (t: number) => {
      if (t - last > 33) {
        setPhase((1 - Math.cos((t / 1350) * Math.PI)) / 2);
        last = t;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, exercise.id, Boolean(pair)]);
  if (!pair)
    return (
      <div className="movement movement-pending">
        <div className="motion-orbit">
          <span>{exercise.pattern.slice(0, 1)}</span>
        </div>
        <strong>{exercise.pattern} pattern</strong>
        <p>Motion preview coming soon</p>
        <small>Read the coaching cues below.</small>
      </div>
    );
  const points = pair[0].map(
    (p, i) =>
      [p[0] + (pair[1][i][0] - p[0]) * phase, p[1] + (pair[1][i][1] - p[1]) * phase] as Point,
  );
  const path = (ids: number[]) =>
    ids.map((n, i) => `${i ? 'L' : 'M'}${points[n].join(',')}`).join(' ');
  return (
    <div className="movement">
      <span className="movement-caption">
        MOVEMENT STUDY <span>· ILLUSTRATIVE</span>
      </span>
      <svg
        viewBox="0 0 340 315"
        role="img"
        aria-label={`Simplified joint-motion study for ${exercise.name}; not a technique video`}
      >
        <defs>
          <radialGradient id="floor">
            <stop stopColor="#91d6a4" stopOpacity=".16" />
            <stop offset="1" stopColor="#91d6a4" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="170" cy="284" rx="139" ry="19" fill="url(#floor)" />
        <path d="M40 285H300" stroke="#426251" strokeWidth="1" />
        {(exercise.animation === 'press' ||
          exercise.animation === 'legcurl' ||
          exercise.animation === 'legextension') && (
          <path
            d={
              exercise.animation === 'press'
                ? 'M78 195L221 222M110 202V279M208 222V279'
                : 'M115 210H225M125 210V281M214 210V281'
            }
            fill="none"
            stroke="#4c6957"
            strokeWidth="10"
            strokeLinecap="round"
          />
        )}
        <path
          d={path([1, 7, 8]) + ' ' + path([2, 9, 10])}
          fill="none"
          stroke="#5a7d64"
          strokeWidth="15"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={path([0, 1, 2, 5, 6]) + ' ' + path([1, 3, 4])}
          fill="none"
          stroke="#b7cdb3"
          strokeWidth="17"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d={path([1, 2])} stroke="#d3dfc2" strokeWidth="27" strokeLinecap="round" />
        <circle cx={points[0][0]} cy={points[0][1] - 6} r="19" fill="#d3dfc2" />
        {[1, 2, 3, 5].map((i) => (
          <circle key={i} cx={points[i][0]} cy={points[i][1]} r="4" fill="#62d3a2" />
        ))}
        {['curl', 'overhead', 'raise', 'press', 'hinge'].includes(exercise.animation) &&
          [4, 8].map((i) => (
            <g key={i} transform={`translate(${points[i][0]},${points[i][1]})`}>
              <path
                d="M-11 0H11M-11-8V8M11-8V8"
                stroke="#b0edbd"
                strokeWidth="6"
                strokeLinecap="round"
              />
            </g>
          ))}
      </svg>
      <button
        className="motion-play icon-button"
        onClick={() => setPlaying(!playing)}
        aria-label={playing ? 'Pause animation' : 'Play animation'}
      >
        {playing ? <Pause size={17} /> : <Play size={17} />}
      </button>
    </div>
  );
}
