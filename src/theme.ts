export type Palette = {
  id: 'light' | 'dark'; name: string; description: string;
  background: string; surface: string; raised: string; line: string;
  text: string; muted: string; accent: string; onAccent: string; danger: string; dangerSurface: string;
};

export type AppearanceChoice = 'system' | 'light' | 'dark';
export const DEFAULT_THEME_ID: AppearanceChoice = 'system';

export const palettes: Palette[] = [
  { id: 'light', name: 'Light', description: 'A clean, bright canvas', background: '#F2F2F7', surface: '#FFFFFF', raised: '#F2F2F7', line: '#E5E5EA', text: '#1C1C1E', muted: '#6E6E73', accent: '#007AFF', onAccent: '#FFFFFF', danger: '#D92D20', dangerSurface: '#FFF0F0' },
  { id: 'dark', name: 'Dark', description: 'Comfortable in low light', background: '#000000', surface: '#1C1C1E', raised: '#2C2C2E', line: '#38383A', text: '#F5F5F7', muted: '#98989E', accent: '#0A84FF', onAccent: '#FFFFFF', danger: '#FF6961', dangerSurface: '#3A2021' },
];

export function resolveThemeId(saved: string | null): AppearanceChoice {
  if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
  // The previous color themes were all dark; preserve that preference.
  if (saved && ['chalk', 'volt', 'cobalt', 'amber', 'solar', 'ember'].includes(saved)) return 'dark';
  return DEFAULT_THEME_ID;
}
