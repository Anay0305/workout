import { Tabs } from 'expo-router/js-tabs';
import { DockTabBar } from '../../components/DockTabBar';
import { useAppTheme } from '../../ThemeProvider';

export default function TabLayout() {
  const { theme: t } = useAppTheme();
  return <Tabs tabBar={props => <DockTabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: t.background } }}>
    <Tabs.Screen name="index" options={{ title: 'Today' }} />
    <Tabs.Screen name="history" options={{ title: 'History' }} />
    <Tabs.Screen name="progress" options={{ title: 'Progress' }} />
    <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
  </Tabs>;
}
