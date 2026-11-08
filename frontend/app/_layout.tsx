import 'react-native-gesture-handler';
import '../global.css';
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  Fraunces_600SemiBold,
  Fraunces_600SemiBold_Italic,
} from '@expo-google-fonts/fraunces';
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { useAuthStore } from '@/lib/auth/store';
import { useFinanceStore } from '@/lib/store';
import { ReducedMotionContext, useSystemReducedMotion } from '@/lib/motion';
SplashScreen.preventAutoHideAsync();
export default function RootLayout() {
  const reduceMotion = useSystemReducedMotion();
  const [fonts] = useFonts({
      Fraunces_600SemiBold,
      Fraunces_600SemiBold_Italic,
      Inter_400Regular,
      Inter_600SemiBold,
      Inter_700Bold,
    }),
    status = useAuthStore((x) => x.status),
    needs = useAuthStore((x) => x.needsOnboarding),
    hydrate = useAuthStore((x) => x.hydrate),
    segments = useSegments(),
    router = useRouter();
  useEffect(() => {
    hydrate();
  }, [hydrate]);
  useEffect(() => {
    const { load, clear } = useFinanceStore.getState();
    if (status !== 'signedIn') {
      clear();
      return;
    }
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [status]);
  useEffect(() => {
    if (!fonts || status === 'loading') return;
    const auth = segments[0] === '(auth)',
      onboarding = segments[0] === 'onboarding';
    if (status === 'signedOut' && !auth) router.replace('/(auth)/login');
    else if (status === 'signedIn' && needs && !onboarding)
      router.replace('/onboarding');
    else if (status === 'signedIn' && !needs && auth) router.replace('/(tabs)');
    SplashScreen.hideAsync();
  }, [fonts, status, needs, segments, router]);
  if (!fonts || status === 'loading') return null;
  return (
    <ReducedMotionContext value={reduceMotion}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: reduceMotion ? 'none' : 'fade',
          }}
        />
      </GestureHandlerRootView>
    </ReducedMotionContext>
  );
}
