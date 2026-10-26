import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowDownRight, ArrowUpRight, BookOpen, CalendarDays, Dumbbell, Heart, Trophy } from 'lucide-react-native';
import { useAppTheme } from '../../ThemeProvider';
import { useTraining } from '../../data/store';
import { EXERCISES, MUSCLE_LABELS } from '../../data/catalog';
import { countable, exerciseHistory, exerciseRecords, formatNumber } from '../../data/analytics';
import { formatDate } from '../../data/workout';
import { Body, Button, Card, Chip, Empty, Heading, IconButton, Label, Metric, RowLink, Screen, Title, u } from '../../components/ui';
import { LineChart } from '../../components/charts/Charts';
import { DetailedMusclePanel } from '../../components/charts/DetailedMusclePanel';
import { detailedMuscleWorkload, type MuscleId } from '../../data/muscle-detail';
import type { ExerciseKind, WorkoutSet } from '../../data/types';

type PlotMetric = 'weight' | 'e1rm' | 'volume' | 'reps' | 'seconds' | 'distance';
const METRIC_LABELS: Record<PlotMetric, string> = { weight: 'Heaviest', e1rm: 'Est. 1RM', volume: 'Volume', reps: 'Reps', seconds: 'Time', distance: 'Distance' };
const metricUnit: Record<PlotMetric, string> = { weight: 'kg', e1rm: 'kg', volume: 'kg', reps: 'reps', seconds: 'seconds', distance: 'km' };
export default function ExerciseProgressScreen() {
  const params = useLocalSearchParams<{ id: string }>(), id = typeof params.id === 'string' ? params.id : '';
  const { theme: t } = useAppTheme(), { state, update } = useTraining();
  const [chosenMetric, setChosenMetric] = useState<PlotMetric | null>(null), [section, setSection] = useState<'History' | 'Technique' | 'Muscles'>('History');
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleId | null>(null);
  const libraryExercise = [...EXERCISES, ...state.customExercises].find(exercise => exercise.id === id);
  const history = useMemo(() => exerciseHistory(state.sessions, id), [state.sessions, id]);
  const record = useMemo(() => exerciseRecords(state.sessions, id), [state.sessions, id]);
  const snapshot = history[history.length - 1]?.entries[0];
  const exercise = libraryExercise ?? snapshot;
  if (!exercise) return <Screen><Heading back title="Exercise unavailable." subtitle="It may have been removed from your library." /><Button label="Browse exercises" onPress={() => router.replace('/library')} /></Screen>;
  const kind = exercise.kind;
  const options: PlotMetric[] = kind === 'weighted' ? ['weight', 'e1rm', 'volume', 'reps'] : kind === 'bodyweight' ? ['reps'] : kind === 'timed' ? ['seconds'] : ['distance', 'seconds'];
  const metric = chosenMetric && options.includes(chosenMetric) ? chosenMetric : options[0];
  const points = history.filter(point => metric !== 'e1rm' || point.e1rm > 0).map(point => ({ key: point.sessionId, label: new Date(point.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), value: point[metric] }));
  const first = points[0]?.value ?? 0, latest = points[points.length - 1]?.value ?? 0, change = latest - first;
  const favorite = state.favoriteExerciseIds.includes(id);
  const bestAtLoad = new Map<number, { reps: number; at: number }>();
  if (kind === 'weighted') for (const point of history) for (const entry of point.entries) for (const set of entry.sets) if (countable(set, kind)) { const weight = Number(set.weight), previous = bestAtLoad.get(weight); if (!previous || Number(set.reps) > previous.reps) bestAtLoad.set(weight, { reps: Number(set.reps), at: point.at }); }
  const exerciseSessions = state.sessions.map(session => ({ ...session, exercises: session.exercises.filter(entry => entry.exerciseId === id) }));
  const work = detailedMuscleWorkload(exerciseSessions);
  return <Screen>
    <Heading back eyebrow={`${exercise.equipment} / ${MUSCLE_LABELS[exercise.muscle]}`} title={exercise.name} right={libraryExercise ? <IconButton label={favorite ? 'Remove exercise from favorites' : 'Favorite exercise'} onPress={() => update(draft => { draft.favoriteExerciseIds = favorite ? draft.favoriteExerciseIds.filter(item => item !== id) : [...draft.favoriteExerciseIds, id]; })}><Heart size={21} color={favorite ? t.accent : t.muted} fill={favorite ? t.accent : 'none'} /></IconButton> : undefined} />
    <Card><View style={u.row}><Trophy size={20} color={t.accent} /><Title>Your best work</Title></View>{record ? <View style={u.row}><Metric accent label={kind === 'weighted' ? 'Heaviest set' : kind === 'bodyweight' ? 'Most reps' : kind === 'timed' ? 'Longest hold' : 'Longest interval'} value={kind === 'weighted' ? `${formatNumber(record.weight)} kg` : kind === 'bodyweight' ? record.reps : kind === 'timed' ? `${formatNumber(record.seconds)} s` : `${formatNumber(record.distance)} km`} /><Metric label={kind === 'weighted' ? 'Estimated 1RM' : 'Workouts'} value={kind === 'weighted' ? record.e1rm ? `${formatNumber(record.e1rm)} kg` : '—' : record.sessionCount} /></View> : <Body muted>Complete a working set to establish your first benchmark.</Body>}</Card>
    <Card><View style={[u.row, { justifyContent: 'space-between' }]}><Title>Exercise trend</Title><Text style={{ color: t.muted, fontSize: 11 }}>{history.length} workouts</Text></View><View style={u.wrap}>{options.map(value => <Chip key={value} label={METRIC_LABELS[value]} selected={metric === value} onPress={() => setChosenMetric(value)} />)}</View><LineChart points={points} unit={metricUnit[metric]} label={metric === 'volume' ? 'Total per workout' : metric === 'seconds' ? 'Longest completed interval' : metric === 'distance' ? 'Longest completed interval' : metric === 'reps' ? 'Most reps in one working set' : 'Best working set per workout'} />
      {points.length > 1 && <View style={u.row}>{change < 0 ? <ArrowDownRight color={t.muted} size={16} /> : <ArrowUpRight color={t.accent} size={16} />}<Body muted style={{ fontSize: 12 }}>{change > 0 ? '+' : ''}{formatNumber(change)} {metricUnit[metric]} from your first logged workout</Body></View>}
      {metric === 'e1rm' && <Body muted style={{ fontSize: 11 }}>Epley estimate from weighted sets of 1–12 reps. Higher-rep sets stay in your history but are excluded from this estimate.</Body>}
      {metric === 'reps' && kind === 'weighted' && <Body muted style={{ fontSize: 11 }}>This chart compares reps at any load. Use the load-specific records below for an equal-weight comparison.</Body>}
      {metric === 'volume' && <Body muted style={{ fontSize: 11 }}>External load × reps, summed across completed working sets. Warm-ups are excluded.</Body>}
    </Card>
    <View style={u.wrap}>{(['History', 'Technique', 'Muscles'] as const).map(value => <Chip key={value} label={value} selected={section === value} onPress={() => setSection(value)} />)}</View>
    {section === 'History' && <>
      {kind === 'weighted' && bestAtLoad.size > 0 && <Card><Title>Rep records by load</Title><Body muted style={{ fontSize: 12 }}>Your most reps at each weight.</Body>{[...bestAtLoad.entries()].sort((a, b) => b[0] - a[0]).slice(0, 10).map(([weight, result]) => <View key={weight} style={[u.row, { paddingVertical: 7, justifyContent: 'space-between' }]}><Text style={{ color: t.text, fontSize: 15, fontWeight: '600' }}>{formatNumber(weight)} kg × {result.reps}</Text><Text style={{ color: t.muted, fontSize: 11 }}>{formatDate(result.at)}</Text></View>)}</Card>}
      {!history.length && <Empty icon={<Dumbbell size={30} color={t.accent} />} title="Your story starts with a set." message="Log this exercise in a workout to see your sets, notes and progress here." action={<Button label="Go to training" onPress={() => router.push('/')} />} />}
      {[...history].reverse().map(point => <Card key={point.sessionId}><RowLink title={formatDate(point.at)} subtitle={`${point.sets} working sets / intervals`} icon={<CalendarDays size={20} color={t.accent} />} onPress={() => router.push(`/session/${point.sessionId}`)} />{point.entries.map(entry => <View key={entry.id} style={{ gap: 8 }}>{entry.sets.filter(set => set.done).map((set, index) => <View key={set.id} style={u.row}><View style={{ width: 30, height: 28, borderRadius: 7, backgroundColor: t.raised, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: set.type === 'warmup' ? t.muted : t.accent, fontSize: 11, fontWeight: '600' }}>{set.type === 'warmup' ? 'W' : index + 1}</Text></View><Text style={{ color: set.type === 'warmup' ? t.muted : t.text, fontSize: 14, flex: 1 }}>{setDescription(set, entry.kind)}</Text>{!!set.rpe && <Text style={{ color: t.muted, fontSize: 10 }}>RPE {set.rpe}</Text>}{set.type !== 'normal' && <Text style={{ color: t.muted, fontSize: 10 }}>{set.type}</Text>}</View>)}{!!entry.notes && <View style={{ backgroundColor: t.raised, padding: 12, borderRadius: 10, marginTop: 4 }}><Body muted style={{ fontSize: 12 }}>{entry.notes}</Body></View>}</View>)}</Card>)}
    </>}
    {section === 'Technique' && <>
      <Card><View style={u.row}><BookOpen size={20} color={t.accent} /><Title>Movement notes</Title></View><Body>{libraryExercise?.instructions || 'This exercise is preserved in your workout history. Add instructions to a custom exercise in your library.'}</Body></Card>
      <Card><Label>PRIMARY MUSCLE</Label><Title>{MUSCLE_LABELS[exercise.muscle]}</Title><Label>ASSISTING MUSCLES</Label><Body muted>{exercise.secondaryMuscles.length ? exercise.secondaryMuscles.map(muscle => MUSCLE_LABELS[muscle]).join(' · ') : 'No secondary groups assigned'}</Body><Label>HOW IT IS TRACKED</Label><Body muted>{kind === 'weighted' ? 'External load in kilograms and reps. Follow the movement notes for combined vs single-side dumbbell load.' : kind === 'bodyweight' ? 'Repetitions. Bodyweight is not added to lifting volume.' : kind === 'timed' ? 'Time held, in seconds.' : 'Interval duration in seconds and distance in kilometres.'}</Body></Card>
    </>}
    {section === 'Muscles' && <><Body muted>All-time working sets for this movement.</Body><DetailedMusclePanel muscles={work} selected={selectedMuscle} onSelect={setSelectedMuscle} period="ALL TIME" /><Body muted style={{ fontSize: 11 }}>Muscle involvement is approximate. This shows recorded sets, not recovery or growth.</Body></>}
  </Screen>;
}
function setDescription(set: WorkoutSet, kind: ExerciseKind) { return kind === 'weighted' ? `${formatNumber(Number(set.weight))} kg × ${set.reps} reps` : kind === 'bodyweight' ? `${set.reps} reps` : kind === 'timed' ? `${set.seconds} seconds` : `${set.distance} km · ${Math.floor(Number(set.seconds) / 60)}m ${Number(set.seconds) % 60}s`; }
