import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, Moon, Smartphone, Sun, X } from 'lucide-react-native';
import { useAppTheme } from '../ThemeProvider';
import type { AppearanceChoice } from '../theme';

const choices: { id: AppearanceChoice; label: string; detail: string; Icon: typeof Sun }[] = [
  { id: 'system', label: 'Automatic', detail: 'Match your device', Icon: Smartphone },
  { id: 'light', label: 'Light', detail: 'A bright canvas', Icon: Sun },
  { id: 'dark', label: 'Dark', detail: 'Easy on the eyes', Icon: Moon },
];

export function Appearance({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme, appearance, select, loaded, storageError } = useAppTheme();
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
    <SafeAreaView style={styles.overlay} edges={['bottom']}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Dismiss appearance" accessibilityRole="button" />
      <View accessibilityViewIsModal style={[styles.sheet, { backgroundColor: theme.background }]}>
        <View style={styles.heading}>
          <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>Appearance</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close appearance" onPress={onClose} style={styles.close}><X size={20} color={theme.accent} /></Pressable>
        </View>
        <View style={[styles.group, { backgroundColor: theme.surface }]}>
          {choices.map(({ id, label, detail, Icon }, index) => <Pressable key={id} accessibilityRole="radio" aria-checked={appearance === id} accessibilityLabel={`${label} appearance`} accessibilityState={{ checked: appearance === id, disabled: !loaded }} disabled={!loaded} onPress={() => select(id)} style={({ pressed }) => [styles.option, { opacity: pressed ? 0.6 : 1, borderBottomColor: theme.line, borderBottomWidth: index === choices.length - 1 ? 0 : StyleSheet.hairlineWidth }]}>
            <Icon size={21} color={theme.accent} />
            <View style={{ flex: 1, gap: 2 }}><Text style={[styles.name, { color: theme.text }]}>{label}</Text><Text style={[styles.detail, { color: theme.muted }]}>{detail}</Text></View>
            {appearance === id && <Check size={20} color={theme.accent} />}
          </Pressable>)}
        </View>
        {storageError && <Text accessibilityLiveRegion="polite" style={{ color: '#D92D20', marginTop: 12 }}>Could not save. Choose an option to retry.</Text>}
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.done}><Text style={{ color: theme.accent, fontSize: 17, fontWeight: '600' }}>Done</Text></Pressable>
      </View>
    </SafeAreaView>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.38)', justifyContent: 'flex-end' },
  sheet: { width: '100%', maxWidth: 520, alignSelf: 'center', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 12 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  title: { fontSize: 27, fontWeight: '700', letterSpacing: -0.5 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  group: { borderRadius: 16, overflow: 'hidden', paddingHorizontal: 16 },
  option: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 14 },
  name: { fontSize: 16, fontWeight: '600' },
  detail: { fontSize: 12 },
  done: { minHeight: 55, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
});
