import { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowUpRight, Check, Copy, Play, Save, Trash2, Trophy } from 'lucide-react-native';
import { useAppTheme } from '../../ThemeProvider';
import { useTraining } from '../../data/store';
import type { Exercise, Routine, SessionExercise, WorkoutSession } from '../../data/types';
import { EXERCISES, MUSCLE_LABELS } from '../../data/catalog';
import { durationSeconds, formatDate, formatDuration, sessionVolume, uid, validateSet, workingSets } from '../../data/workout';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Body, Button, Card, Empty, Field, Heading, Label, Metric, Screen, Title, u } from '../../components/ui';

export default function SessionScreen() {
  const { id, completed } = useLocalSearchParams<{ id: string; completed?: string }>();
  const { state } = useTraining(); const session = state.sessions.find(item => item.id === id);
  if (!session) return <Screen><Heading title="Workout unavailable" back /><Empty title="This workout is no longer here" message="Check your history for your other sessions." /></Screen>;
  return <SessionDetail key={id} session={session} justFinished={completed === '1'} />;
}
function SessionDetail({ session, justFinished }: { session: WorkoutSession; justFinished: boolean }) {
  const { theme: t } = useAppTheme(); const { state, update, flush, startWorkout } = useTraining();
  const [notes, setNotes] = useState(session.notes); const [title, setTitle] = useState(session.title);
  const [draftExercises, setDraftExercises] = useState(() => session.exercises.map(exercise => ({ ...exercise, sets: exercise.sets.map(set => ({ ...set })) })));
  const [edit, setEdit] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [confirm, setConfirm] = useState(false); const [savedRoutine, setSavedRoutine] = useState<string | null>(null);
  const pendingRoutine = useRef<Routine | null>(null);
  const previous = state.sessions.filter(item => item.startedAt < session.startedAt);
  const records = session.exercises.flatMap(exercise => {
    const current = exercise.sets.filter(set => set.done && set.type !== 'warmup');
    if (!current.length) return [];
    const history = previous.flatMap(workout => workout.exercises.filter(item => item.exerciseId === exercise.exerciseId).flatMap(item => item.sets.filter(set => set.done && set.type !== 'warmup')));
    if (!history.length) return [{ name: exercise.name, detail: 'First benchmark' }];
    if (exercise.kind === 'weighted') {
      const best = Math.max(...current.map(set => Number(set.weight) || 0)); const prior = Math.max(...history.map(set => Number(set.weight) || 0));
      if (best > prior) return [{ name: exercise.name, detail: `Heaviest set · ${best} kg` }];
      const repRecord = current.some(set => Number(set.reps) > Math.max(0, ...history.filter(old => Number(old.weight) === Number(set.weight)).map(old => Number(old.reps))));
      if (repRecord) return [{ name: exercise.name, detail: 'More reps at this weight' }];
    } else if (exercise.kind === 'bodyweight') {
      const best = Math.max(...current.map(set => Number(set.reps) || 0));
      if (best > Math.max(...history.map(set => Number(set.reps) || 0))) return [{ name: exercise.name, detail: `Most reps · ${best}` }];
    } else if (exercise.kind === 'timed') {
      const best = Math.max(...current.map(set => Number(set.seconds) || 0));
      if (best > Math.max(...history.map(set => Number(set.seconds) || 0))) return [{ name: exercise.name, detail: `Longest hold · ${formatDuration(best)}` }];
    } else {
      const best = Math.max(...current.map(set => Number(set.distance) || 0));
      if (best > Math.max(...history.map(set => Number(set.distance) || 0))) return [{ name: exercise.name, detail: `Longest interval · ${best} km` }];
    }
    return [];
  });
  function routineFromSession(): Routine { return { id: uid(), name: session.title, description: `From your workout on ${formatDate(session.startedAt)}.`, weekdays: [], exercises: session.exercises.map(exercise => ({ exerciseId: exercise.exerciseId, sets: Math.min(30, Math.max(1, exercise.sets.filter(set => set.type !== 'warmup').length)), reps: Math.min(1000, Number(exercise.kind === 'timed' ? exercise.sets.find(set => set.type !== 'warmup')?.seconds : exercise.sets.find(set => set.type !== 'warmup')?.reps) || 10), restSeconds: exercise.restSeconds })) }; }
  function restoreMissingExercises() {
    const ids = new Set([...EXERCISES, ...state.customExercises].map(exercise => exercise.id));
    const missing = session.exercises.filter(exercise => !ids.has(exercise.exerciseId));
    if (missing.length) update(draft => { missing.forEach(exercise => { if (!draft.customExercises.some(item => item.id === exercise.exerciseId)) { const restored: Exercise = { id: exercise.exerciseId, name: exercise.name, muscle: exercise.muscle, secondaryMuscles: exercise.secondaryMuscles, equipment: exercise.equipment, kind: exercise.kind, custom: true, instructions: '' }; draft.customExercises.push(restored); } }); });
  }
  async function repeat() { setBusy(true); setError(''); try { restoreMissingExercises(); await startWorkout(routineFromSession()); router.push('/workout'); } catch (e) { setError(e instanceof Error ? e.message : 'Could not start the workout.'); } finally { setBusy(false); } }
  async function saveRoutine() { setBusy(true); setError(''); try { restoreMissingExercises(); const routine = pendingRoutine.current ?? routineFromSession(); pendingRoutine.current = routine; update(draft => { if (!draft.routines.some(item => item.id === routine.id)) draft.routines.push(routine); }); await flush(); setSavedRoutine(routine.id); } catch { setError('Could not save the routine. Please retry.'); } finally { setBusy(false); } }
  async function saveNotes() { const invalid = draftExercises.flatMap(exercise => exercise.sets.map(set => validateSet(set, exercise.kind))).find(Boolean); if (invalid) { setError(invalid); return; } if (!title.trim()) { setError('Give your workout a title.'); return; } setBusy(true); setError(''); try { update(draft => { const workout = draft.sessions.find(item => item.id === session.id); if (workout) { workout.title = title.trim(); workout.notes = notes.trim(); workout.exercises = draftExercises.map(exercise => ({ ...exercise, sets: exercise.sets.map(set => ({ ...set })) })); } }); await flush(); setEdit(false); } catch { setError('Could not save your changes.'); } finally { setBusy(false); } }
  async function remove() { setBusy(true); setError(''); try { update(draft => { draft.sessions = draft.sessions.filter(item => item.id !== session.id); }); await flush(); router.replace('/history'); } catch { setError('Could not delete this session.'); setConfirm(false); } finally { setBusy(false); } }
  return <Screen>
    <Heading back eyebrow={justFinished ? 'SESSION COMPLETE' : formatDate(session.startedAt)} title={justFinished ? 'Work, recorded.' : session.title} subtitle={justFinished ? `${session.title} · ${formatDate(session.startedAt)}` : 'A record of the work you put in.'} />
    <Card><View style={u.row}><Metric label="Duration" value={formatDuration(durationSeconds(session))} accent /><Metric label="Volume" value={`${Math.round(sessionVolume(session)).toLocaleString()} kg`} /></View><View style={{ height: 1, backgroundColor: t.line }} /><View style={u.row}><Metric label="Exercises" value={session.exercises.length} /><Metric label="Working sets" value={workingSets(session).length} /></View>{session.feeling && <Body muted style={{ fontSize: 12 }}>Session feeling: {['', 'Tough', 'Low energy', 'Steady', 'Strong', 'Excellent'][session.feeling]} · {session.feeling}/5</Body>}</Card>
    {records.length > 0 && <Card style={{ borderColor: t.accent + '60' }}><View style={u.row}><Trophy size={20} color={t.accent} /><Title>{records.length === 1 ? 'A milestone' : `${records.length} milestones`}</Title></View>{records.map((record, index) => <View key={`${record.name}-${index}`} style={{ gap: 5 }}><Text style={{ color: t.text, fontSize: 14, fontWeight: '600' }}>{record.name}</Text><Text style={{ color: t.accent, fontSize: 12 }}>{record.detail}</Text></View>)}<Body muted style={{ fontSize: 11 }}>Compared with earlier logged working sets. Warm-ups are excluded.</Body></Card>}
    <View style={[u.row, { justifyContent: 'space-between' }]}><Title>Your exercises</Title><Pressable accessibilityRole="button" onPress={() => { setTitle(session.title); setNotes(session.notes); setDraftExercises(session.exercises.map(exercise => ({ ...exercise, sets: exercise.sets.map(set => ({ ...set })) }))); setEdit(!edit); setError(''); }} style={{ minHeight: 40, justifyContent: 'center' }}><Text style={{ color: t.accent, fontSize: 12 }}>{edit ? 'Cancel editing' : 'Edit workout'}</Text></Pressable></View>
    {(edit ? draftExercises : session.exercises).map((exercise, index) => <ExerciseSummary key={exercise.id} exercise={exercise} index={index} editing={edit} onChange={(setId, field, value) => setDraftExercises(old => old.map(item => item.id === exercise.id ? { ...item, sets: item.sets.map(set => set.id === setId ? { ...set, [field]: value } : set) } : item))} />)}
    <Card><View style={[u.row, { justifyContent: 'space-between' }]}><Title>Session notes</Title><Pressable accessibilityRole="button" onPress={() => { setTitle(session.title); setNotes(session.notes); setDraftExercises(session.exercises.map(exercise => ({ ...exercise, sets: exercise.sets.map(set => ({ ...set })) }))); setEdit(!edit); setError(''); }} style={{ minHeight: 40, justifyContent: 'center' }}><Text style={{ color: t.accent, fontSize: 12 }}>{edit ? 'Cancel editing' : 'Edit details'}</Text></Pressable></View>{edit ? <><Field label="Workout title" value={title} onChangeText={setTitle} maxLength={100} /><Field label="Workout notes" value={notes} onChangeText={setNotes} maxLength={2000} multiline style={{ minHeight: 100, textAlignVertical: 'top' }} /><Button label={busy ? 'Saving…' : 'Save details'} onPress={() => void saveNotes()} disabled={busy} icon={<Save size={17} color={t.onAccent} />} /></> : <Body muted>{session.notes || 'No notes for this session.'}</Body>}</Card>
    {error ? <Body style={{ color: t.danger }}>{error}</Body> : null}
    <Button label={state.active ? 'Resume active workout' : 'Repeat workout'} onPress={() => void repeat()} disabled={busy} icon={<Play size={17} color={t.onAccent} />} />
    {savedRoutine ? <Button label="View saved routine" variant="secondary" onPress={() => router.push({ pathname: '/routine/[id]', params: { id: savedRoutine } })} icon={<Check size={17} color={t.text} />} /> : <Button label="Save as routine" variant="secondary" onPress={() => void saveRoutine()} disabled={busy} icon={<Copy size={17} color={t.text} />} />}
    <Button label="Delete workout" variant="danger" onPress={() => setConfirm(true)} disabled={busy} icon={<Trash2 size={17} color={t.danger} />} />
    <ConfirmDialog visible={confirm} title="Delete this workout?" message="This removes the session from your history and recalculates your records and progress. Your routines stay unchanged." confirmLabel="Delete workout" onCancel={() => setConfirm(false)} onConfirm={() => void remove()} busy={busy} />
  </Screen>;
}
function ExerciseSummary({ exercise, index, editing, onChange }: { exercise: SessionExercise; index: number; editing: boolean; onChange: (setId: string, field: 'weight' | 'reps' | 'seconds' | 'distance' | 'rpe', value: string) => void }) {
  const { theme: t } = useAppTheme();
  return <Card><Pressable accessibilityRole="button" accessibilityLabel={`View ${exercise.name} progress`} onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: exercise.exerciseId } })} style={u.row}><View style={{ width: 34, height: 38, backgroundColor: t.raised, borderRadius: 10, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: t.accent, fontSize: 12, fontWeight: '700' }}>{String(index + 1).padStart(2, '0')}</Text></View><View style={{ flex: 1, gap: 5 }}><Title>{exercise.name}</Title><Text style={{ color: t.muted, fontSize: 11 }}>{MUSCLE_LABELS[exercise.muscle]} · {exercise.equipment}{exercise.supersetId ? ' · Superset' : ''}</Text></View><ArrowUpRight size={17} color={t.muted} /></Pressable>
    {editing ? exercise.sets.map((set, i) => <View key={set.id} style={{ gap: 9, paddingVertical: 10 }}><Label>{set.type === 'warmup' ? 'Warm-up' : `Set ${i + 1}`}</Label><View style={[u.row, { flexWrap: 'wrap', alignItems: 'flex-start' }]}>{(exercise.kind === 'weighted' ? ['weight', 'reps', 'rpe'] : exercise.kind === 'bodyweight' ? ['reps', 'rpe'] : exercise.kind === 'timed' ? ['seconds', 'rpe'] : ['seconds', 'distance', 'rpe']).map(key => { const field = key as 'weight' | 'reps' | 'seconds' | 'distance' | 'rpe'; return <View key={field} style={{ flex: 1, minWidth: 65 }}><Field label={{ weight: 'Kg', reps: 'Reps', seconds: 'Seconds', distance: 'Km', rpe: 'RPE' }[field]} accessibilityLabel={`${exercise.name} set ${i + 1} ${field}`} value={set[field]} keyboardType={field === 'reps' || field === 'seconds' ? 'number-pad' : 'decimal-pad'} maxLength={8} onChangeText={value => onChange(set.id, field, value.replace(/[^0-9.]/g, ''))} /></View>; })}</View></View>) : exercise.sets.map((set, i) => <View key={set.id} style={[u.row, { justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 9, backgroundColor: set.type === 'warmup' ? t.raised : t.accent + '0B' }]}><Text style={{ color: set.type === 'warmup' ? t.muted : t.accent, fontSize: 12, width: 23 }}>{set.type === 'warmup' ? 'W' : i + 1}</Text><Text style={{ color: t.text, fontSize: 14, fontWeight: '600', flex: 1 }}>{exercise.kind === 'weighted' ? `${set.weight} kg × ${set.reps}` : exercise.kind === 'bodyweight' ? `${set.reps} reps` : exercise.kind === 'timed' ? formatDuration(Number(set.seconds)) : `${set.distance} km · ${formatDuration(Number(set.seconds))}`}</Text>{set.rpe ? <Text style={{ color: t.muted, fontSize: 10 }}>RPE {set.rpe}</Text> : null}{set.type === 'drop' || set.type === 'failure' ? <Text style={{ color: t.muted, fontSize: 10 }}>{set.type}</Text> : null}<Check size={15} color={t.accent} /></View>)}
    {exercise.notes ? <Body muted style={{ fontSize: 12 }}>{exercise.notes}</Body> : null}
  </Card>;
}
