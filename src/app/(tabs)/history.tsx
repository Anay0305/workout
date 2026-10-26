import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ChevronRight, Clock3, Dumbbell, Search } from 'lucide-react-native';
import { useAppTheme } from '../../ThemeProvider';
import { useTraining } from '../../data/store';
import { durationSeconds, formatDate, formatDuration, sessionVolume, workingSets } from '../../data/workout';
import { Body, Card, Heading, Field, Screen, Title, u } from '../../components/ui';

export default function HistoryScreen() {
  const { theme: t } = useAppTheme();
  const { state } = useTraining();
  const [search, setSearch] = useState('');
  const sessions = useMemo(() => [...state.sessions].sort((a, b) => b.startedAt - a.startedAt), [state.sessions]);
  const filtered = useMemo(() => sessions.filter(session => `${session.title} ${session.notes} ${session.exercises.map(exercise => exercise.name).join(' ')}`.toLowerCase().includes(search.trim().toLowerCase())), [sessions, search]);

  return <Screen scroll={false} style={{ padding: 0, gap: 0 }}>
    <FlatList data={filtered} keyExtractor={item => item.id} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" style={{ width: '100%' }} contentContainerStyle={{ width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 44, gap: 12 }}
      ListHeaderComponent={<View style={{ gap: 20, marginBottom: 8 }}><Heading title="History" subtitle={`${state.sessions.length} ${state.sessions.length === 1 ? 'workout' : 'workouts'} logged`} /><Field accessibilityLabel="Search workout history" placeholder="Search workouts or exercises" value={search} onChangeText={setSearch} /></View>}
      ListEmptyComponent={<Card style={{ alignItems: 'center', paddingVertical: 40, gap: 12 }}>{search ? <Search size={27} color={t.muted} /> : <Dumbbell size={27} color={t.accent} />}<Title>{search ? 'No matches' : 'No workouts yet'}</Title><Body muted style={{ textAlign: 'center' }}>{search ? 'Try a different workout or exercise name.' : 'Completed workouts will appear here.'}</Body></Card>}
      renderItem={({ item: session, index }) => <View style={{ gap: 9 }}>{(index === 0 || new Date(filtered[index - 1].startedAt).getMonth() !== new Date(session.startedAt).getMonth() || new Date(filtered[index - 1].startedAt).getFullYear() !== new Date(session.startedAt).getFullYear()) && <Text style={{ color: t.muted, fontSize: 13, fontWeight: '600', marginTop: index ? 10 : 0 }}>{new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(session.startedAt)}</Text>}<Pressable accessibilityRole="button" accessibilityLabel={`Open ${session.title} from ${formatDate(session.startedAt)}`} onPress={() => router.push({ pathname: '/session/[id]', params: { id: session.id } })}><Card style={{ gap: 10 }}><View style={u.row}><View style={{ flex: 1, gap: 4 }}><Text style={{ color: t.text, fontSize: 17, fontWeight: '600' }}>{session.title}</Text><Text style={{ color: t.muted, fontSize: 13 }}>{formatDate(session.startedAt)}</Text></View><ChevronRight size={18} color={t.muted} /></View><Text numberOfLines={1} style={{ color: t.muted, fontSize: 13 }}>{session.exercises.map(exercise => exercise.name).join(' · ')}</Text><View style={[u.row, { gap: 18 }]}><View style={[u.row, { gap: 5 }]}><Clock3 size={14} color={t.muted} /><Text style={{ color: t.muted, fontSize: 12 }}>{formatDuration(durationSeconds(session))}</Text></View><View style={[u.row, { gap: 5 }]}><Dumbbell size={14} color={t.muted} /><Text style={{ color: t.muted, fontSize: 12 }}>{Math.round(sessionVolume(session)).toLocaleString()} kg</Text></View><Text style={{ color: t.muted, fontSize: 12 }}>{workingSets(session).length} sets</Text></View></Card></Pressable></View>} />
  </Screen>;
}
