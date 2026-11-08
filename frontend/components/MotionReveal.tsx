import { useContext, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  ReduceMotion,
} from 'react-native-reanimated';
import { ReducedMotionContext } from '@/lib/motion';

const motionEase = Easing.bezier(0.22, 1, 0.36, 1);

const entrance = (delay: number) =>
  FadeInDown.duration(420)
    .delay(delay)
    .easing(motionEase)
    .reduceMotion(ReduceMotion.System);
const entrances = {
  first: entrance(0),
  second: entrance(60),
  third: entrance(120),
  update: FadeIn.duration(220)
    .easing(motionEase)
    .reduceMotion(ReduceMotion.System),
};

export function MotionReveal({
  children,
  beat = 'first',
  style,
}: {
  children: ReactNode;
  beat?: keyof typeof entrances;
  style?: StyleProp<ViewStyle>;
}) {
  const reduceMotion = useContext(ReducedMotionContext);
  return (
    <Animated.View
      entering={reduceMotion ? undefined : entrances[beat]}
      style={style}
    >
      {children}
    </Animated.View>
  );
}
