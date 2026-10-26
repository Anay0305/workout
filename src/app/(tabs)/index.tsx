import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ArrowRight, ArrowUpRight, BookOpen, Check, ChevronRight, Play, Plus } from 'lucide-react-native';
import { useAppTheme } from '../../ThemeProvider';
import { useTraining } from '../../data/store';
import type { Routine } from '../../data/types';
import { durationSeconds, formatDate, formatDuration, localDate, sessionVolume } from '../../data/workout';
import { Body, Button, Card, Heading, IconButton, Metric, Screen, Title, u } from '../../components/ui';
import { WeeklyDial } from '../../components/WeeklyDial';
import { MuscleMap } from '../../components/charts/MuscleMap';
import { detailedMuscleWorkload, MUSCLES } from '../../data/muscle-detail';

const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function TrainScreen() {
  const { theme: t } = useAppTheme();
  const { state, startWorkout } = useTraining();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const now = new Date();
  const today = localDate();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (now.getDay() + 6) % 7);
  const week = Array.from({ length: 7 }, (_, i) => { const day = new Date(monday); day.setDate(monday.getDate() + i); return localDate(day.getTime()); });
  const sessions = [...state.sessions].sort((a, b) => b.startedAt - a.startedAt);
  const completedDays = new Set(sessions.filter(session => week.includes(localDate(session.startedAt))).map(session => localDate(session.startedAt)));
  const weekStart = week[0], weekEnd = week[6];
  const muscleWork = useMemo(() => detailedMuscleWorkload(state.sessions.filter(session => { const date = localDate(session.startedAt); return date >= weekStart && date <= weekEnd; })), [state.sessions, weekStart, weekEnd]);
  const trainedMuscles = muscleWork.filter(muscle => muscle.directSets + muscle.assistingSets > 0).length;
  const planned = state.routines.find(routine => routine.weekdays.includes(now.getDay()));
  const goal = Math.max(1, state.profile.daysPerWeek);
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';

  async function startSession(routine?: Routine) {
    if (busy) return;
    setBusy(true); setError('');
    try { await startWorkout(routine); router.push('/workout'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not start the workout. Try again.'); }
    finally { setBusy(false); }
  }

  return <Screen>
    <Heading eyebrow={new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(now)} title="Today" subtitle={`${greeting}${state.profile.name ? `, ${state.profile.name}` : ''}.`} right={<IconButton label="Browse exercise library" onPress={() => router.push('/library')}><BookOpen size={22} color={t.accent} /></IconButton>} />

    <Card style={{ padding: 22, gap: 19, borderRadius: 25, borderColor: '#152944', backgroundColor: '#152944', overflow: 'hidden' }}>
      <View style={{ position: 'absolute', width: 260, height: 260, borderRadius: 130, borderWidth: 1, borderColor: '#FFFFFF12', right: -100, top: -95 }} />
      <View style={[u.row, { alignItems: 'flex-start', gap: 8 }]}>
        <View style={{ flex: 1, gap: 8, paddingTop: 5 }}>
          <Text style={{ color: '#9BC9FA', fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>{state.active ? 'IN PROGRESS' : planned ? 'TODAY’S PLAN' : 'YOUR NEXT SESSION'}</Text>
          <Text style={{ color: '#FFFFFF', fontSize: 29, lineHeight: 34, fontWeight: '700', letterSpacing: -0.75 }}>{state.active?.title ?? planned?.name ?? 'Start a workout'}</Text>
          <Text style={{ color: '#B9C5D5', fontSize: 13, lineHeight: 19 }}>{state.active ? `${state.active.exercises.length} exercises · ${formatDuration(durationSeconds(state.active))}${state.active.pausedAt ? ' · Paused' : ''}` : planned ? `${planned.exercises.length} exercises ready to go` : 'Your training starts here.'}</Text>
        </View>
        <WeeklyDial value={completedDays.size} goal={goal} dark />
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={state.active ? 'Resume workout' : planned ? 'Start workout' : 'Start empty workout'} disabled={busy} onPress={() => state.active ? router.push('/workout') : void startSession(planned)} style={({ pressed }) => ({ minHeight: 53, borderRadius: 14, paddingHorizontal: 16, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 11, opacity: busy ? 0.5 : pressed ? 0.75 : 1 })}><View style={{ width: 29, height: 29, borderRadius: 9, backgroundColor: '#EAF4FF', alignItems: 'center', justifyContent: 'center' }}><Play size={15} color="#0875E8" fill="#0875E8" /></View><Text style={{ flex: 1, color: '#182438', fontSize: 16, fontWeight: '700' }}>{state.active ? 'Resume workout' : busy ? 'Starting…' : 'Start workout'}</Text><ArrowRight size={19} color="#182438" /></Pressable>
      {!state.active && planned && <Pressable accessibilityRole="button" disabled={busy} onPress={() => void startSession()} style={{ minHeight: 34, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#B9C5D5', fontSize: 13, fontWeight: '500' }}>Start an empty workout</Text></Pressable>}
    </Card>
    {!!error && <Text accessibilityRole="alert" style={{ color: '#D92D20' }}>{error}</Text>}

    <View style={{ gap: 10 }}>
      <View style={[u.row, { justifyContent: 'space-between' }]}><Title>This week</Title><Text style={{ color: t.accent, fontSize: 15, fontWeight: '600' }}>{completedDays.size} of {goal} days</Text></View>
      <Card style={{ gap: 17 }}>
        <View style={{ height: 5, borderRadius: 3, backgroundColor: t.raised }}><View style={{ width: `${Math.min(100, completedDays.size / goal * 100)}%`, height: 5, borderRadius: 3, backgroundColor: t.accent }} /></View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>{week.map((date, index) => <View key={date} style={{ alignItems: 'center', gap: 7, flex: 1 }}><Text style={{ color: t.muted, fontSize: 11, fontWeight: '500' }}>{dayLabels[index]}</Text><View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: completedDays.has(date) ? t.accent : date === today ? t.raised : 'transparent', alignItems: 'center', justifyContent: 'center' }}>{completedDays.has(date) ? <Check size={17} color={t.onAccent} strokeWidth={2.5} /> : <Text style={{ color: date === today ? t.text : t.muted, fontSize: 12, fontWeight: date === today ? '700' : '400' }}>{date.slice(-2)}</Text>}</View></View>)}</View>
      </Card>
    </View>

    <Pressable accessibilityRole="button" accessibilityLabel="Open training muscle map" onPress={() => router.push('/progress?section=Muscles')} style={({ pressed }) => ({ backgroundColor: '#17251F', borderRadius: 24, padding: 18, gap: 14, opacity: pressed ? 0.8 : 1 })}>
      <View style={[u.row, { alignItems: 'flex-start' }]}><View style={{ flex: 1, gap: 10 }}><Text style={{ color: '#B7C8AD', fontSize: 10, letterSpacing: 1.4, fontWeight: '800' }}>TRAINING THIS WEEK</Text><View><Text style={{ color: '#F4F5E9', fontSize: 29, fontWeight: '800' }}>{trainedMuscles} <Text style={{ color: '#B7C8AD', fontSize: 13 }}>/ {MUSCLES.length}</Text></Text><Text style={{ color: '#B7C8AD', fontSize: 12 }}>muscle groups</Text></View><Text style={{ color: '#DEE5D7', fontSize: 12 }}>{sessions.filter(session => week.includes(localDate(session.startedAt))).length} sessions logged</Text></View><View style={{ width: 130, height: 160 }} pointerEvents="none"><MuscleMap muscles={muscleWork} selected={null} onSelect={() => {}} compact compactHeight={160} /></View></View>
      <View style={{ flexDirection: 'row', gap: 9 }}>{(['Push', 'Pull', 'Legs', 'Core'] as const).map(region => { const groups = MUSCLES.filter(muscle => muscle.region === region); const count = groups.filter(muscle => muscleWork.some(work => work.id === muscle.id && work.directSets + work.assistingSets > 0)).length; return <View key={region} style={{ flex: 1, gap: 5 }}><View style={{ height: 4, backgroundColor: '#485342', borderRadius: 2 }}><View style={{ width: `${count / groups.length * 100}%`, height: 4, borderRadius: 2, backgroundColor: '#8CCA9D' }} /></View><Text style={{ color: '#D3DCCB', fontSize: 10 }}>{region} <Text style={{ color: '#9DB18F' }}>{count}/{groups.length}</Text></Text></View>; })}</View>
      <View style={[u.row, { borderTopWidth: 1, borderTopColor: '#43503E', paddingTop: 11, justifyContent: 'space-between' }]}><Text style={{ color: '#DCE7B6', fontSize: 13, fontWeight: '700' }}>Explore your body map</Text><ArrowUpRight size={18} color="#DCE7B6" /></View>
    </Pressable>

    <View style={{ gap: 10 }}>
      <View style={[u.row, { justifyContent: 'space-between' }]}><Title>Routines</Title><Pressable accessibilityRole="button" accessibilityLabel="Create routine" onPress={() => router.push('/routine/new')} style={[u.row, { minHeight: 44, gap: 5 }]}><Plus size={17} color={t.accent} /><Text style={{ color: t.accent, fontSize: 15, fontWeight: '600' }}>New</Text></Pressable></View>
      {state.routines.length ? <Card style={{ paddingVertical: 3, gap: 0 }}>{state.routines.map((routine, index) => <View key={routine.id} style={{ borderBottomWidth: index === state.routines.length - 1 ? 0 : 0.5, borderBottomColor: t.line, flexDirection: 'row', alignItems: 'center' }}><Pressable accessibilityRole="button" accessibilityLabel={`Edit ${routine.name}`} onPress={() => router.push({ pathname: '/routine/[id]', params: { id: routine.id } })} style={{ flex: 1, minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12 }}><View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: t.id === 'dark' ? '#213A59' : '#EAF4FF', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: t.accent, fontSize: 12, fontWeight: '700' }}>{String(index + 1).padStart(2, '0')}</Text></View><View style={{ flex: 1, gap: 4 }}><Text style={{ color: t.text, fontSize: 16, fontWeight: '600' }}>{routine.name}</Text><Text style={{ color: t.muted, fontSize: 13 }}>{routine.exercises.length} exercises · {routine.exercises.reduce((sum, exercise) => sum + exercise.sets, 0)} sets</Text></View><ChevronRight size={17} color={t.muted} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Start ${routine.name}`} disabled={busy} onPress={() => void startSession(routine)} style={{ width: 42, minHeight: 48, alignItems: 'flex-end', justifyContent: 'center' }}><Play size={18} color={t.accent} fill={t.accent} /></Pressable></View>)}</Card> : <Card><Body muted>Build a routine for workouts you repeat.</Body><Button label="Create routine" variant="secondary" onPress={() => router.push('/routine/new')} /></Card>}
    </View>

    {sessions[0] && <View style={{ gap: 10 }}><Title>Last workout</Title><Card><Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/session/[id]', params: { id: sessions[0].id } })} style={u.row}><View style={{ flex: 1, gap: 4 }}><Text style={{ color: t.text, fontSize: 16, fontWeight: '600' }}>{sessions[0].title}</Text><Text style={{ color: t.muted, fontSize: 13 }}>{formatDate(sessions[0].startedAt)}</Text></View><ChevronRight size={18} color={t.muted} /></Pressable><View style={{ height: 0.5, backgroundColor: t.line }} /><View style={u.row}><Metric label="Duration" value={formatDuration(durationSeconds(sessions[0]))} /><Metric label="Volume" value={`${Math.round(sessionVolume(sessions[0])).toLocaleString()} kg`} /></View></Card></View>}
  </Screen>;
}
