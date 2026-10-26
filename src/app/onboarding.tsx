import { useState, type ReactNode } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ArrowRight, CalendarDays, Check, Dumbbell, Flame, HeartPulse, ShieldCheck, Target, TrendingUp } from 'lucide-react-native';
import { useAppTheme } from '../ThemeProvider';
import { useTraining } from '../data/store';
import type { Profile } from '../data/types';
import { defaultDays, DAY_LABELS, EXPERIENCE_LABELS, GOAL_LABELS, suggestedRoutines } from '../data/personalize';
import { EQUIPMENT } from '../data/catalog';
import { localDate, uid } from '../data/workout';
import { Body, Button, Card, Chip, Field, Heading, Label, Screen, Title, u } from '../components/ui';

const steps = ['Your direction', 'Your experience', 'Your rhythm', 'Your starting point', 'Your plan'];
export default function OnboardingScreen() {
  const { state, update, flush } = useTraining();
  const { theme: t } = useAppTheme();
  const params = useLocalSearchParams<{ edit?: string }>();
  const editing = params.edit === '1';
  const [profile, setProfile] = useState<Profile>(() => ({ ...state.profile, equipment: [...state.profile.equipment], preferredDays: [...state.profile.preferredDays] }));
  const [step, setStep] = useState(0);
  const [height, setHeight] = useState(profile.heightCm?.toString() ?? '');
  const [target, setTarget] = useState(profile.targetWeightKg?.toString() ?? '');
  const [startingWeight, setStartingWeight] = useState('');
  const [createPlan, setCreatePlan] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const plan = suggestedRoutines(profile);
  const set = <K extends keyof Profile>(key: K, value: Profile[K]) => { setProfile(old => ({ ...old, [key]: value })); setError(''); };
  function validate(at: number) {
    if (at === 0 && !profile.name.trim()) return 'Add a name so your dashboard feels like yours.';
    if (at === 2 && profile.preferredDays.length !== profile.daysPerWeek) return `Choose ${profile.daysPerWeek} preferred training ${profile.daysPerWeek === 1 ? 'day' : 'days'}.`;
    if (at === 3 || at === 4) {
      if (height.trim() && (!Number.isFinite(Number(height)) || Number(height) < 50 || Number(height) > 300)) return 'Enter a height between 50 and 300 cm, or leave it blank.';
      if (target.trim() && (!Number.isFinite(Number(target)) || Number(target) < 20 || Number(target) > 500)) return 'Enter a target weight between 20 and 500 kg, or leave it blank.';
      if (startingWeight.trim() && (!Number.isFinite(Number(startingWeight)) || Number(startingWeight) < 20 || Number(startingWeight) > 500)) return 'Enter a starting weight between 20 and 500 kg, or leave it blank.';
    }
    return '';
  }
  function next() { const issue = validate(step); if (issue) { setError(issue); return; } setError(''); setStep(value => value + 1); }
  async function save() {
    if (busy) return;
    const issue = [0, 2, 3].map(validate).find(Boolean); if (issue) { setError(issue); return; }
    setBusy(true); setError('');
    try {
      const nextProfile: Profile = { ...profile, name: profile.name.trim(), equipment: [...new Set(['Bodyweight', ...profile.equipment])], heightCm: height.trim() ? Number(height) : null, targetWeightKg: target.trim() ? Number(target) : null, completedOnboarding: true };
      update(draft => {
        draft.profile = nextProfile;
        if (!editing && createPlan) draft.routines = [...draft.routines.filter(routine => !routine.id.startsWith('plan-')), ...suggestedRoutines(nextProfile)];
        if (!editing && startingWeight.trim() && !draft.measurements.length) draft.measurements.push({ id: uid(), date: localDate(), weightKg: Number(startingWeight), waistCm: null, notes: 'Starting measurement' });
      });
      await flush();
      router.replace(editing ? '/settings' : '/');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Your setup could not be saved. Please try again.'); }
    finally { setBusy(false); }
  }
  return <Screen>
    <View style={[u.row, { justifyContent: 'space-between' }]}>
      <Text style={{ color: t.text, fontSize: 24, fontWeight: '800', letterSpacing: -1 }}>workout.</Text>
    </View>
    <View style={{ gap: 12 }}>
      <View style={u.row}>{steps.map((title, index) => <View key={title} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: index <= step ? t.accent : t.raised }} />)}</View>
      <Label>STEP {step + 1} OF {steps.length} / {steps[step]}</Label>
    </View>
    {step === 0 && <>
      <Heading title={editing ? 'Refine your direction.' : 'Make room for you.'} subtitle="A few details will shape your training space. You can change everything later." />
      <Field label="Your name" value={profile.name} onChangeText={value => set('name', value)} placeholder="What should we call you?" autoComplete="given-name" maxLength={60} />
      <Title>What matters most right now?</Title>
      <Choice selected={profile.goal === 'fitness'} title="Build a consistent habit" description="A repeatable routine, a clear weekly target, and a record of showing up." icon={<CalendarDays size={22} color={t.accent} />} onPress={() => set('goal', 'fitness')} />
      <Choice selected={profile.goal === 'strength'} title="Get stronger" description="Focus your plan on progressive strength and your best lifts." icon={<TrendingUp size={22} color={t.accent} />} onPress={() => set('goal', 'strength')} />
      <Choice selected={profile.goal === 'muscle'} title="Build muscle" description="Balanced muscle coverage and a clear view of your working sets." icon={<Dumbbell size={22} color={t.accent} />} onPress={() => set('goal', 'muscle')} />
      <Choice selected={profile.goal === 'fat-loss'} title="Support fat loss" description="Combine strength and movement while tracking your own body trends." icon={<HeartPulse size={22} color={t.accent} />} onPress={() => set('goal', 'fat-loss')} />
    </>}
    {step === 1 && <>
      <Heading title="Start where you are." subtitle="Your plan should fit your experience and the equipment you can actually use." />
      <Choice selected={profile.experience === 'beginner'} title="Getting started" description="Learning the movements or returning after a break. Start with fewer working sets." icon={<Target size={22} color={t.accent} />} onPress={() => set('experience', 'beginner')} />
      <Choice selected={profile.experience === 'intermediate'} title="Training regularly" description="Comfortable with the basics and ready to follow your progress." icon={<Dumbbell size={22} color={t.accent} />} onPress={() => set('experience', 'intermediate')} />
      <Choice selected={profile.experience === 'advanced'} title="Experienced lifter" description="A higher-volume starting template that you can tune to your training." icon={<Flame size={22} color={t.accent} />} onPress={() => set('experience', 'advanced')} />
      <Title>What is available to you?</Title>
      <View style={u.wrap}>{EQUIPMENT.map(equipment => <Chip key={equipment} label={equipment === 'Bodyweight' ? 'Bodyweight · included' : equipment} selected={equipment === 'Bodyweight' || profile.equipment.includes(equipment)} onPress={() => { if (equipment !== 'Bodyweight') set('equipment', profile.equipment.includes(equipment) ? profile.equipment.filter(item => item !== equipment) : [...profile.equipment, equipment]); }} />)}</View>
      <Body muted>Choose only equipment you have access to. Exercise instructions explain when a bench or stable support is needed.</Body>
    </>}
    {step === 2 && <>
      <Heading title="Find your rhythm." subtitle="Choose a week you can repeat. A smaller target that fits your life is a good place to start." />
      <Title>Training days per week</Title>
      <View style={u.wrap}>{[1, 2, 3, 4, 5, 6, 7].map(count => <Chip key={count} label={`${count}`} selected={profile.daysPerWeek === count} onPress={() => { setProfile(old => ({ ...old, daysPerWeek: count, preferredDays: defaultDays(count) })); setError(''); }} />)}</View>
      <Title>Your preferred days</Title>
      <View style={u.wrap}>{[1, 2, 3, 4, 5, 6, 0].map(day => <Chip key={day} label={DAY_LABELS[day]} selected={profile.preferredDays.includes(day)} onPress={() => {
        if (profile.preferredDays.includes(day)) set('preferredDays', profile.preferredDays.filter(value => value !== day));
        else if (profile.preferredDays.length < profile.daysPerWeek) set('preferredDays', [...profile.preferredDays, day]);
        else setError('Unselect a day first, or increase your weekly target.');
      }} />)}</View>
      <Card><View style={u.row}><CalendarDays color={t.accent} size={24} /><View style={{ flex: 1, gap: 4 }}><Title>{profile.daysPerWeek} {profile.daysPerWeek === 1 ? 'session' : 'sessions'} a week</Title><Body muted>{profile.preferredDays.length} of {profile.daysPerWeek} preferred days selected</Body></View></View><Body muted>This sets a weekly intention, not a deadline. Missed days stay neutral; your history celebrates the work you do.</Body></Card>
    </>}
    {step === 3 && <>
      <Heading title="A starting point." subtitle="These details are optional. Leave them blank if you would rather focus on your training." />
      {!editing && <Field label="Starting body weight · kg (optional)" value={startingWeight} onChangeText={setStartingWeight} keyboardType="decimal-pad" placeholder="e.g. 75" maxLength={6} />}
      <Field label="Height · cm (optional)" value={height} onChangeText={setHeight} keyboardType="decimal-pad" placeholder="e.g. 175" maxLength={6} />
      <Field label="Your target body weight · kg (optional)" value={target} onChangeText={setTarget} keyboardType="decimal-pad" placeholder="A target you choose" maxLength={6} />
      <Card><ShieldCheck size={25} color={t.accent} /><Title>Your data stays with you.</Title><Body muted>Your profile, workouts, and body measurements are stored on this device. No account is needed. Export backups from Settings to keep another copy.</Body></Card>
    </>}
    {step === 4 && <>
      <Heading title={editing ? 'Ready for your next chapter.' : `Your space, ${profile.name.trim() || 'your way'}.`} subtitle={editing ? 'Your profile changes will keep your existing routines and workout history.' : 'A starting routine built around your choices. Every exercise, set, and day remains editable.'} />
      <Card><View style={u.row}><Target size={25} color={t.accent} /><View style={{ flex: 1, gap: 5 }}><Title>{GOAL_LABELS[profile.goal]}</Title><Body muted>{EXPERIENCE_LABELS[profile.experience]} · {profile.daysPerWeek} days a week</Body></View></View><Body muted>{profile.equipment.filter(value => value !== 'Bodyweight').join(' · ') || 'Bodyweight'}{profile.equipment.some(value => value !== 'Bodyweight') ? ' · Bodyweight' : ''}</Body></Card>
      {!editing && <>
        <View style={[u.row, { justifyContent: 'space-between' }]}><View style={{ flex: 1, gap: 5 }}><Title>Create my starting routines</Title><Body muted>You can also begin with an empty workout.</Body></View><Switch accessibilityLabel="Create starting routines" value={createPlan} onValueChange={setCreatePlan} trackColor={{ false: t.line, true: t.accent }} thumbColor={createPlan ? t.onAccent : t.muted} /></View>
        {createPlan && plan.map(routine => <Card key={routine.id}><View style={u.row}><View style={{ flex: 1, gap: 6 }}><Title>{routine.name}</Title><Body muted>{routine.exercises.length} exercises · {routine.weekdays.map(day => DAY_LABELS[day]).join(', ')}</Body></View><Check size={19} color={t.accent} /></View></Card>)}
      </>}
      <Body muted>Begin with comfortable loads and adjust the template to your capacity. Your saved results will guide your next session.</Body>
    </>}
    {!!error && <Text accessibilityRole="alert" style={{ color: t.danger, lineHeight: 21 }}>{error}</Text>}
    <View style={{ gap: 10, marginTop: 4 }}>
      <Button label={busy ? 'Saving your setup…' : step === 4 ? editing ? 'Save profile' : 'Let’s begin' : 'Continue'} disabled={busy} onPress={() => step === 4 ? void save() : next()} icon={<ArrowRight size={18} color={t.onAccent} />} />
      {step > 0 && <Button label="Back" variant="secondary" disabled={busy} onPress={() => { setStep(value => value - 1); setError(''); }} icon={<ArrowLeft size={17} color={t.text} />} />}
      {editing && <Button label="Cancel changes" variant="secondary" disabled={busy} onPress={() => router.replace('/settings')} />}
    </View>
  </Screen>;
}

function Choice({ title, description, icon, selected, onPress }: { title: string; description: string; icon: ReactNode; selected: boolean; onPress: () => void }) {
  const { theme: t } = useAppTheme();
  return <Pressable accessibilityRole="radio" aria-checked={selected} accessibilityState={{ checked: selected }} accessibilityLabel={title} onPress={onPress} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 17, borderWidth: 1, borderRadius: 18, borderColor: selected ? t.accent : t.line, backgroundColor: selected ? t.raised : t.surface, opacity: pressed ? 0.8 : 1 })}>
    <View style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: t.background }}>{icon}</View>
    <View style={{ flex: 1, gap: 6 }}><Text style={{ color: t.text, fontSize: 15, fontWeight: '700' }}>{title}</Text><Text style={{ color: t.muted, fontSize: 12, lineHeight: 19 }}>{description}</Text></View>
    {selected && <Check size={17} color={t.accent} />}
  </Pressable>;
}
