import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

export function WeeklyDial({ value, goal, dark = false }: { value: number; goal: number; dark?: boolean }) {
  const size = 88;
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / Math.max(goal, 1), 1);
  const track = dark ? '#344154' : '#E7EAF2';
  const fill = dark ? '#8CC7FF' : '#007AFF';
  return <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: goal, now: Math.min(value, goal), text: `${value} of ${goal} training days` }} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <Svg width={size} height={size} style={{ position: 'absolute' }}><Circle cx={44} cy={44} r={radius} fill="none" stroke={track} strokeWidth={7} /><Circle cx={44} cy={44} r={radius} fill="none" stroke={fill} strokeWidth={7} strokeLinecap="round" strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={circumference * (1 - progress)} transform="rotate(-90 44 44)" /></Svg>
    <Text style={{ color: dark ? '#FFFFFF' : '#1C1C1E', fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{value}<Text style={{ color: dark ? '#A8B4C4' : '#6E6E73', fontSize: 12 }}>/{goal}</Text></Text>
  </View>;
}
