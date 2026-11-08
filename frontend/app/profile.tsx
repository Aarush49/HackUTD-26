import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { LogOut } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SkyBackground } from '@/components/Background';
import { MotionReveal } from '@/components/MotionReveal';
import { Button3D, Card, Eyebrow, Heading } from '@/components/ui';
import { useAuthStore } from '@/lib/auth/store';
import { useFinanceStore } from '@/lib/store';
import { colors } from '@/lib/theme';

export default function Profile() {
  const { user, logout } = useAuthStore();
  const name = useFinanceStore((state) => state.data.profile.name);
  const insets = useSafeAreaInsets();
  return (
    <SkyBackground>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={[
          s.page,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 },
        ]}
      >
        <MotionReveal>
          <View style={s.top}>
            <Eyebrow>YOUR PROFILE</Eyebrow>
          </View>
          <Heading accent="you.">Made for</Heading>
        </MotionReveal>
        <MotionReveal beat="second">
          <Card style={{ marginTop: 20 }}>
            <Text style={s.name}>{name}</Text>
            <Text style={s.email}>{user?.email}</Text>
            <View style={{ height: 18 }} />
            <Button3D
              onClick={async () => {
                await logout();
                router.replace('/(auth)/login');
              }}
            >
              <View style={s.logout}>
                <LogOut color="white" />
                <Text style={s.logoutText}>Log out</Text>
              </View>
            </Button3D>
          </Card>
        </MotionReveal>
        <Pressable onPress={() => router.back()} style={s.back}>
          <Text style={s.backText}>Back to the garden</Text>
        </Pressable>
      </ScrollView>
    </SkyBackground>
  );
}

const s = StyleSheet.create({
  page: { flexGrow: 1, paddingHorizontal: 18 },
  top: { flexDirection: 'row', justifyContent: 'space-between' },
  name: { fontFamily: 'Fraunces_600SemiBold', fontSize: 28, color: colors.ink },
  email: { fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.muted },
  logout: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoutText: { fontFamily: 'Inter_700Bold', color: 'white' },
  back: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  backText: { fontFamily: 'Inter_700Bold', color: colors.ink },
});
