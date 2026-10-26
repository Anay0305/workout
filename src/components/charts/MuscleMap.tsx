import { muscleIntensity, musclePalette, muscleFill, muscleIntensityLegend } from '../../data/muscle-intensity';
import { useEffect, useId } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { ClipPath, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import Animated, { Easing, FadeIn, interpolateColor, useAnimatedProps, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { ANATOMY, type AnatomyPiece } from '../../data/muscle-anatomy';
import { MUSCLES, type MuscleId, type DetailedMuscleWork } from '../../data/muscle-detail';

export const muscleColors = { trained: musclePalette[4], unlogged: musclePalette[0], assisting: musclePalette[1], selected: '#F1E4AD' };
const AnimatedPath = Animated.createAnimatedComponent(Path);
function Muscle({ piece, work, selected, onSelect, index, reduced, side, interactive }: { piece: AnatomyPiece; work?: DetailedMuscleWork; selected: boolean; onSelect: (id: MuscleId) => void; index: number; reduced: boolean; side: string; interactive: boolean }) {
  const value = useSharedValue(0);
  const intensity = muscleIntensity(work);
  useEffect(() => { value.value = reduced ? intensity : withDelay(index % 12 * 18, withTiming(intensity, { duration: 650, easing: Easing.out(Easing.cubic) })); }, [intensity, value, reduced, index]);
  const props = useAnimatedProps(() => ({ fill: interpolateColor(value.value, [0, 1, 2, 3, 4, 5], [...musclePalette]) }));
  const name = `${MUSCLES.find(m => m.id === piece.id)?.name}: ${work?.directSets ?? 0} direct sets, ${work?.assistingSets ?? 0} assisting sets`;
  const clip = `region-${side}-${index}`, bounds = `bounds-${side}-${index}`;
  return <G clipPath={piece.clip ? `url(#${bounds})` : undefined}>
    <Defs><ClipPath id={clip}><Path d={piece.d} /></ClipPath>{piece.clip ? <ClipPath id={bounds}><Rect x={piece.clip[0]} y={piece.clip[1]} width={piece.clip[2]} height={piece.clip[3]} /></ClipPath> : null}</Defs>
    {Platform.OS === 'web'
      ? <path d={piece.d} fill={muscleFill(work)} role={interactive ? "button" : undefined} aria-label={interactive ? name : undefined} tabIndex={interactive ? 0 : undefined} onClick={interactive ? () => onSelect(piece.id) : undefined} onKeyDown={interactive ? e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(piece.id); } } : undefined} style={{ cursor: interactive ? 'pointer' : 'default', transition: reduced ? 'none' : 'fill 650ms ease' }} />
      : <AnimatedPath d={piece.d} animatedProps={props} onPress={interactive ? () => onSelect(piece.id) : undefined} accessibilityLabel={interactive ? name : undefined} />}
    <Path d={piece.d} fill={`url(#tone-${side})`} pointerEvents="none" />
    <G clipPath={`url(#${clip})`} pointerEvents="none"><Path d={piece.fibers} fill="none" stroke="#F4EBDD" strokeOpacity={0.24} strokeWidth={1.6} /></G>
    <Path d={piece.d} fill="none" stroke={selected ? muscleColors.selected : '#192A22'} strokeWidth={selected ? 4 : 1.2} pointerEvents="none" />
  </G>;
}
function Figure({ side, muscles, selected, onSelect, compact }: { side: 'front' | 'back'; muscles: DetailedMuscleWork[]; selected: MuscleId | null; onSelect: (id: MuscleId) => void; compact: boolean }) {
  const reduced = useReducedMotion(), anatomy = ANATOMY[side];
  const prefix = `${useId().replace(/:/g, '')}-${side}`;
  return <View style={[styles.figure, compact && { paddingBottom: 0 }]}>
    <Svg width="100%" height="100%" viewBox={side === 'front' ? '30 85 664 1285' : '754 85 664 1285'}>
      <Defs><LinearGradient id={`tone-${prefix}`} x1="0" y1="0" x2="1" y2="0.3"><Stop offset="0" stopColor="#081C14" stopOpacity={0.35} /><Stop offset="0.35" stopColor="#FCF1DB" stopOpacity={0.17} /><Stop offset="0.65" stopColor="#FFFFFF" stopOpacity={0.03} /><Stop offset="1" stopColor="#061710" stopOpacity={0.3} /></LinearGradient></Defs>
      <Path d={anatomy.outline} fill="#32453A" stroke="#7E8B76" strokeOpacity={0.45} strokeWidth={1.5} />
      {anatomy.neutral.map((d, i) => <Path key={i} d={d} fill="#536357" stroke="#22352B" strokeWidth={1} />)}
      {anatomy.pieces.map((piece, i) => <Muscle key={`${piece.id}-${i}`} piece={piece} side={prefix} interactive={!compact} work={muscles.find(m => m.id === piece.id)} selected={selected === piece.id} onSelect={onSelect} index={i} reduced={reduced} />)}
    </Svg>
    {!compact && <Text style={styles.side}>{side === 'front' ? 'ANTERIOR · FRONT' : 'POSTERIOR · BACK'}</Text>}
  </View>;
}
export function MuscleMap({ muscles, selected, onSelect, view = 'both', compact = false, compactHeight = 160 }: { muscles: DetailedMuscleWork[]; selected: MuscleId | null; onSelect: (id: MuscleId) => void; view?: 'both' | 'front' | 'back'; compact?: boolean; compactHeight?: number }) {
  const reduced = useReducedMotion();
  return <Animated.View key={view} entering={reduced ? undefined : FadeIn.duration(260)} style={[styles.row, { height: compact ? compactHeight : view === 'both' ? 340 : 480 }]}>{view !== 'back' && <Figure side="front" muscles={muscles} selected={selected} onSelect={onSelect} compact={compact} />}{view !== 'front' && <Figure side="back" muscles={muscles} selected={selected} onSelect={onSelect} compact={compact} />}</Animated.View>;
}
export function MuscleIntensityLegend({ period = 'this week' }: { period?: string }) {
  return <View style={{ gap: 10, marginTop: 14 }}>
    <Text style={{ color: '#DEE5D7', textAlign: 'center', fontSize: 11 }}>Completed direct sets {period}</Text>
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 14 }}>{muscleIntensityLegend.map(bin => <View key={bin.label} style={{ alignItems: 'center', gap: 5 }}><View style={{ width: 30, height: 12, backgroundColor: bin.color, borderRadius: 3 }} /><Text style={{ color: '#DEE5D7', fontSize: 10 }}>{bin.label}</Text></View>)}</View>
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16 }}>{[{ label: 'Not logged', color: muscleColors.unlogged }, { label: 'Assisting only', color: muscleColors.assisting }].map(item => <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><View style={{ width: 8, height: 8, borderRadius: 3, backgroundColor: item.color }} /><Text style={{ color: '#DEE5D7', fontSize: 10 }}>{item.label}</Text></View>)}</View>
  </View>;
}
const styles = StyleSheet.create({ row: { flexDirection: 'row', justifyContent: 'center', gap: 10 }, figure: { flex: 1, maxWidth: 280, paddingBottom: 18 }, side: { color: '#B3C2AA', fontSize: 9, letterSpacing: 1.4, fontWeight: '700', textAlign: 'center', marginTop: 0 } });
