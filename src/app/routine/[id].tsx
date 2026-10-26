import { useEffect, useRef, useState } from 'react';
import { BackHandler, Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowDown, ArrowLeft, ArrowUp, Check, Copy, Dumbbell, Plus, Trash2, X } from 'lucide-react-native';
import { useAppTheme } from '../../ThemeProvider';
import { useTraining } from '../../data/store';
import { EXERCISES, MUSCLE_LABELS } from '../../data/catalog';
import { uid } from '../../data/workout';
import type { Exercise, Routine } from '../../data/types';
import { ExercisePicker } from '../../components/ExercisePicker';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Body, Button, Card, Chip, Empty, Field, Heading, IconButton, Label, Screen, Title, u } from '../../components/ui';

type PlanItem = { exerciseId: string; key: string; sets: string; reps: string; restSeconds: string };
export default function RoutineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state } = useTraining(); const initial = state.routines.find(routine => routine.id === id);
  if (id !== 'new' && !initial) return <Screen><Heading back title="Routine unavailable" /><Empty title="This routine was removed" message="Your completed workouts are still safe in your history." /></Screen>;
  return <RoutineEditor key={id} initial={initial} />;
}
function RoutineEditor({ initial }: { initial?: Routine }) {
  const { theme: t } = useAppTheme(); const { state, update, flush } = useTraining();
  const [routineId] = useState(() => initial?.id ?? uid());
  const duplicateId = useRef<string | null>(null);
  const [name, setName] = useState(initial?.name ?? ''); const [description, setDescription] = useState(initial?.description ?? '');
  const [items, setItems] = useState<PlanItem[]>(() => (initial?.exercises ?? []).map(item => ({ exerciseId: item.exerciseId, key: uid(), sets: String(item.sets), reps: String(item.reps), restSeconds: String(item.restSeconds) })));
  const [weekdays, setWeekdays] = useState(initial?.weekdays ?? []); const [picker, setPicker] = useState(false);
  const [confirm, setConfirm] = useState<'delete' | 'leave' | null>(null); const [dirty, setDirty] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const catalogue = [...EXERCISES, ...state.customExercises];
  function leave() { if (busy) return; if (dirty) setConfirm('leave'); else if (router.canGoBack()) router.back(); else router.replace('/'); }
  useEffect(() => { const sub = BackHandler.addEventListener('hardwareBackPress', () => { if (dirty) { setConfirm('leave'); return true; } return false; }); return () => sub.remove(); }, [dirty]);
  function add(exercise: Exercise) { setItems(old => [...old, { key: uid(), exerciseId: exercise.id, sets: '3', reps: exercise.kind === 'timed' ? '30' : '10', restSeconds: String(state.settings.restSeconds) }]); setDirty(true); }
  function change(index: number, field: 'sets' | 'reps' | 'restSeconds', value: string) { setDirty(true); setItems(old => old.map((item, i) => index === i ? { ...item, [field]: value.replace(/[^0-9]/g, '') } : item)); }
  function move(index: number, direction: number) { setDirty(true); setItems(old => { const copy = [...old]; [copy[index], copy[index + direction]] = [copy[index + direction], copy[index]]; return copy; }); }
  async function save(duplicate = false) {
    if (busy) return; setError('');
    if (!name.trim()) { setError('Give your routine a name.'); return; }
    if (!items.length) { setError('Add at least one exercise.'); return; }
    if (items.some(item => !catalogue.some(exercise => exercise.id === item.exerciseId))) { setError('Remove any unavailable exercises before saving.'); return; }
    if (items.some(item => !item.sets || Number(item.sets) < 1 || Number(item.sets) > 30 || !item.reps || Number(item.reps) < 1 || Number(item.reps) > 1000 || !item.restSeconds || Number(item.restSeconds) < 0 || Number(item.restSeconds) > 1800)) { setError('Use 1–30 sets, 1–1,000 reps or seconds, and 0–1,800 seconds of rest.'); return; }
    if (duplicate && !duplicateId.current) duplicateId.current = uid();
    const routine: Routine = { id: duplicate ? duplicateId.current! : routineId, name: duplicate ? `${name.trim()} copy` : name.trim(), description: description.trim(), weekdays: [...weekdays].sort(), exercises: items.map(item => ({ exerciseId: item.exerciseId, sets: Number(item.sets), reps: Number(item.reps), restSeconds: Number(item.restSeconds) })) };
    setBusy(true);
    try { update(draft => { const index = draft.routines.findIndex(item => item.id === routine.id); if (index >= 0) draft.routines[index] = routine; else draft.routines.push(routine); }); await flush(); setDirty(false); router.replace('/'); } catch (e) { setError(e instanceof Error ? e.message : 'Could not save. Your edits are still here.'); } finally { setBusy(false); }
  }
  async function remove() { setBusy(true); try { update(draft => { draft.routines = draft.routines.filter(item => item.id !== routineId); }); await flush(); router.replace('/'); } catch { setError('Could not delete. Please retry.'); setConfirm(null); } finally { setBusy(false); } }
  return <Screen>
    <IconButton label="Back from routine" onPress={leave}><ArrowLeft size={20} color={t.text} /></IconButton>
    <Heading eyebrow={initial ? 'YOUR TRAINING PLAN' : 'BUILD YOUR TRAINING PLAN'} title={initial ? 'Make it yours.' : 'A routine that fits.'} subtitle="Set the movements, the rhythm, and the days." />
    <Field label="Routine name" value={name} maxLength={80} placeholder="e.g. Upper body strength" onChangeText={value => { setName(value); setDirty(true); }} />
    <Field label="Description (optional)" value={description} maxLength={300} placeholder="Your focus for this session" multiline onChangeText={value => { setDescription(value); setDirty(true); }} />
    <Card><Title>Weekly schedule</Title><Body muted style={{ fontSize: 12 }}>Choose days to show this routine on your dashboard.</Body><View style={u.wrap}>{[1, 2, 3, 4, 5, 6, 0].map(day => <Chip key={day} label={['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day]} selected={weekdays.includes(day)} onPress={() => { setWeekdays(old => old.includes(day) ? old.filter(value => value !== day) : [...old, day]); setDirty(true); }} />)}</View></Card>
    <View style={[u.row, { justifyContent: 'space-between' }]}><Title>Exercise order</Title><Label>{items.length} / 30</Label></View>
    {!items.length && <Body muted>Add your first movement. You can change the order at any time.</Body>}
    {items.map((item, index) => { const exercise = catalogue.find(value => value.id === item.exerciseId); return <Card key={item.key}><View style={u.row}><Dumbbell size={20} color={t.accent} /><View style={{ flex: 1, gap: 5 }}><Title>{exercise?.name ?? 'Unavailable exercise'}</Title><Body muted style={{ fontSize: 11 }}>{exercise ? `${MUSCLE_LABELS[exercise.muscle]} · ${exercise.equipment}` : 'Remove this item to continue.'}</Body></View><Pressable accessibilityRole="button" accessibilityLabel={`Remove ${exercise?.name ?? 'exercise'} from routine`} onPress={() => { setItems(old => old.filter((_, i) => i !== index)); setDirty(true); }} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}><X size={18} color={t.muted} /></Pressable></View>
      <View style={[u.row, { alignItems: 'flex-start' }]}>{([['sets', 'Sets'], ['reps', exercise?.kind === 'timed' ? 'Seconds' : 'Reps'], ['restSeconds', 'Rest (s)']] as const).map(([field, label]) => <View key={field} style={{ flex: 1 }}><Field label={label} accessibilityLabel={`${label} · exercise ${index + 1}`} keyboardType="number-pad" value={item[field]} maxLength={4} onChangeText={value => change(index, field, value)} /></View>)}</View>
      <View style={[u.row, { justifyContent: 'space-between' }]}><Body muted style={{ fontSize: 11 }}>Position {index + 1}</Body><View style={u.row}><IconButton label={`Move ${exercise?.name ?? 'exercise'} up`} onPress={() => move(index, -1)} disabled={index === 0}><ArrowUp size={17} color={t.muted} /></IconButton><IconButton label={`Move ${exercise?.name ?? 'exercise'} down`} onPress={() => move(index, 1)} disabled={index === items.length - 1}><ArrowDown size={17} color={t.muted} /></IconButton></View></View>
    </Card>; })}
    <Button label="Add exercise" variant="secondary" onPress={() => setPicker(true)} disabled={items.length >= 30} icon={<Plus size={18} color={t.text} />} />
    {error ? <Body style={{ color: t.danger }}>{error}</Body> : null}
    <Button label={busy ? 'Saving…' : 'Save routine'} onPress={() => void save()} disabled={busy} icon={<Check size={18} color={t.onAccent} />} />
    {initial && <><Button label="Save as a new copy" variant="secondary" onPress={() => void save(true)} disabled={busy} icon={<Copy size={17} color={t.text} />} /><Button label="Delete routine" variant="danger" onPress={() => setConfirm('delete')} disabled={busy} icon={<Trash2 size={17} color={t.danger} />} /></>}
    <ExercisePicker visible={picker} onClose={() => setPicker(false)} onSelect={add} />
    <ConfirmDialog visible={confirm !== null} title={confirm === 'delete' ? 'Delete this routine?' : 'Leave without saving?'} message={confirm === 'delete' ? 'Completed workouts will remain in your history. This only removes the routine.' : 'Your unsaved routine changes will be discarded.'} confirmLabel={confirm === 'delete' ? 'Delete routine' : 'Discard changes'} busy={busy} onCancel={() => setConfirm(null)} onConfirm={() => { if (confirm === 'delete') void remove(); else { setConfirm(null); if (router.canGoBack()) router.back(); else router.replace('/'); } }} />
  </Screen>;
}
