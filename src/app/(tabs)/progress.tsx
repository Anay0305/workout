import { useMemo, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Scale, Trash2, Trophy, X } from 'lucide-react-native';
import { useAppTheme } from '../../ThemeProvider';
import { useTraining } from '../../data/store';
import { Body, Button, Card, Chip, Empty, Field, Heading, IconButton, Label, Metric, RowLink, Screen, Title, u } from '../../components/ui';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Heatmap, LineChart } from '../../components/charts/Charts';
import { WeeklyDial } from '../../components/WeeklyDial';
import { DetailedMusclePanel } from '../../components/charts/DetailedMusclePanel';
import { calendarDays, completedEfforts, consistencyStats, dateKey, formatNumber, personalRecords, shiftDay, weekKey, weeklyActivity } from '../../data/analytics';
import { formatDate, uid } from '../../data/workout';
import { detailedMuscleWorkload, MUSCLES, sessionTouchesMuscle, type MuscleId } from '../../data/muscle-detail';
import type { Measurement } from '../../data/types';

type Section = 'Overview' | 'Muscles' | 'Records' | 'Body';
export default function ProgressScreen() {
  const { theme: t } = useAppTheme(), { state } = useTraining();
  const params = useLocalSearchParams<{ section?: string; measurement?: string }>();
  const section: Section = ['Overview', 'Muscles', 'Records', 'Body'].includes(params.section ?? '') ? params.section as Section : 'Overview';
  const setSection = (value: Section) => router.setParams({ section: value });
  const [range, setRange] = useState(12);
  const [chartMetric, setChartMetric] = useState<'volume' | 'sessions' | 'sets'>('sessions');
  const [selectedDay, setSelectedDay] = useState<string | null>(dateKey());
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleId | null>(null);
  const [recordSearch, setRecordSearch] = useState('');
  const [measurementOpen, setMeasurementOpen] = useState(false);
  const [bodyMetric, setBodyMetric] = useState<'weightKg' | 'waistCm' | 'bodyFatPercent' | 'leanMassKg'>('weightKg');
  const stats = useMemo(() => consistencyStats(state.sessions, state.profile.daysPerWeek), [state.sessions, state.profile.daysPerWeek]);
  const weeks = useMemo(() => weeklyActivity(state.sessions, range), [state.sessions, range]);
  const days = useMemo(() => calendarDays(state.sessions, 12), [state.sessions]);
  const day = days.find(item => item.key === selectedDay);
  const start = shiftDay(weekKey(), weekOffset * 7), end = shiftDay(start, 6);
  const weekSessions = state.sessions.filter(session => dateKey(session.startedAt) >= start && dateKey(session.startedAt) <= end);
  const work = detailedMuscleWorkload(weekSessions);
  const matchingWeekSessions = weekSessions.filter(session => !selectedMuscle || sessionTouchesMuscle(session, selectedMuscle));
  const records = useMemo(() => personalRecords(state.sessions), [state.sessions]);
  const measurements = useMemo(() => [...state.measurements].sort((a, b) => a.date.localeCompare(b.date) || (a.recordedAt ?? 0) - (b.recordedAt ?? 0)), [state.measurements]);
  const bodyPoints = measurements.filter(item => typeof item[bodyMetric] === 'number').map(item => ({ key: item.id, label: new Date(`${item.date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), value: item[bodyMetric] as number }));
  const latest = measurements[measurements.length - 1], earliest = measurements[0];
  return <Screen>
    <Heading title="Progress" />
    <View style={u.wrap}>{(['Overview', 'Muscles', 'Records', 'Body'] as Section[]).map(item => <Chip key={item} label={item} selected={section === item} onPress={() => setSection(item)} />)}</View>
    {section === 'Overview' && <>
      <Card style={{ backgroundColor: '#152944', borderColor: '#152944', borderRadius: 25, padding: 22 }}><View style={[u.row, { gap: 10 }]}><View style={{ flex: 1, gap: 8 }}><Text style={{ color: '#9BC9FA', fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>THIS WEEK</Text><Text style={{ color: '#FFFFFF', fontSize: 27, lineHeight: 32, fontWeight: '700', letterSpacing: -0.6 }}>{stats.thisWeek.days >= state.profile.daysPerWeek ? 'Goal complete' : `${Math.max(0, state.profile.daysPerWeek - stats.thisWeek.days)} days to go`}</Text><Text style={{ color: '#B9C5D5', fontSize: 13 }}>{stats.thisWeek.sessions} workouts · {Math.round(stats.thisWeek.minutes)} minutes</Text></View><WeeklyDial value={stats.thisWeek.days} goal={state.profile.daysPerWeek} dark /></View></Card>
      <Card style={{ flexDirection: 'row', gap: 12 }}><Metric label="Workouts" value={stats.totalSessions} /><Metric label="Days" value={stats.totalDays} /><Metric label="Streak" value={`${stats.goalStreak} wk`} accent /></Card>
      <Card><View style={u.row}><CalendarDays size={19} color={t.accent} /><Title>Consistency</Title></View>{stats.totalSessions ? <><Body muted>Your last 12 weeks of training.</Body><Heatmap days={days} selected={selectedDay} onSelect={setSelectedDay} />
        {day && <View style={{ borderTopWidth: 1, borderTopColor: t.line, paddingTop: 14, gap: 7 }}><Label>{formatDate(day.key)}</Label>{day.sessions.length ? day.sessions.map(session => <RowLink key={session.id} title={session.title} subtitle={`${completedEfforts(session).length} working sets / intervals`} onPress={() => router.push(`/session/${session.id}`)} />) : <Body muted>No workout logged that day.</Body>}</View>}</> : <Body muted>Finish a workout to start your training record.</Body>}
      </Card>
      {stats.totalSessions > 0 && <Card><View style={[u.row, { justifyContent: 'space-between' }]}><Title>Training trend</Title><View style={u.row}>{[4, 12].map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: range === value }} onPress={() => setRange(value)} style={{ padding: 9, borderRadius: 8, backgroundColor: range === value ? t.raised : 'transparent' }}><Text style={{ color: range === value ? t.accent : t.muted, fontSize: 11 }}>{value}W</Text></Pressable>)}</View></View>
        <View style={u.wrap}>{([['sessions', 'Workouts'], ['volume', 'Volume'], ['sets', 'Sets']] as const).map(([key, label]) => <Chip key={key} label={label} selected={chartMetric === key} onPress={() => setChartMetric(key)} />)}</View>
        <LineChart points={stats.totalSessions ? weeks.map(week => ({ key: week.key, label: week.label, value: week[chartMetric] })) : []} unit={chartMetric === 'volume' ? 'kg' : chartMetric === 'sets' ? 'sets / intervals' : 'workouts'} label="Per Monday–Sunday week" />
        {chartMetric === 'volume' && <Body muted style={{ fontSize: 11 }}>Volume is external load × reps for weighted working sets. Bodyweight, time and distance are tracked separately.</Body>}
      </Card>}
      {!stats.totalSessions && <Button label="Start your first workout" onPress={() => router.push('/')} />}
    </>}
    {section === 'Muscles' && <>
      <View style={[u.row, { justifyContent: 'space-between', borderWidth: 1, borderColor: t.line, borderRadius: 18, paddingVertical: 4 }]}><IconButton label="Previous muscle week" onPress={() => { setWeekOffset(value => Math.max(-104, value - 1)); setSelectedMuscle(null); }} disabled={weekOffset <= -104}><ChevronLeft size={20} color={t.text} /></IconButton><Pressable accessibilityRole="button" accessibilityLabel="Return to current muscle week" onPress={() => { setWeekOffset(0); setSelectedMuscle(null); }} style={{ alignItems: 'center', gap: 4 }}><Text style={{ color: t.text, fontSize: 13, fontWeight: '700' }}>{weekOffset === 0 ? 'THIS WEEK' : weekOffset === -1 ? 'LAST WEEK' : 'TRAINING WEEK'}</Text><Text style={{ color: t.muted, fontSize: 11 }}>{formatDate(start)} – {new Date(`${end}T12:00:00`).getDate()}</Text></Pressable><IconButton label="Next muscle week" onPress={() => { setWeekOffset(value => Math.min(0, value + 1)); setSelectedMuscle(null); }} disabled={weekOffset === 0}><ChevronRight size={20} color={t.text} /></IconButton></View>
      <DetailedMusclePanel muscles={work} selected={selectedMuscle} onSelect={setSelectedMuscle} period={weekOffset === 0 ? 'WEEK IN PROGRESS' : 'WEEK RECAP'} />
      <Card><Title>{selectedMuscle ? `${MUSCLES.find(muscle => muscle.id === selectedMuscle)?.name} this week` : 'This week’s sessions'}</Title>{matchingWeekSessions.map(session => <RowLink key={session.id} title={session.title} subtitle={formatDate(session.startedAt)} onPress={() => router.push(`/session/${session.id}`)} />)}{!matchingWeekSessions.length && <Body muted>No matching working sets logged for this week.</Body>}</Card>
    </>}
    {section === 'Records' && <>
      <Title>Personal records</Title>
      <Field accessibilityLabel="Search personal records" placeholder="Find an exercise" value={recordSearch} onChangeText={setRecordSearch} />
      {records.filter(record => record.name.toLowerCase().includes(recordSearch.toLowerCase())).map(record => <Pressable key={record.exerciseId} accessibilityRole="button" accessibilityLabel={`View ${record.name} records`} onPress={() => router.push(`/exercise/${record.exerciseId}`)}><Card><View style={u.row}><View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: t.accent + '14', alignItems: 'center', justifyContent: 'center' }}><Trophy size={20} color={t.accent} /></View><View style={{ flex: 1, gap: 4 }}><Text style={{ color: t.text, fontSize: 15, fontWeight: '600' }}>{record.name}</Text><Text style={{ color: t.muted, fontSize: 11 }}>{record.sessionCount} workouts · {formatDate(record.lastAt)}</Text></View><ChevronRight size={18} color={t.muted} /></View><View style={u.row}><Metric label={record.kind === 'weighted' ? 'Heaviest set' : record.kind === 'bodyweight' ? 'Most reps' : record.kind === 'timed' ? 'Longest hold' : 'Longest distance'} value={record.kind === 'weighted' ? `${formatNumber(record.weight)} kg` : record.kind === 'bodyweight' ? record.reps : record.kind === 'timed' ? `${formatNumber(record.seconds)} s` : `${formatNumber(record.distance)} km`} accent />{record.kind === 'weighted' && <Metric label="Estimated 1RM" value={record.e1rm ? `${formatNumber(record.e1rm)} kg` : '—'} />}</View></Card></Pressable>)}
      {!records.length && <Empty icon={<Trophy size={29} color={t.accent} />} title="Your first benchmark awaits." message="Finish a workout to establish personal records. Warm-ups and unfinished sets never count." action={<Button label="Open exercise library" variant="secondary" onPress={() => router.push('/library')} />} />}
      {!!records.length && !records.some(record => record.name.toLowerCase().includes(recordSearch.toLowerCase())) && <Body muted>No records match that exercise.</Body>}
      <Body muted style={{ fontSize: 11 }}>Estimated 1RM uses the Epley formula for weighted sets of 1–12 reps. It is an estimate, not a tested maximum.</Body>
    </>}
    {section === 'Body' && <>
      <View style={[u.row, { justifyContent: 'space-between' }]}><View style={{ gap: 6 }}><Title>Your body journal</Title><Body muted>Track the changes that matter to you.</Body></View><IconButton label="Add body measurement" onPress={() => setMeasurementOpen(true)}><Plus size={20} color={t.accent} /></IconButton></View>
      {latest ? <Card><View style={u.row}><Scale size={20} color={t.accent} /><Label>Latest · {formatDate(latest.date)}</Label></View><View style={u.row}><Metric label="Body weight" value={`${formatNumber(latest.weightKg)} kg`} accent /><Metric label="Since first entry" value={`${latest.weightKg - earliest.weightKg > 0 ? '+' : ''}${formatNumber(latest.weightKg - earliest.weightKg)} kg`} /></View>{state.profile.heightCm && <Body muted>BMI: {formatNumber(latest.weightKg / ((state.profile.heightCm / 100) ** 2))} · based on your saved height</Body>}{state.profile.targetWeightKg !== null && <Body muted>Target: {formatNumber(state.profile.targetWeightKg)} kg · {formatNumber(Math.abs(latest.weightKg - state.profile.targetWeightKg))} kg away</Body>}</Card> : <Empty icon={<Scale size={30} color={t.accent} />} title="A starting point, just for you." message="Log body weight and optional waist measurements. Your numbers stay on this device." action={<Button label="Add first measurement" onPress={() => setMeasurementOpen(true)} />} />}
      {measurements.length > 0 && <Card><View style={u.wrap}><Chip label="Weight" selected={bodyMetric === 'weightKg'} onPress={() => setBodyMetric('weightKg')} /><Chip label="Waist" selected={bodyMetric === 'waistCm'} onPress={() => setBodyMetric('waistCm')} /><Chip label="Body fat" selected={bodyMetric === 'bodyFatPercent'} onPress={() => setBodyMetric('bodyFatPercent')} /><Chip label="Lean mass" selected={bodyMetric === 'leanMassKg'} onPress={() => setBodyMetric('leanMassKg')} /></View><LineChart points={bodyPoints} unit={bodyMetric === 'waistCm' ? 'cm' : bodyMetric === 'bodyFatPercent' ? '%' : 'kg'} label={{weightKg:'Body weight',waistCm:'Waist measurement',bodyFatPercent:'Body fat estimate',leanMassKg:'Lean body mass'}[bodyMetric]} /></Card>}
      {measurements.length > 0 && <Card><Title>Measurement history</Title>{[...measurements].reverse().map(measurement => <MeasurementRow key={measurement.id} measurement={measurement} />)}</Card>}
      <Button label={Platform.OS === 'ios' ? 'Scale & body data' : 'Cult scale & data connections'} variant="secondary" onPress={() => router.push('/scale')} /><Body muted style={{fontSize:11}}>Compare measurements taken under similar conditions. Scale body-fat and lean-mass values are estimates reported by their source.</Body><MeasurementModal visible={measurementOpen || params.measurement === '1'} onClose={() => { setMeasurementOpen(false); router.setParams({ measurement: undefined }); }} />
    </>}
  </Screen>;
}

function MeasurementRow({ measurement }: { measurement: Measurement }) {
  const { theme: t } = useAppTheme(), { update, flush } = useTraining();
  const [confirm, setConfirm] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function remove() { setBusy(true); try { update(draft => { draft.measurements = draft.measurements.filter(item => item.id !== measurement.id); }); await flush(); setConfirm(false); } catch (e) { setError(e instanceof Error ? e.message : 'Could not delete this measurement.'); } finally { setBusy(false); } }
  return <View style={{ gap: 8, paddingVertical: 7 }}><View style={u.row}><View style={{ flex: 1, gap: 5 }}><Text style={{ color: t.text, fontSize: 15, fontWeight: '600' }}>{formatNumber(measurement.weightKg)} kg{measurement.waistCm !== null ? ` · ${formatNumber(measurement.waistCm)} cm waist` : ''}</Text><Text style={{ color: t.muted, fontSize: 11 }}>{formatDate(measurement.date)}{measurement.source ? ` · ${measurement.source}` : ''}{measurement.bodyFatPercent ? ` · ${formatNumber(measurement.bodyFatPercent)}% body fat` : ''}</Text>{!!measurement.notes && <Body muted style={{ fontSize: 12 }}>{measurement.notes}</Body>}</View><IconButton label={`Delete measurement from ${measurement.date}`} onPress={() => setConfirm(true)}><Trash2 size={16} color={t.muted} /></IconButton></View>{!!error && <Body style={{ color: t.danger }}>{error}</Body>}<ConfirmDialog visible={confirm} title="Delete measurement?" message={`Remove your ${formatDate(measurement.date)} entry. This cannot be undone.`} onCancel={() => setConfirm(false)} onConfirm={() => void remove()} busy={busy} /></View>;
}
function MeasurementModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme: t } = useAppTheme(), { state, update, flush } = useTraining();
  const [date, setDate] = useState(dateKey()), [weight, setWeight] = useState(''), [waist, setWaist] = useState(''), [notes, setNotes] = useState(''), [fat, setFat] = useState(''), [lean, setLean] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const existing = state.measurements.find(item => item.date === date && !item.sourceId);
  async function save() {
    const check = new Date(`${date}T12:00:00`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(check.getTime()) || dateKey(check.getTime()) !== date || date > dateKey()) { setError('Choose a real date, no later than today (YYYY-MM-DD).'); return; }
    if (!weight.trim() || !Number.isFinite(Number(weight)) || Number(weight) < 20 || Number(weight) > 500) { setError('Enter a weight between 20 and 500 kg.'); return; }
    if (waist.trim() && (!Number.isFinite(Number(waist)) || Number(waist) < 20 || Number(waist) > 300)) { setError('Enter a waist measurement between 20 and 300 cm, or leave it blank.'); return; }
    if (fat.trim() && (!Number.isFinite(Number(fat)) || Number(fat)<1 || Number(fat)>75)) {setError('Enter body fat from 1–75%, or leave it blank.'); return;}
    if (lean.trim() && (!Number.isFinite(Number(lean)) || Number(lean)<1 || Number(lean)>300)) {setError('Enter lean mass from 1–300 kg, or leave it blank.'); return;}
    setBusy(true); setError('');
    const entry: Measurement = { id: existing?.id ?? uid(), date, recordedAt: date === dateKey() ? Date.now() : check.getTime(), source: 'Manual entry', weightKg: Number(weight), waistCm: waist.trim() ? Number(waist) : null, notes: notes.trim(), bodyFatPercent:fat.trim()?Number(fat):null, leanMassKg:lean.trim()?Number(lean):null };
    try { update(draft => { draft.measurements = [...draft.measurements.filter(item => item.id !== entry.id), entry]; }); await flush(); setWeight(''); setWaist(''); setNotes(''); setFat(''); setLean(''); onClose(); } catch (e) { setError(e instanceof Error ? e.message : 'Could not save this measurement.'); } finally { setBusy(false); }
  }
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={() => { if (!busy) onClose(); }}><SafeAreaView style={{ flex: 1, justifyContent: 'center', backgroundColor: '#000000B3', padding: 18 }}><View accessibilityViewIsModal style={{ backgroundColor: t.background, borderWidth: 1, borderColor: t.line, maxWidth: 440, width: '100%', maxHeight: '100%', alignSelf: 'center', borderRadius: 22, padding: 21, gap: 18 }}><View style={u.row}><View style={{ flex: 1 }}><Title>Log a measurement</Title></View><IconButton label="Close measurement editor" onPress={onClose} disabled={busy}><X size={19} color={t.text} /></IconButton></View><ScrollView automaticallyAdjustKeyboardInsets keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 17 }}><Field label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" maxLength={10} /><Field label="Body weight (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="e.g. 75.5" maxLength={6} /><Field label="Waist (cm), optional" value={waist} onChangeText={setWaist} keyboardType="decimal-pad" placeholder="e.g. 82" maxLength={6} /><Field label="Body fat (%), optional" value={fat} onChangeText={setFat} keyboardType="decimal-pad" maxLength={5} placeholder="From your scale" /><Field label="Lean mass (kg), optional" value={lean} onChangeText={setLean} keyboardType="decimal-pad" maxLength={6} placeholder="From your scale" /><Field label="Notes, optional" value={notes} onChangeText={setNotes} placeholder="Same time of day, after waking…" multiline maxLength={500} />{existing && <Body muted style={{ fontSize: 12 }}>A manual entry exists on this date. Saving replaces that entry; imported scale readings are kept.</Body>}{!!error && <Body style={{ color: t.danger }}>{error}</Body>}<Button label={busy ? 'Saving…' : existing ? 'Update measurement' : 'Save measurement'} disabled={busy} onPress={() => void save()} /></ScrollView></View></SafeAreaView></Modal>;
}
