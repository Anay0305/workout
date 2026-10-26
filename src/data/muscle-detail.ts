import { completedSessions, countable } from './analytics';
import type { MuscleGroup, SessionExercise, WorkoutSession } from './types';

// Muscle vocabulary and region names copied from BHIM/shared/training.ts.
export const MUSCLES = [
  { id: 'upper_chest', name: 'Upper chest', region: 'Push' },
  { id: 'chest', name: 'Mid / lower chest', region: 'Push' },
  { id: 'front_delts', name: 'Front delts', region: 'Push' },
  { id: 'side_delts', name: 'Side delts', region: 'Push' },
  { id: 'rear_delts', name: 'Rear delts', region: 'Pull' },
  { id: 'biceps', name: 'Biceps', region: 'Pull' },
  { id: 'triceps', name: 'Triceps', region: 'Push' },
  { id: 'forearms', name: 'Forearms', region: 'Pull' },
  { id: 'traps', name: 'Upper traps', region: 'Pull' },
  { id: 'lats', name: 'Lats', region: 'Pull' },
  { id: 'mid_back', name: 'Mid back', region: 'Pull' },
  { id: 'lower_back', name: 'Lower back', region: 'Core' },
  { id: 'abs', name: 'Abs', region: 'Core' },
  { id: 'obliques', name: 'Obliques', region: 'Core' },
  { id: 'glutes', name: 'Glutes', region: 'Legs' },
  { id: 'quads', name: 'Quads', region: 'Legs' },
  { id: 'hamstrings', name: 'Hamstrings', region: 'Legs' },
  { id: 'adductors', name: 'Inner thighs', region: 'Legs' },
  { id: 'calves', name: 'Calves', region: 'Legs' },
  { id: 'tibialis', name: 'Shins / tibialis', region: 'Legs' },
  { id: 'serratus', name: 'Serratus anterior', region: 'Core' },
  { id: 'rotator_cuff', name: 'Rotator cuff', region: 'Pull' },
  { id: 'glute_medius', name: 'Side glutes / abductors', region: 'Legs' },
  { id: 'soleus', name: 'Soleus / deep calf', region: 'Legs' },
  { id: 'forearm_extensors', name: 'Forearm extensors', region: 'Pull' },
] as const;

export type MuscleId = typeof MUSCLES[number]['id'];
export type MuscleRegion = typeof MUSCLES[number]['region'];
export type DetailedMuscleWork = { id: MuscleId; directSets: number; assistingSets: number; sessions: number; exercises: string[] };
type Targets = { primary: readonly MuscleId[]; secondary: readonly MuscleId[] };

const fallbackPrimary: Record<MuscleGroup, MuscleId> = {
  chest: 'chest', back: 'lats', shoulders: 'front_delts', biceps: 'biceps', triceps: 'triceps',
  forearms: 'forearms', abs: 'abs', glutes: 'glutes', quads: 'quads', hamstrings: 'hamstrings', calves: 'calves',
};
const fallbackSecondary: Record<MuscleGroup, MuscleId> = {
  ...fallbackPrimary, back: 'mid_back', shoulders: 'front_delts',
};

// Matching exercises keep BHIM's direct and assisting regions. The existing
// journal stores broad groups, so this projection also covers older sessions.
const targets: Record<string, Targets> = {
  'bench-press': { primary: ['chest'], secondary: ['front_delts', 'triceps'] },
  'incline-bench': { primary: ['upper_chest'], secondary: ['front_delts', 'triceps'] },
  'dumbbell-bench': { primary: ['chest'], secondary: ['front_delts', 'triceps'] },
  'incline-dumbbell': { primary: ['upper_chest'], secondary: ['front_delts', 'triceps'] },
  'dumbbell-fly': { primary: ['chest'], secondary: ['front_delts'] },
  'cable-fly': { primary: ['chest'], secondary: ['front_delts'] },
  'chest-press': { primary: ['chest'], secondary: ['front_delts', 'triceps'] },
  'push-up': { primary: ['chest'], secondary: ['triceps', 'front_delts', 'abs', 'serratus'] },
  'incline-push-up': { primary: ['chest'], secondary: ['triceps', 'front_delts'] },
  'dip': { primary: ['triceps', 'chest'], secondary: ['front_delts'] },
  'pull-up': { primary: ['lats'], secondary: ['biceps', 'forearms', 'mid_back'] },
  'chin-up': { primary: ['lats', 'biceps'], secondary: ['forearms', 'mid_back'] },
  'lat-pulldown': { primary: ['lats'], secondary: ['biceps', 'mid_back'] },
  'barbell-row': { primary: ['lats', 'mid_back'], secondary: ['biceps', 'rear_delts', 'lower_back'] },
  'dumbbell-row': { primary: ['lats', 'mid_back'], secondary: ['biceps', 'rear_delts'] },
  'seated-row': { primary: ['mid_back', 'lats'], secondary: ['biceps', 'rear_delts'] },
  'chest-supported-row': { primary: ['mid_back', 'lats'], secondary: ['biceps', 'rear_delts'] },
  'inverted-row': { primary: ['mid_back', 'lats'], secondary: ['biceps', 'abs'] },
  'face-pull': { primary: ['rear_delts', 'mid_back'], secondary: ['traps', 'rotator_cuff'] },
  'band-row': { primary: ['mid_back', 'lats'], secondary: ['biceps'] },
  'overhead-press': { primary: ['front_delts'], secondary: ['side_delts', 'triceps'] },
  'dumbbell-shoulder-press': { primary: ['front_delts'], secondary: ['side_delts', 'triceps'] },
  'arnold-press': { primary: ['front_delts', 'side_delts'], secondary: ['triceps'] },
  'lateral-raise': { primary: ['side_delts'], secondary: ['traps'] },
  'cable-lateral-raise': { primary: ['side_delts'], secondary: ['traps'] },
  'rear-delt-fly': { primary: ['rear_delts'], secondary: ['mid_back'] },
  'pike-push-up': { primary: ['front_delts'], secondary: ['side_delts', 'triceps'] },
  'hammer-curl': { primary: ['biceps', 'forearms'], secondary: [] },
  'farmer-carry': { primary: ['forearms', 'traps'], secondary: ['forearm_extensors', 'abs', 'obliques', 'glute_medius', 'quads', 'calves'] },
  'back-squat': { primary: ['quads', 'glutes'], secondary: ['adductors', 'lower_back', 'abs'] },
  'front-squat': { primary: ['quads', 'glutes'], secondary: ['adductors', 'abs', 'lower_back'] },
  'goblet-squat': { primary: ['quads', 'glutes'], secondary: ['adductors', 'abs'] },
  'bodyweight-squat': { primary: ['quads', 'glutes'], secondary: ['adductors'] },
  'leg-press': { primary: ['quads', 'glutes'], secondary: ['adductors'] },
  'bulgarian-split-squat': { primary: ['quads', 'glutes'], secondary: ['glute_medius', 'adductors', 'abs'] },
  'reverse-lunge': { primary: ['quads', 'glutes'], secondary: ['hamstrings', 'adductors', 'glute_medius'] },
  'walking-lunge': { primary: ['quads', 'glutes'], secondary: ['hamstrings', 'adductors', 'glute_medius'] },
  'step-up': { primary: ['quads', 'glutes'], secondary: ['glute_medius', 'hamstrings'] },
  deadlift: { primary: ['glutes', 'hamstrings', 'lower_back'], secondary: ['quads', 'traps', 'forearms'] },
  'romanian-deadlift': { primary: ['hamstrings', 'glutes'], secondary: ['lower_back', 'forearms'] },
  'dumbbell-rdl': { primary: ['hamstrings', 'glutes'], secondary: ['lower_back', 'forearms'] },
  'single-leg-rdl': { primary: ['hamstrings', 'glutes'], secondary: ['glute_medius', 'lower_back'] },
  'hip-thrust': { primary: ['glutes'], secondary: ['hamstrings'] },
  'glute-bridge': { primary: ['glutes'], secondary: ['hamstrings'] },
  'cable-kickback': { primary: ['glutes'], secondary: ['hamstrings'] },
  'kettlebell-swing': { primary: ['glutes', 'hamstrings'], secondary: ['lower_back', 'forearms', 'abs'] },
  'dumbbell-calf-raise': { primary: ['calves'], secondary: ['soleus'] },
  'bodyweight-calf-raise': { primary: ['calves'], secondary: ['soleus'] },
  plank: { primary: ['abs'], secondary: ['obliques', 'serratus', 'glutes'] },
  'side-plank': { primary: ['obliques'], secondary: ['glute_medius', 'abs', 'serratus'] },
  'dead-bug': { primary: ['abs'], secondary: ['obliques'] },
  'hanging-knee-raise': { primary: ['abs'], secondary: ['obliques', 'forearms'] },
  'pallof-press': { primary: ['obliques'], secondary: ['abs'] },
  'mountain-climber': { primary: ['abs'], secondary: ['quads', 'front_delts', 'serratus'] },
  run: { primary: ['quads', 'calves', 'soleus', 'glutes'], secondary: ['hamstrings', 'glute_medius', 'abs', 'tibialis'] },
  walk: { primary: ['quads', 'calves', 'glutes'], secondary: ['hamstrings', 'soleus', 'tibialis'] },
  cycling: { primary: ['quads', 'glutes'], secondary: ['hamstrings', 'calves'] },
  rowing: { primary: ['quads', 'glutes', 'lats', 'mid_back'], secondary: ['hamstrings', 'biceps', 'forearms', 'abs'] },
  'jump-rope': { primary: ['calves', 'soleus'], secondary: ['quads', 'tibialis'] },
  'wall-sit': { primary: ['quads', 'glutes'], secondary: ['calves', 'abs'] },
};

export function muscleTargets(exercise: Pick<SessionExercise, 'exerciseId' | 'muscle' | 'secondaryMuscles'>): Targets {
  return targets[exercise.exerciseId] ?? {
    primary: [fallbackPrimary[exercise.muscle]],
    secondary: [...new Set(exercise.secondaryMuscles.map(group => fallbackSecondary[group]))],
  };
}

export function detailedMuscleWorkload(sessions: WorkoutSession[]): DetailedMuscleWork[] {
  const work: DetailedMuscleWork[] = MUSCLES.map(muscle => ({ id: muscle.id, directSets: 0, assistingSets: 0, sessions: 0, exercises: [] }));
  for (const session of completedSessions(sessions)) {
    const touched = new Set<MuscleId>();
    for (const exercise of session.exercises) {
      const efforts = exercise.sets.filter(set => countable(set, exercise.kind)).length;
      if (!efforts) continue;
      const { primary, secondary } = muscleTargets(exercise);
      for (const row of work) {
        const direct = primary.includes(row.id);
        if (!direct && !secondary.includes(row.id)) continue;
        if (direct) row.directSets += efforts;
        else row.assistingSets += efforts;
        touched.add(row.id);
        if (!row.exercises.includes(exercise.name)) row.exercises.push(exercise.name);
      }
    }
    for (const row of work) if (touched.has(row.id)) row.sessions++;
  }
  return work;
}

export function sessionTouchesMuscle(session: WorkoutSession, muscle: MuscleId) {
  return session.exercises.some(exercise => exercise.sets.some(set => countable(set, exercise.kind)) &&
    (muscleTargets(exercise).primary.includes(muscle) || muscleTargets(exercise).secondary.includes(muscle)));
}
