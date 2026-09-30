export type MuscleId =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'core'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'forearms';
export type Pattern =
  'Push' | 'Pull' | 'Squat' | 'Hinge' | 'Lunge' | 'Carry' | 'Rotation' | 'Accessory';
export type AnimationKind =
  | 'press'
  | 'overhead'
  | 'pushup'
  | 'fly'
  | 'row'
  | 'pulldown'
  | 'squat'
  | 'hinge'
  | 'lunge'
  | 'curl'
  | 'triceps'
  | 'calf'
  | 'carry'
  | 'rotation'
  | 'legcurl'
  | 'legextension'
  | 'raise'
  | 'thrust';
export interface Muscle {
  id: MuscleId;
  name: string;
  latin: string;
  description: string;
  structures: string[];
  pages: number[];
  view: 'front' | 'back';
  focus: [number, number, number];
}
export const muscles: Muscle[] = [
  {
    id: 'chest',
    name: 'Chest',
    latin: 'Pectoralis major',
    description:
      'Moves the upper arm across the body. Press angle changes relative demand, not isolation.',
    structures: ['Clavicular portion', 'Sternocostal portion', 'Pectoralis minor'],
    pages: [15, 19],
    view: 'front',
    focus: [0, 1.08, 0.2],
  },
  {
    id: 'back',
    name: 'Back',
    latin: 'Latissimus dorsi & trapezius',
    description:
      'Shoulder extension, adduction and scapular control. Elbow path changes the emphasis.',
    structures: ['Latissimus dorsi', 'Trapezius', 'Rhomboids', 'Teres major'],
    pages: [16, 20],
    view: 'back',
    focus: [0, 0.85, -0.15],
  },
  {
    id: 'shoulders',
    name: 'Shoulders',
    latin: 'Deltoid',
    description:
      'The deltoids move the arm while the cuff and shoulder blade coordinate the joint.',
    structures: ['Anterior deltoid', 'Middle deltoid', 'Posterior deltoid'],
    pages: [13, 15, 16, 19],
    view: 'front',
    focus: [0.53, 1.1, 0],
  },
  {
    id: 'biceps',
    name: 'Biceps',
    latin: 'Biceps brachii',
    description:
      'Bends the elbow and turns the palm upward. Shoulder position changes muscle length.',
    structures: ['Biceps brachii', 'Brachialis', 'Brachioradialis'],
    pages: [17, 18],
    view: 'front',
    focus: [0.66, 0.72, 0.06],
  },
  {
    id: 'triceps',
    name: 'Triceps',
    latin: 'Triceps brachii',
    description: 'Extends the elbow. The long head also crosses the shoulder.',
    structures: ['Long head', 'Lateral head', 'Medial head'],
    pages: [17, 40],
    view: 'back',
    focus: [0.65, 0.72, -0.12],
  },
  {
    id: 'core',
    name: 'Core',
    latin: 'Abdominals & spinal stabilizers',
    description: 'Creates or resists trunk motion. Bracing adapts to the task and load.',
    structures: ['Rectus abdominis', 'Obliques', 'Transversus abdominis', 'Erector spinae'],
    pages: [21, 22, 24, 39],
    view: 'front',
    focus: [0, 0.56, 0.18],
  },
  {
    id: 'quads',
    name: 'Quads',
    latin: 'Quadriceps femoris',
    description: 'Extends the knee. Rectus femoris also crosses the hip.',
    structures: ['Rectus femoris', 'Vastus lateralis', 'Vastus medialis', 'Vastus intermedius'],
    pages: [27, 28, 32],
    view: 'front',
    focus: [0.22, -0.37, 0.14],
  },
  {
    id: 'hamstrings',
    name: 'Hamstrings',
    latin: 'Posterior thigh',
    description:
      'Bends the knee and, for most heads, extends the hip. Both joint positions affect length.',
    structures: ['Biceps femoris', 'Semitendinosus', 'Semimembranosus'],
    pages: [26, 28, 34],
    view: 'back',
    focus: [0.24, -0.38, -0.13],
  },
  {
    id: 'glutes',
    name: 'Glutes',
    latin: 'Gluteal muscles',
    description: 'Extends the hip and controls the pelvis in single-leg tasks.',
    structures: ['Gluteus maximus', 'Gluteus medius', 'Gluteus minimus'],
    pages: [25, 26, 31],
    view: 'back',
    focus: [0, 0.05, -0.15],
  },
  {
    id: 'calves',
    name: 'Calves',
    latin: 'Gastrocnemius & soleus',
    description: 'Points the foot downward. Knee position changes relative calf demand.',
    structures: ['Gastrocnemius', 'Soleus'],
    pages: [29, 40],
    view: 'back',
    focus: [0.21, -1.03, -0.08],
  },
  {
    id: 'forearms',
    name: 'Forearms',
    latin: 'Forearm & grip muscles',
    description: 'Controls grip, wrist position and forearm rotation.',
    structures: ['Brachioradialis', 'Wrist flexors', 'Wrist extensors', 'Pronators & supinator'],
    pages: [17, 18, 38],
    view: 'front',
    focus: [0.83, 0.28, 0],
  },
];
export interface Exercise {
  id: string;
  name: string;
  primary: MuscleId[];
  secondary: MuscleId[];
  equipment: 'Bodyweight' | 'Dumbbell' | 'Barbell' | 'Cable' | 'Machine' | 'Pull-up bar';
  type: 'Compound' | 'Isolation' | 'Carry' | 'Anti-rotation';
  pattern: Pattern;
  location: ('Home' | 'Gym')[];
  emphasis?: string;
  pages: number[];
  summary: string;
  cues: string[];
  animation: AnimationKind;
  metric?: 'reps' | 'meters' | 'seconds';
}
export const exercises: Exercise[] = [
  {
    id: 'incline-dumbbell-press',
    name: 'Incline dumbbell press',
    primary: ['chest'],
    secondary: ['shoulders', 'triceps'],
    equipment: 'Dumbbell',
    type: 'Compound',
    pattern: 'Push',
    location: ['Home', 'Gym'],
    emphasis: 'Clavicular',
    pages: [15, 19, 37],
    summary:
      'An incline introduces more shoulder flexion and can shift demand toward clavicular fibers.',
    cues: [
      'Choose a bench angle that fits your target and comfortable range.',
      'Keep your upper back supported and lower with control.',
      'Press along a repeatable path without forcing depth.',
    ],
    animation: 'press',
  },
  {
    id: 'bench-press',
    name: 'Barbell bench press',
    primary: ['chest'],
    secondary: ['shoulders', 'triceps'],
    equipment: 'Barbell',
    type: 'Compound',
    pattern: 'Push',
    location: ['Gym'],
    emphasis: 'Sternocostal',
    pages: [15, 19],
    summary: 'Horizontal shoulder adduction and elbow extension share the work.',
    cues: [
      'Establish stable contact with the bench and floor.',
      'Choose a repeatable grip and controlled depth.',
      'Press toward a consistent finish.',
    ],
    animation: 'press',
  },
  {
    id: 'push-up',
    name: 'Push-up',
    primary: ['chest'],
    secondary: ['shoulders', 'triceps', 'core'],
    equipment: 'Bodyweight',
    type: 'Compound',
    pattern: 'Push',
    location: ['Home', 'Gym'],
    emphasis: 'General',
    pages: [14, 19],
    summary: 'A free-moving shoulder blade adds protraction to the pressing pattern.',
    cues: [
      'Move your torso as one unit.',
      'Lower through a range you can control.',
      'Finish by reaching the floor away.',
    ],
    animation: 'pushup',
  },
  {
    id: 'cable-fly',
    name: 'Cable fly',
    primary: ['chest'],
    secondary: ['shoulders'],
    equipment: 'Cable',
    type: 'Isolation',
    pattern: 'Push',
    location: ['Gym'],
    emphasis: 'Sternocostal',
    pages: [15, 37],
    summary: 'Cable direction changes the shoulder torque through the arc.',
    cues: [
      'Choose a stable stance and manageable load.',
      'Keep the elbow bend fairly consistent.',
      'Bring the upper arms together through a controlled arc.',
    ],
    animation: 'fly',
  },
  {
    id: 'machine-press',
    name: 'Machine chest press',
    primary: ['chest'],
    secondary: ['triceps', 'shoulders'],
    equipment: 'Machine',
    type: 'Compound',
    pattern: 'Push',
    location: ['Gym'],
    pages: [37],
    summary: 'External support helps make the pressing effort repeatable.',
    cues: [
      'Adjust the seat to a comfortable pressing path.',
      'Keep the torso supported.',
      'Use a controlled range that you can repeat.',
    ],
    animation: 'press',
  },
  {
    id: 'overhead-press',
    name: 'Dumbbell overhead press',
    primary: ['shoulders'],
    secondary: ['triceps', 'back', 'core'],
    equipment: 'Dumbbell',
    type: 'Compound',
    pattern: 'Push',
    location: ['Home', 'Gym'],
    pages: [19, 37],
    summary: 'Arm elevation works with scapular upward rotation and elbow extension.',
    cues: [
      'Start with ribs organized over the pelvis.',
      'Allow the shoulder blades to rotate upward.',
      'Avoid using a large backbend to finish the press.',
    ],
    animation: 'overhead',
  },
  {
    id: 'lateral-raise',
    name: 'Dumbbell lateral raise',
    primary: ['shoulders'],
    secondary: ['back'],
    equipment: 'Dumbbell',
    type: 'Isolation',
    pattern: 'Accessory',
    location: ['Home', 'Gym'],
    pages: [5, 14, 37],
    summary: 'Shoulder abduction loads the deltoid with coordinated scapular movement.',
    cues: [
      'Use a load that allows a controlled arm path.',
      'Raise the arms through your available range.',
      'Let the shoulder blades move naturally.',
    ],
    animation: 'raise',
  },
  {
    id: 'reverse-fly',
    name: 'Reverse fly',
    primary: ['shoulders', 'back'],
    secondary: [],
    equipment: 'Dumbbell',
    type: 'Isolation',
    pattern: 'Pull',
    location: ['Home', 'Gym'],
    pages: [16, 37],
    summary: 'Horizontal abduction emphasizes the posterior shoulder and upper back.',
    cues: [
      'Keep the trunk position repeatable.',
      'Move the upper arms outward.',
      'Return with control instead of collapsing into the reach.',
    ],
    animation: 'fly',
  },
  {
    id: 'lat-pulldown',
    name: 'Neutral-grip pulldown',
    primary: ['back'],
    secondary: ['biceps', 'forearms'],
    equipment: 'Cable',
    type: 'Compound',
    pattern: 'Pull',
    location: ['Gym'],
    pages: [16, 20, 37],
    summary: 'Shoulder adduction and extension combine with elbow flexion.',
    cues: [
      'Choose a comfortable neutral grip.',
      'Allow a controlled reach at the top.',
      'Pull without turning the movement into a large torso swing.',
    ],
    animation: 'pulldown',
  },
  {
    id: 'pull-up',
    name: 'Pull-up',
    primary: ['back'],
    secondary: ['biceps', 'forearms', 'core'],
    equipment: 'Pull-up bar',
    type: 'Compound',
    pattern: 'Pull',
    location: ['Home', 'Gym'],
    pages: [16, 20, 37],
    summary: 'A vertical pull combines shoulder and elbow work while the hands stay fixed.',
    cues: [
      'Start from a controlled overhead position.',
      'Pull through a repeatable range.',
      'Allow shoulder-blade movement instead of pinning it throughout.',
    ],
    animation: 'pulldown',
  },
  {
    id: 'supported-row',
    name: 'Chest-supported row',
    primary: ['back'],
    secondary: ['biceps', 'shoulders'],
    equipment: 'Dumbbell',
    type: 'Compound',
    pattern: 'Pull',
    location: ['Home', 'Gym'],
    pages: [16, 20, 37],
    summary: 'Chest support reduces trunk demand; elbow path changes back emphasis.',
    cues: [
      'Keep the chest supported.',
      'Choose an elbow path that fits your target.',
      'Reach and return without losing control.',
    ],
    animation: 'row',
  },
  {
    id: 'cable-row',
    name: 'One-arm cable row',
    primary: ['back'],
    secondary: ['biceps', 'core'],
    equipment: 'Cable',
    type: 'Compound',
    pattern: 'Pull',
    location: ['Gym'],
    pages: [20, 37, 39],
    summary: 'A unilateral pull also challenges control of trunk rotation.',
    cues: [
      'Establish a stable stance.',
      'Separate shoulder movement from elbow flexion.',
      'Control rotation instead of using it accidentally.',
    ],
    animation: 'row',
  },
  {
    id: 'hammer-curl',
    name: 'Hammer curl',
    primary: ['biceps', 'forearms'],
    secondary: [],
    equipment: 'Dumbbell',
    type: 'Isolation',
    pattern: 'Accessory',
    location: ['Home', 'Gym'],
    pages: [17, 18],
    summary: 'A neutral forearm gives the brachioradialis a favorable position.',
    cues: [
      'Keep the palms facing inward.',
      'Bend the elbow with a repeatable shoulder position.',
      'Keep the load organized over the forearm.',
    ],
    animation: 'curl',
  },
  {
    id: 'biceps-curl',
    name: 'Supinated dumbbell curl',
    primary: ['biceps'],
    secondary: ['forearms'],
    equipment: 'Dumbbell',
    type: 'Isolation',
    pattern: 'Accessory',
    location: ['Home', 'Gym'],
    pages: [17, 18, 40],
    summary: 'A palm-up grip combines elbow flexion with the biceps’ supination role.',
    cues: [
      'Use a comfortable palm-up grip.',
      'Keep shoulder position consistent across repetitions.',
      'Lower with control and avoid unnecessary wrist bending.',
    ],
    animation: 'curl',
  },
  {
    id: 'overhead-extension',
    name: 'Overhead triceps extension',
    primary: ['triceps'],
    secondary: ['core'],
    equipment: 'Dumbbell',
    type: 'Isolation',
    pattern: 'Accessory',
    location: ['Home', 'Gym'],
    pages: [17, 40],
    summary: 'Shoulder flexion lengthens the triceps long head.',
    cues: [
      'Choose a comfortable overhead arm position.',
      'Bend and extend the elbows under control.',
      'Keep the trunk organized without an exaggerated arch.',
    ],
    animation: 'triceps',
  },
  {
    id: 'pressdown',
    name: 'Cable triceps pressdown',
    primary: ['triceps'],
    secondary: [],
    equipment: 'Cable',
    type: 'Isolation',
    pattern: 'Accessory',
    location: ['Gym'],
    pages: [17],
    summary: 'The triceps generate elbow-extension torque against the cable.',
    cues: [
      'Keep the upper-arm position repeatable.',
      'Extend the elbows against the cable.',
      'Return without letting the load pull you out of position.',
    ],
    animation: 'triceps',
  },
  {
    id: 'goblet-squat',
    name: 'Goblet squat',
    primary: ['quads', 'glutes'],
    secondary: ['core'],
    equipment: 'Dumbbell',
    type: 'Compound',
    pattern: 'Squat',
    location: ['Home', 'Gym'],
    pages: [32, 33],
    summary: 'Front loading can support a more upright squat while knees and hips share the work.',
    cues: [
      'Hold the load close and establish a comfortable stance.',
      'Descend between your feet to a controlled depth.',
      'Drive the floor away while maintaining balance.',
    ],
    animation: 'squat',
  },
  {
    id: 'back-squat',
    name: 'Barbell back squat',
    primary: ['quads', 'glutes'],
    secondary: ['core', 'back'],
    equipment: 'Barbell',
    type: 'Compound',
    pattern: 'Squat',
    location: ['Gym'],
    pages: [32, 33],
    summary: 'Knee travel, torso angle and load placement change the distribution of joint torque.',
    cues: [
      'Brace before the descent.',
      'Keep the system balanced over your feet.',
      'Use a stance and depth that are repeatable for you.',
    ],
    animation: 'squat',
  },
  {
    id: 'romanian-deadlift',
    name: 'Romanian deadlift',
    primary: ['hamstrings', 'glutes'],
    secondary: ['back', 'core'],
    equipment: 'Barbell',
    type: 'Compound',
    pattern: 'Hinge',
    location: ['Gym'],
    pages: [26, 34, 35],
    summary:
      'A hip hinge with modest knee bend loads the posterior chain at longer hamstring lengths.',
    cues: [
      'Send the hips backward with a modest knee bend.',
      'Keep the bar close.',
      'End the descent before your chosen pelvis and spine strategy changes.',
    ],
    animation: 'hinge',
  },
  {
    id: 'deadlift',
    name: 'Conventional deadlift',
    primary: ['glutes', 'hamstrings', 'quads'],
    secondary: ['back', 'core', 'forearms'],
    equipment: 'Barbell',
    type: 'Compound',
    pattern: 'Hinge',
    location: ['Gym'],
    pages: [34, 35],
    summary: 'Hip and knee extension lift a load from a floor-constrained start.',
    cues: [
      'Start with the bar close to the body.',
      'Coordinate the hips and knees as the load rises.',
      'Finish tall without leaning backward.',
    ],
    animation: 'hinge',
  },
  {
    id: 'hip-thrust',
    name: 'Hip thrust',
    primary: ['glutes'],
    secondary: ['hamstrings'],
    equipment: 'Barbell',
    type: 'Compound',
    pattern: 'Hinge',
    location: ['Gym'],
    pages: [26, 34],
    summary: 'A supported torso shifts substantial hip demand toward the top of the movement.',
    cues: [
      'Set a stable bench and foot position.',
      'Extend the hips through a controlled range.',
      'Finish with the ribs and pelvis organized.',
    ],
    animation: 'thrust',
  },
  {
    id: 'reverse-lunge',
    name: 'Reverse lunge',
    primary: ['quads', 'glutes'],
    secondary: ['core', 'hamstrings'],
    equipment: 'Bodyweight',
    type: 'Compound',
    pattern: 'Lunge',
    location: ['Home', 'Gym'],
    pages: [31, 36],
    summary: 'Stepping backward provides a controllable entry to a split-stance pattern.',
    cues: [
      'Step back into a balanced stance.',
      'Control the pelvis and front knee.',
      'Push through the stance leg to return.',
    ],
    animation: 'lunge',
  },
  {
    id: 'split-squat',
    name: 'Dumbbell split squat',
    primary: ['quads', 'glutes'],
    secondary: ['core'],
    equipment: 'Dumbbell',
    type: 'Compound',
    pattern: 'Lunge',
    location: ['Home', 'Gym'],
    pages: [31, 36],
    summary: 'Stride length and torso position change the balance of knee and hip demand.',
    cues: [
      'Choose a stable split stance.',
      'Lower with control over the front leg.',
      'Keep stride and torso position consistent.',
    ],
    animation: 'lunge',
  },
  {
    id: 'leg-extension',
    name: 'Leg extension',
    primary: ['quads'],
    secondary: [],
    equipment: 'Machine',
    type: 'Isolation',
    pattern: 'Accessory',
    location: ['Gym'],
    pages: [27, 28],
    summary: 'A machine directly loads knee extension without hip-extension demand.',
    cues: [
      'Adjust the machine to your leg length.',
      'Extend the knee through a controllable range.',
      'Lower without letting the stack drop.',
    ],
    animation: 'legextension',
  },
  {
    id: 'seated-leg-curl',
    name: 'Seated leg curl',
    primary: ['hamstrings'],
    secondary: [],
    equipment: 'Machine',
    type: 'Isolation',
    pattern: 'Accessory',
    location: ['Gym'],
    pages: [28],
    summary: 'The seated position lengthens the hip-crossing hamstrings relative to lying curls.',
    cues: [
      'Set the support pads securely.',
      'Bend the knees while keeping the pelvis supported.',
      'Return under control.',
    ],
    animation: 'legcurl',
  },
  {
    id: 'calf-raise',
    name: 'Standing calf raise',
    primary: ['calves'],
    secondary: [],
    equipment: 'Bodyweight',
    type: 'Isolation',
    pattern: 'Accessory',
    location: ['Home', 'Gym'],
    pages: [29, 40],
    summary: 'A relatively straight knee keeps gastrocnemius longer at the knee.',
    cues: [
      'Use support if balance limits the movement.',
      'Lift and lower the heels with control.',
      'Keep the knee position consistent.',
    ],
    animation: 'calf',
  },
  {
    id: 'farmer-carry',
    name: 'Farmer carry',
    primary: ['forearms', 'back', 'core'],
    secondary: ['glutes'],
    equipment: 'Dumbbell',
    type: 'Carry',
    pattern: 'Carry',
    location: ['Home', 'Gym'],
    pages: [38],
    summary: 'Bilateral loading trains grip, trunk stiffness and walking under load.',
    cues: [
      'Stand tall with the loads at your sides.',
      'Keep steps controlled.',
      'Use enough trunk stiffness while continuing to breathe.',
    ],
    animation: 'carry',
    metric: 'meters',
  },
  {
    id: 'pallof-press',
    name: 'Pallof press',
    primary: ['core'],
    secondary: ['shoulders'],
    equipment: 'Cable',
    type: 'Anti-rotation',
    pattern: 'Rotation',
    location: ['Gym'],
    pages: [22, 39],
    summary: 'The cable tries to rotate the trunk as the arms move farther from the body.',
    cues: [
      'Stand side-on to the cable in a stable stance.',
      'Press the hands away while resisting rotation.',
      'Return with control.',
    ],
    animation: 'rotation',
  },
];
export const source = {
  title: 'Functional Anatomy for Strength Training',
  edition: 'Field Guide · 2026',
  pages: 54,
  note: 'Exercise summaries adapted from the supplied guide. Equipment tags and movement schematics are ATLAS implementations, not illustrations extracted from the PDF.',
};
export const muscleById = Object.fromEntries(muscles.map((m) => [m.id, m])) as Record<
  MuscleId,
  Muscle
>;
export const exerciseById = Object.fromEntries(exercises.map((e) => [e.id, e])) as Record<
  string,
  Exercise
>;
