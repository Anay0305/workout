import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { ANATOMY_LICENSE } from '../../data/muscle-anatomy';
import { MUSCLES, type DetailedMuscleWork, type MuscleId, type MuscleRegion } from '../../data/muscle-detail';
import { muscleFill } from '../../data/muscle-intensity';
import { MuscleIntensityLegend, MuscleMap, muscleColors } from './MuscleMap';
import { useState } from 'react';

export function DetailedMusclePanel({ muscles, selected, onSelect, period = 'WEEK IN PROGRESS' }: { muscles: DetailedMuscleWork[]; selected: MuscleId | null; onSelect: (id: MuscleId) => void; period?: string }) {
  const [view, setView] = useState<'both' | 'front' | 'back'>('both');
  const [filter, setFilter] = useState<'All' | MuscleRegion>('All');
  const trainedCount = muscles.filter(muscle => muscle.directSets + muscle.assistingSets > 0).length;
  const focus = muscles.find(muscle => muscle.id === selected);
  const showCredits = () => Platform.OS === 'web' ? window.alert(ANATOMY_LICENSE) : Alert.alert('Anatomy artwork · MIT licence', ANATOMY_LICENSE);

  return <View style={{ gap: 16 }}>
    <View style={styles.mapCard}>
      <View style={styles.mapTop}><View><Text style={styles.mapKicker}>MUSCLE COVERAGE</Text><View style={styles.coverage}><Text style={styles.coverageNumber}>{trainedCount}</Text><Text style={styles.coverageOf}>/ {MUSCLES.length} groups</Text></View></View><View style={styles.live}><View style={styles.dot} /><Text style={styles.liveText}>{period}</Text></View></View>
      <View style={styles.progress}><View style={[styles.progressFill, { width: `${trainedCount / MUSCLES.length * 100}%` }]} /></View>
      <View style={styles.views}>{(['both', 'front', 'back'] as const).map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: view === value }} accessibilityLabel={`Show ${value} muscle view`} onPress={() => setView(value)} style={[styles.viewTab, view === value && styles.viewActive]}><Text style={[styles.viewText, view === value && styles.viewTextActive]}>{value === 'both' ? 'Overview' : value === 'front' ? 'Front' : 'Back'}</Text></Pressable>)}</View>
      <MuscleMap muscles={muscles} selected={selected} onSelect={onSelect} view={view} />
      <MuscleIntensityLegend period={period === 'ALL TIME' ? 'across all workouts' : 'this week'} />
      <Text style={styles.mapHint}>Tap a muscle · Front / Back for a closer view</Text>
    </View>
    {focus && <View accessibilityLiveRegion="polite" style={styles.focus}><View style={styles.focusTop}><Text style={styles.focusTitle}>{MUSCLES.find(muscle => muscle.id === focus.id)?.name}</Text><Text style={styles.focusStatus}>{focus.directSets + focus.assistingSets ? 'WORK LOGGED' : 'NOT LOGGED'}</Text></View><Text style={styles.focusNumbers}>{focus.directSets} direct efforts   ·   {focus.assistingSets} assisting efforts   ·   {focus.sessions} sessions</Text><Text style={styles.focusBody}>{focus.exercises.length ? focus.exercises.join(' · ') : 'No completed sets / intervals involve this muscle in the selected period.'}</Text></View>}
    <View style={styles.detailCard}>
    <View style={styles.sectionRow}><Text style={styles.sectionTitle}>Muscle detail</Text><Text style={styles.small}>Direct / assisting efforts</Text></View>
    <View style={styles.filters}>{(['All', 'Push', 'Pull', 'Legs', 'Core'] as const).map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: filter === value }} onPress={() => setFilter(value)} style={[styles.filter, filter === value && styles.filterActive]}><Text style={[styles.filterText, filter === value && styles.filterTextActive]}>{value}</Text></Pressable>)}</View>
    <View style={styles.muscles}>{MUSCLES.filter(muscle => filter === 'All' || muscle.region === filter).map(muscle => {
      const work = muscles.find(row => row.id === muscle.id)!;
      const trained = work.directSets + work.assistingSets > 0;
      return <Pressable key={muscle.id} accessibilityRole="button" accessibilityLabel={`${muscle.name}, ${work.directSets} direct efforts, ${work.assistingSets} assisting efforts`} accessibilityState={{ selected: selected === muscle.id }} onPress={() => onSelect(muscle.id)} style={[styles.muscleRow, selected === muscle.id && styles.muscleSelected]}><View style={[styles.statusMark, { backgroundColor: muscleFill(work) }]}>{trained ? <Check size={12} color="#28734D" /> : <Text style={{ color: '#8F3330' }}>–</Text>}</View><Text style={styles.muscleName}>{muscle.name}</Text><Text style={styles.muscleSets}>{work.directSets} <Text style={styles.small}>/ {work.assistingSets}</Text></Text></Pressable>;
    })}</View>
    <Pressable accessibilityRole="button" accessibilityLabel="Anatomy artwork credits" onPress={showCredits} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={styles.credit}>Anatomy artwork credits</Text></Pressable>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  mapCard: { backgroundColor: '#17251F', borderRadius: 28, padding: 20, overflow: 'hidden' },
  mapTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 5 },
  mapKicker: { color: '#B7C8AD', fontWeight: '800', fontSize: 9, letterSpacing: 1.5 },
  coverage: { flexDirection: 'row', alignItems: 'baseline', gap: 7 },
  coverageNumber: { fontSize: 34, fontWeight: '800', color: '#F4F5E9' },
  coverageOf: { color: '#B7C8AD', fontSize: 11 },
  live: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: muscleColors.trained },
  liveText: { color: '#B7C8AD', fontSize: 7, fontWeight: '800', letterSpacing: 0.8 },
  progress: { height: 3, borderRadius: 3, backgroundColor: '#334238', marginTop: 12 },
  progressFill: { backgroundColor: muscleColors.trained, height: 3, borderRadius: 3 },
  views: { alignSelf: 'center', flexDirection: 'row', backgroundColor: '#22332A', padding: 3, borderRadius: 20, marginVertical: 15 },
  viewTab: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 18 },
  viewActive: { backgroundColor: '#DCE7B6' },
  viewText: { color: '#B7C8AD', fontSize: 11, fontWeight: '700' },
  viewTextActive: { color: '#17251F' },
  mapHint: { color: '#93A58F', fontSize: 10, textAlign: 'center', marginTop: 12 },
  focus: { padding: 16, backgroundColor: '#E5EAD9', borderRadius: 18, gap: 8 },
  focusTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  focusTitle: { fontSize: 18, fontWeight: '800', color: '#17251F' },
  focusStatus: { fontSize: 8, letterSpacing: 0.8, fontWeight: '800', color: '#477344' },
  focusNumbers: { fontSize: 11, color: '#17251F' },
  focusBody: { fontSize: 12, lineHeight: 18, color: '#58635B' },
  detailCard: { backgroundColor: '#F4F5EF', borderRadius: 22, padding: 16, gap: 12 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  sectionTitle: { color: '#17251F', fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  small: { color: '#6B766C', fontSize: 10 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  filter: { minHeight: 40, paddingHorizontal: 15, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: '#E6E8DF' },
  filterActive: { backgroundColor: '#17251F' },
  filterText: { fontSize: 11, color: '#17251F', fontWeight: '700' },
  filterTextActive: { color: '#FFFFFF' },
  muscles: { gap: 5 },
  muscleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 46, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'transparent' },
  muscleSelected: { borderColor: '#477344', backgroundColor: '#F0F3E8' },
  statusMark: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  muscleName: { flex: 1, fontSize: 13, color: '#17251F' },
  muscleSets: { fontWeight: '800', fontSize: 13, color: '#17251F' },
  credit: { color: '#6B766C', fontSize: 11, textAlign: 'center' },
});
