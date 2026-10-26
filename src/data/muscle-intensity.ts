import type { DetailedMuscleWork } from './muscle-detail';

// Fixed weekly bins and colors copied from BHIM/app/lib/muscle-intensity.ts.
export const musclePalette = ['#C07B77', '#ADCBC8', '#DDEFC0', '#A5D384', '#66B77D', '#319A68'] as const;
export const muscleIntensityLegend = [
  { label: '1–3', color: musclePalette[2] },
  { label: '4–7', color: musclePalette[3] },
  { label: '8–11', color: musclePalette[4] },
  { label: '12+', color: musclePalette[5] },
];

export function muscleIntensity(work?: Pick<DetailedMuscleWork, 'directSets' | 'assistingSets'>): number {
  const direct = Math.max(0, work?.directSets ?? 0);
  if (direct >= 12) return 5;
  if (direct >= 8) return 4;
  if (direct >= 4) return 3;
  if (direct > 0) return 2;
  return (work?.assistingSets ?? 0) > 0 ? 1 : 0;
}

export function muscleFill(work?: Pick<DetailedMuscleWork, 'directSets' | 'assistingSets'>) {
  return musclePalette[muscleIntensity(work)]!;
}
