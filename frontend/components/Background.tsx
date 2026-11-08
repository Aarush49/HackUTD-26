import { ReactNode, useCallback, useContext } from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import Animated, {
  cancelAnimation,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '@/lib/theme';
import { ReducedMotionContext } from '@/lib/motion';

export function SkyBackground({ children }: { children: ReactNode }) {
  const reduce = useContext(ReducedMotionContext);
  const x = useSharedValue(-40);
  useFocusEffect(
    useCallback(() => {
      x.value = -40;
      if (reduce) return;
      x.value = withRepeat(
        withTiming(110, { duration: 18000 }),
        -1,
        true,
        undefined,
        ReduceMotion.System
      );
      return () => cancelAnimation(x);
    }, [reduce, x])
  );
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
