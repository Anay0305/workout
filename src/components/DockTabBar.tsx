import { Pressable, Text, View } from 'react-native';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { ChartNoAxesCombined, Clock3, House, Settings2, type LucideIcon } from 'lucide-react-native';
import { useAppTheme } from '../ThemeProvider';

const tabs: Record<string, { label: string; icon: LucideIcon }> = {
  index: { label: 'Today', icon: House },
  history: { label: 'History', icon: Clock3 },
  progress: { label: 'Progress', icon: ChartNoAxesCombined },
  settings: { label: 'Settings', icon: Settings2 },
};

export function DockTabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const { theme: t } = useAppTheme();

  return <View style={{ backgroundColor: t.background, paddingHorizontal: 18, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 8) + 4 }}>
    <View style={{ flexDirection: 'row', alignSelf: 'center', width: '100%', maxWidth: 460, minHeight: 68, padding: 5, borderRadius: 27, backgroundColor: t.surface, borderWidth: 1, borderColor: t.line, shadowColor: '#000000', shadowOffset: { width: 0, height: 7 }, shadowOpacity: t.id === 'dark' ? 0.28 : 0.12, shadowRadius: 18, elevation: 8 }}>
      {state.routes.map((route, index) => {
        const item = tabs[route.name];
        if (!item) return null;
        const focused = state.index === index;
        const { options } = descriptors[route.key];
        const Icon = item.icon;
        const color = focused ? t.accent : t.muted;
        return <Pressable
          key={route.key}
          accessibilityRole="tab"
          accessibilityLabel={options.tabBarAccessibilityLabel ?? item.label}
          accessibilityState={{ selected: focused }}
          aria-selected={focused}
          testID={options.tabBarButtonTestID}
          onPress={() => {
            const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigateToTab(route.key);
          }}
          onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
          style={({ pressed }) => ({ flex: 1, minHeight: 56, borderRadius: 22, alignItems: 'center', justifyContent: 'center', gap: 3, backgroundColor: focused ? t.id === 'dark' ? '#173653' : '#EAF3FF' : 'transparent', opacity: pressed ? 0.65 : 1 })}
        >
          <Icon size={21} color={color} strokeWidth={focused ? 2.2 : 1.8} />
          <Text style={{ color, fontSize: 10, fontWeight: focused ? '700' : '500', letterSpacing: 0.1 }}>{item.label}</Text>
        </Pressable>;
      })}
    </View>
  </View>;
}
