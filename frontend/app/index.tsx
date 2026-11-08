import { Redirect } from 'expo-router';
import { useAuthStore } from '@/lib/auth/store';

export default function Index() {
  const status = useAuthStore((state) => state.status);
  const needsOnboarding = useAuthStore((state) => state.needsOnboarding);
  return status === 'signedIn' && !needsOnboarding ? (
    <Redirect href="/(tabs)" />
  ) : null;
}
