import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import { DEFAULT_THEME_ID, palettes, resolveThemeId, type AppearanceChoice, type Palette } from './theme';

const preferenceKey = 'workout.palette.v1';
type ThemeContextValue = { theme: Palette; appearance: AppearanceChoice; loaded: boolean; storageError: boolean; select: (id: AppearanceChoice) => void };
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<AppearanceChoice>(DEFAULT_THEME_ID);
  const systemScheme = useColorScheme();
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const writes = useRef(Promise.resolve());
  const latestSelection = useRef<AppearanceChoice>(DEFAULT_THEME_ID);
  useEffect(() => {
    let live = true;
    async function restore() {
      try {
        const saved = await AsyncStorage.getItem(preferenceKey);
        const id = resolveThemeId(saved);
        if (!live) return;
        setSelected(id); latestSelection.current = id;
        // Migrate the previous color themes to the simpler appearance setting.
        if (saved !== null && saved !== id) await AsyncStorage.setItem(preferenceKey, id);
      } catch { if (live) setStorageError(true); }
      finally { if (live) setLoaded(true); }
    }
    void restore();
    return () => { live = false; };
  }, []);

  function select(id: AppearanceChoice) {
    if (!loaded || !['system', 'light', 'dark'].includes(id)) return;
    latestSelection.current = id;
    setSelected(id);
    // Serialize writes so rapid taps cannot restore an older choice next launch.
    writes.current = writes.current.then(async () => {
      try { await AsyncStorage.setItem(preferenceKey, id); if (latestSelection.current === id) setStorageError(false); }
      catch { if (latestSelection.current === id) setStorageError(true); }
    });
  }
  const effective = selected === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : selected;
  return <ThemeContext.Provider value={{ theme: palettes.find(theme => theme.id === effective)!, appearance: selected, loaded, storageError, select }}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useAppTheme requires ThemeProvider');
  return value;
}
