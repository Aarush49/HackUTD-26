import { useEffect, useState } from "react";
import { AccessibilityInfo, Pressable, StyleSheet, View } from "react-native";
import Svg, { Circle, Ellipse, G, Path } from "react-native-svg";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import type { Goal } from "@/lib/store";
import { goalViews, useFinanceStore } from "@/lib/store";
import { colors } from "@/lib/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Sapling({ goal, ambient = false, compact = false, onPress }: { goal: Pick<Goal, "title" | "growth">; ambient?: boolean; compact?: boolean; onPress?: () => void }) {
  const shock = useFinanceStore(state => state.shock);
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion); }, []);
  const growth = Math.max(.08, Math.min(1, goal.growth ?? 0));
  const stage = Math.min(4, Math.floor(growth * 5));
  const height = compact ? 70 : ambient ? 155 : 112;
  const crown = 15 + stage * 5;
  const droop = shock ? 10 : 0;
  const scale = useSharedValue(.78 + growth * .22);
  const rotation = useSharedValue(droop);
  useEffect(() => {
    scale.value = reduceMotion ? .78 + growth * .22 : withSpring(.78 + growth * .22);
    rotation.value = reduceMotion ? droop : withSpring(droop);
  }, [droop, growth, reduceMotion, rotation, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }, { rotate: `${rotation.value}deg` }] }));
  return <AnimatedPressable accessibilityRole={onPress ? "button" : undefined} accessibilityLabel={goal.title} onPress={onPress}
    style={[{ width: height * .72, height }, style]}><Svg viewBox="0 0 100 150" width="100%" height="100%">
      <Ellipse cx="50" cy="138" rx="28" ry="6" fill={colors.sky} opacity={.14}/>
      {stage === 0 ? <><Ellipse cx="50" cy="132" rx="9" ry="5" fill="#9A6B4F"/><Path d="M50 128v-8" stroke="#3D8B64" strokeWidth="4"/></> : <>
        <Path d={`M50 136 C${48 + droop} 112 ${53 + droop} 77 ${50 + droop} ${42 - stage * 3}`} fill="none" stroke="#337A5D" strokeWidth={5 + stage} strokeLinecap="round"/>
        {[0, 1, 2, 3, 4].slice(0, stage + 1).map((_, index) => { const y = 112 - index * 18, side = index % 2 ? 1 : -1; return <G key={index} rotation={droop} origin={`50,${y}`}>
          <Path d={`M50 ${y} Q${50 + side * 15} ${y - 10} ${50 + side * 26} ${y - 9}`} fill="none" stroke="#337A5D" strokeWidth="4"/>
          <Ellipse cx={50 + side * 27} cy={y - 11} rx={crown * .62} ry={crown * .36} fill={index % 2 ? "#7DD3A7" : "#55B98A"} rotation={side * 18} origin={`${50 + side * 27},${y - 11}`}/>
        </G>; })}
        {stage >= 3 && <Circle cx="50" cy="38" r={crown} fill="#77CFA2"/>}
        {stage === 4 && [[39, 31], [57, 25], [64, 43], [47, 47]].map(([x, y], index) => <Circle key={index} cx={x} cy={y} r="5" fill={colors.pink}/>)}</>}
    </Svg></AnimatedPressable>;
}

export function GardenLayer() {
  const { dashboard, baseline, inspectGoal } = useFinanceStore();
  const goals = goalViews(dashboard, baseline).filter(goal => goal.growth !== null).slice(0, 3);
  return <View pointerEvents="box-none" style={s.layer}><View pointerEvents="none" style={s.soil}/>
    {goals.map((goal,index) => <Sapling key={goal.id} goal={goal} ambient={index === 1} onPress={() => inspectGoal(goal.id)}/>)}
  </View>;
}

const s = StyleSheet.create({ layer: { position: "absolute", left: 0, right: 0, bottom: 60, height: 210, opacity: .17, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-around" }, soil: { position: "absolute", bottom: 0, left: -20, right: -20, height: 34, borderTopLeftRadius: 100, borderTopRightRadius: 100, backgroundColor: "#75C99B" } });
