import { useState } from 'react';
import { Platform, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Check, Scale, CloudOff, Download, Dumbbell, Palette, RefreshCw, ShieldCheck, SlidersHorizontal, Upload, UserRound } from 'lucide-react-native';
import { useAppTheme } from '../../ThemeProvider';
import { useTraining } from '../../data/store';
import type { DataState } from '../../data/types';
import { backupJSON, parseBackup } from '../../data/validation';
import { DAY_LABELS, GOAL_LABELS, suggestedRoutines } from '../../data/personalize';
import { exportBackup, pickBackup } from '../../platform/backup';
import { requestNotificationPermission } from '../../platform/notifications';
import { Appearance } from '../../components/Appearance';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Body, Button, Card, Chip, Field, Heading, Label, RowLink, Screen, Title, u } from '../../components/ui';

export default function SettingsScreen() {
  const { state, update, flush, replace, retry, saving, error: storageError, loadFailed } = useTraining();
  const { theme: t, appearance: appearanceChoice, select: selectAppearance } = useAppTheme();
  const [appearance, setAppearance] = useState(false);
  const [rest, setRest] = useState(String(state.settings.restSeconds));
  const [reminderTime,setReminderTime]=useState(`${String(state.settings.reminderHour??18).padStart(2,'0')}:${String(state.settings.reminderMinute??0).padStart(2,'0')}`);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [pendingBackup, setPendingBackup] = useState<DataState | null>(null);
  const [regenerate, setRegenerate] = useState(false);
  const locked = busy || loadFailed;
  const fail = (cause: unknown, fallback: string) => setError(cause instanceof Error ? cause.message : fallback);
  async function saveRest(value = rest) {
    const seconds = Number(value);
    if (!value.trim() || !Number.isInteger(seconds) || seconds < 0 || seconds > 1800) { setError('Choose a whole number from 0 to 1,800 seconds.'); return; }
    setError('');
    try { update(draft => { draft.settings.restSeconds = seconds; }); await flush(); setNotice('Default rest updated. Existing exercise timers keep their own settings.'); }
    catch (cause) { fail(cause, 'Your rest setting could not be saved.'); }
  }
  async function enableNotifications(enabled: boolean) {
    if (busy) return; setBusy(true); setError(''); setNotice('');
    try {
      if (enabled && !await requestNotificationPermission()) {
        setError(Platform.OS === 'web' ? 'Rest notifications are available in the installed app. The on-screen timer still works here.' : 'Notifications are not enabled. Allow workout notifications in your device settings, then try again.');
        return;
      }
      update(draft => { draft.settings.notifications = enabled; }); await flush();
      setNotice(enabled ? 'Rest alerts are enabled.' : 'Rest alerts are turned off.');
    } catch (cause) { fail(cause, 'Notification settings could not be updated.'); }
    finally { setBusy(false); }
  }
  async function saveReminders(enabled:boolean){
    const match=/^(\d{2}):(\d{2})$/.exec(reminderTime);if(!match||Number(match[1])>23||Number(match[2])>59){setError('Enter reminder time as HH:MM, from 00:00 to 23:59.');return;}
    setBusy(true);setError('');setNotice('');try{if(enabled&&!await requestNotificationPermission()){setError(Platform.OS==='web'?'Training reminders are available in the installed iOS or Android app.':'Allow notifications in your device settings to enable reminders.');return;}update(d=>{d.settings.reminders=enabled;d.settings.reminderHour=Number(match[1]);d.settings.reminderMinute=Number(match[2]);});await flush();setNotice(enabled?'Training reminders follow your preferred days.':'Training reminders are off.');}catch(cause){fail(cause,'Could not save reminder settings.');}finally{setBusy(false);}
  }
  async function exportData() {
    if (busy) return; setBusy(true); setError(''); setNotice('');
    try { await flush(); await exportBackup(backupJSON(state)); setNotice('Backup file prepared. Keep a copy somewhere you can recover it.'); }
    catch (cause) { fail(cause, 'Your backup could not be created.'); }
    finally { setBusy(false); }
  }
  async function importData() {
    if (busy) return; setBusy(true); setError(''); setNotice('');
    try { const text = await pickBackup(); if (text !== null) setPendingBackup(parseBackup(text)); }
    catch (cause) { fail(cause, 'This backup could not be read. Your current data is unchanged.'); }
    finally { setBusy(false); }
  }
  async function restore() {
    if (!pendingBackup || busy) return; setBusy(true); setError('');
    try { await replace(pendingBackup); setRest(String(pendingBackup.settings.restSeconds)); setReminderTime(`${String(pendingBackup.settings.reminderHour??18).padStart(2,'0')}:${String(pendingBackup.settings.reminderMinute??0).padStart(2,'0')}`); setPendingBackup(null); setNotice('Backup restored on this device.'); }
    catch (cause) { setPendingBackup(null); fail(cause, 'The backup could not be restored.'); }
    finally { setBusy(false); }
  }
  async function rebuildPlan() {
    if (busy) return; setBusy(true); setError('');
    try { update(draft => { draft.routines = suggestedRoutines(draft.profile); }); await flush(); setRegenerate(false); setNotice('Your starting routines now match your current profile. Your workout history is unchanged.'); }
    catch (cause) { fail(cause, 'Your routines could not be updated.'); }
    finally { setBusy(false); }
  }
  return <Screen>
    <Appearance visible={appearance} onClose={() => setAppearance(false)} />
    <ConfirmDialog visible={!!pendingBackup} title="Restore this backup?" confirmLabel="Replace with backup" busy={busy} onCancel={() => setPendingBackup(null)} onConfirm={() => void restore()} message={pendingBackup ? `This replaces this device’s ${state.sessions.length} saved workouts, routines, profile, and measurements with ${pendingBackup.sessions.length} workouts, ${pendingBackup.routines.length} routines, and ${pendingBackup.measurements.length} measurements from the backup.${state.active ? ' Your current in-progress workout will be replaced too.' : ''}${pendingBackup.active ? ' The backup includes an unfinished workout you can resume.' : ''} Export your current data first if you want to keep it.` : ''} />
    <ConfirmDialog visible={regenerate} title="Rebuild your starting routines?" confirmLabel="Replace routines" busy={busy} onCancel={() => setRegenerate(false)} onConfirm={() => void rebuildPlan()} message={`Your ${state.routines.length} saved routines will be replaced with a plan for ${state.profile.daysPerWeek} days per week using your current goal, experience, and equipment. Workout history and any active workout stay unchanged. You can edit the new routines afterward.`} />
    <Heading title="Settings" />
    <Card>
      <View style={u.row}><View style={{ width: 50, height: 50, borderRadius: 15, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: t.onAccent, fontSize: 22, fontWeight: '700' }}>{(state.profile.name || 'Y').trim().slice(0, 1).toUpperCase()}</Text></View><View style={{ flex: 1, gap: 3 }}><Title>{state.profile.name || 'Your profile'}</Title><Body muted>{GOAL_LABELS[state.profile.goal]} · {state.profile.daysPerWeek} days a week</Body></View></View>
      <RowLink title="Edit profile" onPress={() => router.push('/onboarding?edit=1')} icon={<UserRound size={19} color={t.accent} />} />
    </Card>
    <View style={{ gap: 10 }}><Label>GENERAL</Label><Card style={{ gap: 0 }}>
      <Toggle title="Light mode" description="Use the bright appearance" value={t.id === 'light'} onChange={enabled => selectAppearance(enabled ? 'light' : 'dark')} />
      <View style={{ height: 0.5, backgroundColor: t.line }} />
      <RowLink title="Appearance" subtitle={appearanceChoice === 'system' ? 'Automatic' : t.name} onPress={() => setAppearance(true)} icon={<Palette size={20} color={t.accent} />} />
      <View style={{ height: 0.5, backgroundColor: t.line }} />
      <RowLink title={Platform.OS === 'ios' ? 'Scale & body data' : 'Cult scale & body data'} onPress={() => router.push('/scale')} icon={<Scale size={20} color={t.accent} />} />
      <View style={{ height: 0.5, backgroundColor: t.line }} />
      <Toggle title="Haptic feedback" description="Tap feedback when you complete a set" value={state.settings.haptics} disabled={locked} onChange={value => update(draft => { draft.settings.haptics = value; })} />
    </Card></View>
    <View style={{ gap: 10 }}><Label>REMINDERS</Label><Card>
      <Toggle title="Training reminders" description={state.profile.preferredDays.map(day => DAY_LABELS[day]).join(', ') || 'Your chosen days'} value={!!state.settings.reminders} disabled={busy} onChange={enabled => void saveReminders(enabled)} />
      <Field label="Time · 24-hour HH:MM" value={reminderTime} onChangeText={setReminderTime} maxLength={5} placeholder="18:00" />
      <Button label="Save reminder time" variant="secondary" disabled={busy} onPress={() => void saveReminders(!!state.settings.reminders)} />
    </Card></View>
    <View style={{ gap: 12 }}><Label>During your workout</Label><Card>
      <View style={u.row}><SlidersHorizontal size={22} color={t.accent} /><Title>Rest & focus</Title></View>
      <Toggle title="Automatic rest timer" description="Start a rest after completing a working set." value={state.settings.autoRest} disabled={locked} onChange={value => update(draft => { draft.settings.autoRest = value; })} />
      <Toggle title="Rest notifications" description="Get an alert when your rest ends, even with the screen locked." value={state.settings.notifications} disabled={locked} onChange={value => void enableNotifications(value)} />
      <Field label="Default rest · seconds" value={rest} onChangeText={setRest} keyboardType="number-pad" maxLength={4} editable={!locked} />
      <View style={u.wrap}>{[30, 60, 90, 120, 180].map(seconds => <Chip key={seconds} label={`${seconds}s`} selected={rest === String(seconds)} onPress={() => { if (!locked) { setRest(String(seconds)); void saveRest(String(seconds)); } }} />)}</View>
      <Button label="Save default rest" variant="secondary" disabled={locked} onPress={() => void saveRest()} />
      <Body muted>Each exercise can have its own rest time. Use 0 seconds to skip the default timer.</Body>
    </Card></View>
    <View style={{ gap: 12 }}><Label>Training plan</Label><Card>
      <View style={u.row}><Dumbbell size={22} color={t.accent} /><Title>Built around your week</Title></View>
      <Body muted>{state.routines.length} saved routines. Adjust exercises and training days from your routine editor, or create a fresh starting plan from your current profile.</Body>
      <Button label="Rebuild starting routines" variant="secondary" disabled={locked} onPress={() => setRegenerate(true)} icon={<RefreshCw size={17} color={t.text} />} />
    </Card></View>
    <View style={{ gap: 12 }}><Label>Your data</Label><Card>
      <View style={u.row}><CloudOff size={22} color={t.accent} /><Title>Always with you. Offline.</Title></View>
      <Body muted>{state.sessions.length} workouts · {state.measurements.length} measurements · {state.customExercises.length} custom exercises</Body>
      <Body muted>Workouts are stored on this device. Backups include your profile, routines, history, measurements, and any unfinished workout. Your theme preference stays on this device.</Body>
      <Button label={busy ? 'Please wait…' : 'Export backup'} variant="secondary" disabled={locked} onPress={() => void exportData()} icon={<Download size={18} color={t.text} />} />
      <Button label="Restore backup" variant="secondary" disabled={busy} onPress={() => void importData()} icon={<Upload size={18} color={t.text} />} />
    </Card></View>
    {(!!error || !!storageError) && <Card><Text accessibilityRole="alert" style={{ color: t.danger, lineHeight: 21 }}>{error || storageError}</Text>{!!storageError && <Button label="Retry saving" variant="secondary" disabled={busy} onPress={() => { void retry().catch(cause => fail(cause, 'Saving is still unavailable.')); }} />}</Card>}
    {!!notice && <View style={[u.row, { alignItems: 'flex-start' }]}><Check size={18} color={t.accent} /><Body style={{ flex: 1 }}>{notice}</Body></View>}
    <View style={{ alignItems: 'center', gap: 8, paddingVertical: 12 }}><ShieldCheck color={t.muted} size={21} /><Body muted>{saving ? 'Saving changes…' : 'Your training is private by default.'}</Body><Text style={{ color: t.muted, fontSize: 11 }}>workout. · Local-first training journal</Text></View>
  </Screen>;
}
function Toggle({ title, description, value, onChange, disabled }: { title: string; description: string; value: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  const { theme: t } = useAppTheme();
  return <View style={[u.row, { paddingVertical: 8, gap: 18, opacity: disabled ? 0.5 : 1 }]}><View style={{ flex: 1, gap: 5 }}><Text style={{ color: t.text, fontSize: 14, fontWeight: '600' }}>{title}</Text><Text style={{ color: t.muted, fontSize: 12, lineHeight: 18 }}>{description}</Text></View><Switch accessibilityLabel={title} value={value} disabled={disabled} onValueChange={onChange} trackColor={{ false: t.line, true: t.accent }} thumbColor={value ? t.onAccent : t.muted} /></View>;
}
