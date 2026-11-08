import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Link } from 'expo-router';
import { CheckSquare, Eye, EyeOff, Square } from 'lucide-react-native';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SkyBackground } from './Background';
import { Sapling } from './garden';
import { Button3D, Card, Eyebrow, Heading } from './ui';
import { useAuthStore } from '@/lib/auth/store';
import { colors } from '@/lib/theme';

const loginSchema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(8, 'Use at least 8 characters'),
});
const signupSchema = z
  .object({
    name: z.string().min(2, 'Enter your name'),
    email: z.email('Enter a valid email'),
    password: z.string().min(8, 'Use at least 8 characters'),
    confirm: z.string(),
    terms: z.boolean().refine(Boolean, 'Please accept the terms'),
  })
  .refine((v) => v.password === v.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  });
type Values = {
  name?: string;
  email: string;
  password: string;
  confirm?: string;
  terms?: boolean;
};

export function AuthScreen({ mode }: { mode: 'login' | 'signup' }) {
  const insets = useSafeAreaInsets();
  const signup = mode === 'signup';
  const login = useAuthStore((x) => x.login),
    create = useAuthStore((x) => x.signup);
  const [secure, setSecure] = useState(true),
    [loading, setLoading] = useState(false),
    [filled, setFilled] = useState(0);
  const shake = useSharedValue(0);
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    watch,
  } = useForm<Values>({
    resolver: zodResolver(signup ? signupSchema : loginSchema) as never,
    mode: 'onChange',
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirm: '',
      terms: false,
    },
  });
  const vals = watch();
  useEffect(
    () => setFilled(Object.values(vals).filter(Boolean).length),
    [vals]
  );
  const animated = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
  }));
  const submit = handleSubmit(async (v) => {
    setLoading(true);
    try {
      signup
        ? await create({ name: v.name!, email: v.email, password: v.password })
        : await login({ email: v.email, password: v.password });
    } catch {
      shake.value = withSequence(
        withTiming(-9),
        withTiming(9),
        withTiming(-6),
        withTiming(0)
      );
    } finally {
      setLoading(false);
    }
  });
  const field = (
    name: keyof Values,
    label: string,
    props: Record<string, unknown> = {}
  ) => (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value } }) => (
        <View style={s.field}>
          <Text style={s.label}>{label}</Text>
          <View style={s.inputWrap}>
            <TextInput
              style={s.input}
              value={String(value ?? '')}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholderTextColor="#7B94A3"
              {...props}
            />
            {name === 'password' && (
              <Pressable
                accessibilityLabel={secure ? 'Show password' : 'Hide password'}
                hitSlop={12}
                onPress={() => setSecure(!secure)}
              >
                {secure ? (
                  <Eye size={19} color={colors.muted} />
                ) : (
                  <EyeOff size={19} color={colors.muted} />
                )}
              </Pressable>
            )}
          </View>
          {errors[name] && (
            <Text style={s.error}>{String(errors[name]?.message)}</Text>
          )}
        </View>
      )}
    />
  );
  return (
    <SkyBackground>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="never"
          contentContainerStyle={[
            s.page,
            { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 },
          ]}
        >
          <View style={s.trust} />
          <View style={s.top}>
            <View>
              <Eyebrow>
                {signup ? 'PLANT YOUR FIRST PLAN' : 'WELCOME TO CANOPY'}
              </Eyebrow>
              <Heading accent={signup ? 'something.' : 'back.'}>
                {signup ? 'Let’s grow' : 'Welcome'}
              </Heading>
            </View>
            <Sapling
              compact
              goal={{
                title: 'Canopy sapling',
                growth: Math.min(0.95, 0.12 + filled * 0.18),
              }}
              onPress={() => {}}
            />
          </View>
          <Animated.View style={animated}>
            <Card>
              {signup &&
                field('name', 'Name', {
                  textContentType: 'name',
                  autoComplete: 'name',
                })}
              {field('email', 'Email', {
                keyboardType: 'email-address',
                autoCapitalize: 'none',
                textContentType: 'emailAddress',
                autoComplete: 'email',
              })}
              {field('password', 'Password', {
                secureTextEntry: secure,
                textContentType: signup ? 'newPassword' : 'password',
                autoComplete: signup ? 'new-password' : 'current-password',
              })}
              {signup && (
                <>
                  <Text style={s.hint}>
                    Strength: use 8+ characters and something memorable.
                  </Text>
                  {field('confirm', 'Confirm password', {
                    secureTextEntry: true,
                    textContentType: 'newPassword',
                  })}
                  <Controller
                    control={control}
                    name="terms"
                    render={({ field: { value, onChange } }) => (
                      <>
                        <Pressable
                          onPress={() => onChange(!value)}
                          style={s.check}
                        >
                          {value ? (
                            <CheckSquare color={colors.pink} />
                          ) : (
                            <Square color={colors.muted} />
                          )}
                          <Text style={s.checkText}>
                            I agree to the demo terms and privacy notice.
                          </Text>
                        </Pressable>
                        {errors.terms && (
                          <Text style={s.error}>{errors.terms.message}</Text>
                        )}
                      </>
                    )}
                  />
                </>
              )}
              {!signup && (
                <Link href="/(auth)/forgot" style={s.forgot}>
                  Forgot password?
                </Link>
              )}
              <Button3D disabled={!isValid} loading={loading} onClick={submit}>
                {signup ? 'Create account' : 'Log in'}
              </Button3D>
              <View style={s.divider}>
                <View />
                <Text>or</Text>
                <View />
              </View>
              <Button3D tone="white">Continue with Apple</Button3D>
              <View style={{ height: 10 }} />
              <Button3D tone="white">Continue with Google</Button3D>
              <Text style={s.switch}>
                {signup ? 'Already have an account? ' : 'New here? '}
                <Link
                  href={signup ? '/(auth)/login' : '/(auth)/signup'}
                  style={s.switchLink}
                >
                  {signup ? 'Log in' : 'Create account'}
                </Link>
              </Text>
            </Card>
          </Animated.View>
          <Text style={s.footer}>
            Synthetic demo data. Informational, not financial advice.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SkyBackground>
  );
}
const s = StyleSheet.create({
  page: { paddingHorizontal: 18, flexGrow: 1, justifyContent: 'center' },
  trust: { alignItems: 'flex-end', marginBottom: 10 },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  field: { marginBottom: 13 },
  label: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: colors.ink,
    marginBottom: 6,
  },
  inputWrap: {
    minHeight: 48,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#CDE4EE',
    backgroundColor: 'rgba(255,255,255,.76)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
  },
  input: { flex: 1, fontFamily: 'Inter_400Regular', color: colors.ink },
  error: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: colors.danger,
    marginTop: 4,
  },
  forgot: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: colors.ink,
    textAlign: 'right',
    marginBottom: 14,
    minHeight: 44,
  },
  hint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: colors.green,
    marginTop: -6,
    marginBottom: 10,
  },
  check: {
    minHeight: 44,
    flexDirection: 'row',
    gap: 9,
    alignItems: 'center',
    marginBottom: 8,
  },
  checkText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.muted,
    flex: 1,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 16,
  },
  switch: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 18,
  },
  switchLink: { color: colors.pink, fontFamily: 'Inter_700Bold' },
  footer: {
    fontFamily: 'Inter_400Regular',
    fontSize: 9,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 18,
  },
});
