import { createContext, useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

export const ReducedMotionContext = createContext(false);

export function useSystemReducedMotion() {
  const initial = useReducedMotion();
  const [reduced, setReduced] = useState(initial);

  useEffect(() => {
    let subscribed = true;
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduced
    );
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (subscribed) setReduced(enabled);
    });
    return () => {
      subscribed = false;
      subscription.remove();
    };
  }, []);

  return reduced;
}
