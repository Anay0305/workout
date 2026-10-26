import { useMemo, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, Dumbbell, Plus, Search, Star, X } from 'lucide-react-native';
import { useAppTheme } from '../ThemeProvider';
import { useTraining } from '../data/store';
import { EXERCISES, EQUIPMENT, MUSCLE_LABELS } from '../data/catalog';
import type { Exercise, ExerciseKind, MuscleGroup } from '../data/types';
import { uid } from '../data/workout';
import { Body, Button, Chip, Field, IconButton, Label, Title, u } from './ui';

export function ExercisePicker({ visible, onClose, onSelect }: { visible: boolean; onClose: () => void; onSelect: (exercise: Exercise) => void }) {
  const { theme: t } = useAppTheme();
  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }}>
      <View style={[u.row, { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 20 }]}><View style={{ flex: 1 }}><Title>Add exercise</Title><Body muted>Find your next movement.</Body></View><IconButton label="Close exercise picker" onPress={onClose}><X color={t.text} size={20} /></IconButton></View>
      <ExerciseBrowser onSelect={exercise => { onSelect(exercise); onClose(); }} />
    </SafeAreaView>
  </Modal>;
}

export function ExerciseBrowser({ onSelect }: { onSelect: (exercise: Exercise) => void }) {
  const { theme: t } = useAppTheme();
  const { state, update } = useTraining();
  const [search, setSearch] = useState('');
  const [muscle, setMuscle] = useState('All');
  const [equipment, setEquipment] = useState('All equipment');
  const [favorites, setFavorites] = useState(false);
  const [create, setCreate] = useState(false);
  const list = useMemo(() => [...EXERCISES, ...state.customExercises].filter(exercise =>
    `${exercise.name} ${exercise.equipment} ${MUSCLE_LABELS[exercise.muscle]}`.toLowerCase().includes(search.toLowerCase()) &&
    (muscle === 'All' || exercise.muscle === muscle) &&
    (equipment === 'All equipment' || exercise.equipment === equipment) &&
    (!favorites || state.favoriteExerciseIds.includes(exercise.id))), [search, muscle, equipment, favorites, state.customExercises, state.favoriteExerciseIds]);
  function favorite(id: string) { update(draft => { draft.favoriteExerciseIds = draft.favoriteExerciseIds.includes(id) ? draft.favoriteExerciseIds.filter(value => value !== id) : [...draft.favoriteExerciseIds, id]; }); }
  return <View style={{ flex: 1, width: '100%', maxWidth: 760, alignSelf: 'center' }}>
    <View style={{ gap: 13, paddingHorizontal: 22, paddingBottom: 12 }}>
      <View style={u.row}><View style={{ flex: 1 }}><Field accessibilityLabel="Search exercises" placeholder="Search exercises, muscles…" value={search} onChangeText={setSearch} /></View><IconButton label={favorites ? 'Show all exercises' : 'Show favorite exercises'} onPress={() => setFavorites(!favorites)}><Star size={20} color={favorites ? t.accent : t.muted} fill={favorites ? t.accent : 'none'} /></IconButton></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7 }}><Chip label="All muscles" selected={muscle === 'All'} onPress={() => setMuscle('All')} />{Object.entries(MUSCLE_LABELS).map(([id, name]) => <Chip key={id} label={name} selected={muscle === id} onPress={() => setMuscle(id)} />)}</ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7 }}>{['All equipment', ...EQUIPMENT].map(value => <Chip key={value} label={value} selected={equipment === value} onPress={() => setEquipment(value)} />)}</ScrollView>
      <View style={[u.row, { justifyContent: 'space-between' }]}><Label>{list.length} movements</Label><Pressable accessibilityRole="button" onPress={() => setCreate(true)} style={[u.row, { minHeight: 40, gap: 5 }]}><Plus size={15} color={t.accent} /><Text style={{ color: t.accent, fontSize: 12, fontWeight: '600' }}>Create exercise</Text></Pressable></View>
    </View>
    <FlatList data={list} keyExtractor={item => item.id} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 30 }}
      ListEmptyComponent={<View style={{ paddingVertical: 35, alignItems: 'center', gap: 12 }}><Search size={30} color={t.muted} /><Title>No matching exercises</Title><Body muted>Try another filter or create your own.</Body></View>}
      renderItem={({ item }) => <View style={[u.row, { borderBottomWidth: 1, borderBottomColor: t.line, gap: 8 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Select ${item.name}`} onPress={() => onSelect(item)} style={[u.row, { flex: 1, minHeight: 82, paddingVertical: 12 }]}>
          <View style={{ width: 42, height: 44, borderRadius: 12, backgroundColor: t.raised, alignItems: 'center', justifyContent: 'center' }}><Dumbbell size={20} color={t.accent} /></View>
          <View style={{ flex: 1, gap: 5 }}><Text style={{ color: t.text, fontSize: 14, fontWeight: '600' }}>{item.name}</Text><Text style={{ color: t.muted, fontSize: 11 }}>{MUSCLE_LABELS[item.muscle]} · {item.equipment}{item.custom ? ' · Custom' : ''}</Text></View>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`${state.favoriteExerciseIds.includes(item.id) ? 'Unfavorite' : 'Favorite'} ${item.name}`} onPress={() => favorite(item.id)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Star size={18} color={state.favoriteExerciseIds.includes(item.id) ? t.accent : t.muted} fill={state.favoriteExerciseIds.includes(item.id) ? t.accent : 'none'} /></Pressable>
      </View>} />
    <CustomExercise visible={create} onClose={() => setCreate(false)} onCreated={exercise => { setCreate(false); onSelect(exercise); }} />
  </View>;
}

function CustomExercise({ visible, onClose, onCreated }: { visible: boolean; onClose: () => void; onCreated: (exercise: Exercise) => void }) {
  const { theme: t } = useAppTheme();
  const { state, update, flush } = useTraining();
  const [name, setName] = useState(''); const [muscle, setMuscle] = useState<MuscleGroup>('chest');
  const [equipment, setEquipment] = useState('Dumbbell'); const [kind, setKind] = useState<ExerciseKind>('weighted');
  const pendingId = useRef<string | null>(null);
  const [instructions, setInstructions] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function save() {
    if (!name.trim()) { setError('Give this movement a name.'); return; }
    if ([...EXERCISES, ...state.customExercises].some(item => item.id !== pendingId.current && item.name.toLowerCase() === name.trim().toLowerCase())) { setError('An exercise with that name already exists.'); return; }
    setBusy(true); setError('');
    const exercise: Exercise = { id: pendingId.current ?? uid(), name: name.trim(), muscle, secondaryMuscles: [], equipment, kind, instructions: instructions.trim(), custom: true };
    pendingId.current = exercise.id;
    try { update(draft => { const index = draft.customExercises.findIndex(item => item.id === exercise.id); if (index >= 0) draft.customExercises[index] = exercise; else draft.customExercises.push(exercise); }); await flush(); pendingId.current = null; setName(''); setInstructions(''); onCreated(exercise); }
    catch { setError('Could not save. Your entry is still here.'); }
    finally { setBusy(false); }
  }
  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }}><ScrollView automaticallyAdjustKeyboardInsets keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" contentContainerStyle={u.page}>
      <View style={u.row}><View style={{ flex: 1 }}><Title>Make it your own</Title><Body muted>Create a movement for your library.</Body></View><IconButton label="Close custom exercise" onPress={onClose}><X size={20} color={t.text} /></IconButton></View>
      <Field label="Exercise name" value={name} onChangeText={setName} maxLength={80} placeholder="e.g. Paused goblet squat" />
      <Label>Primary muscle</Label><View style={u.wrap}>{Object.entries(MUSCLE_LABELS).map(([id, label]) => <Chip key={id} label={label} selected={id === muscle} onPress={() => setMuscle(id as MuscleGroup)} />)}</View>
      <Label>Equipment</Label><View style={u.wrap}>{EQUIPMENT.map(value => <Chip key={value} label={value} selected={value === equipment} onPress={() => setEquipment(value)} />)}</View>
      <Label>How you log it</Label><View style={u.wrap}>{([['weighted', 'Weight + reps'], ['bodyweight', 'Reps'], ['timed', 'Duration'], ['cardio', 'Time + distance']] as const).map(([id, label]) => <Chip key={id} label={label} selected={id === kind} onPress={() => setKind(id)} />)}</View>
      <Field label="Technique notes (optional)" value={instructions} onChangeText={setInstructions} maxLength={1000} multiline placeholder="Your setup, cues, or equipment details" />
      {error ? <Body style={{ color: t.danger }}>{error}</Body> : null}
      <Button label={busy ? 'Saving…' : 'Create exercise'} onPress={() => void save()} disabled={busy} icon={<Check size={18} color={t.onAccent} />} />
    </ScrollView></SafeAreaView>
  </Modal>;
}
