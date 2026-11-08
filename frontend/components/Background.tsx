import { ReactNode, useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '@/lib/theme';
export function SkyBackground({ children }: { children: ReactNode }) {
  const [reduce, setReduce] = useState(false);
  const x = useSharedValue(-40);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce);
    const s = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduce
    );
    return () => s.remove();
  }, []);
  useEffect(() => {
    if (!reduce)
      x.value = withRepeat(withTiming(110, { duration: 18000 }), -1, true);
  }, [reduce, x]);
  const drift = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));
  return (
    <LinearGradient
      colors={[colors.pale, '#F9FDFF', '#D9F2FD']}
      style={StyleSheet.absoluteFill}
    >
      <Animated.View style={[styles.cloud, styles.one, drift]} />
      <Animated.View style={[styles.cloud, styles.two, drift]} />
      {children}
    </LinearGradient>
  );
}
const styles = StyleSheet.create({
  cloud: {
    position: 'absolute',
    width: 280,
    height: 100,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,.48)',
  },
  one: { top: 70, left: -130 },
  two: { top: '55%', right: -130, opacity: 0.7 },
});
