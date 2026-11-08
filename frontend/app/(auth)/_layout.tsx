import { useContext } from 'react';
import { Stack } from 'expo-router';
import { ReducedMotionContext } from '@/lib/motion';

export default function AuthLayout() {
  const reduceMotion = useContext(ReducedMotionContext);
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: reduceMotion ? 'none' : 'fade',
      }}
    />
  );
}
