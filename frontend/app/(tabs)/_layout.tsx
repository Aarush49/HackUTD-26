import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Tabs, router } from 'expo-router';
import BottomSheet, {
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UserRound, X } from 'lucide-react-native';
import { TabBar } from '@/components/navigation';
import { BrandHeader } from '@/components/BrandHeader';
import { useFinanceStore } from '@/lib/store';
import { colors } from '@/lib/theme';

export default function TabsLayout() {
  const { sheet, closeSheet, data, selectedGoal } = useFinanceStore();
  const [headline, setHeadline] = useState('');
  const insets = useSafeAreaInsets();
  const ref = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['45%', '92%'], []);
  const goal = data.goals.find((item) => item.id === selectedGoal);
  useEffect(() => {
    sheet
      ? ref.current?.snapToIndex(sheet === 'goal' ? 1 : 0)
      : ref.current?.close();
  }, [sheet]);
  function go(path: '/impact', params: { headline: string }) {
    closeSheet();
    router.push({ pathname: path, params });
  }
  return (
    <>
      <Tabs
        tabBar={(props) => <TabBar {...props} />}
        screenOptions={{
          headerShown: true,
          headerTransparent: true,
          headerTitle: () => <BrandHeader compact />,
          headerBackground: () => (
            <BlurView
              intensity={65}
              tint="light"
              style={[StyleSheet.absoluteFill, s.headerBlur]}
            >
              <View style={s.headerOverlay} />
            </BlurView>
          ),
          headerRight: () => (
            <Pressable
              accessibilityLabel="Open profile"
              onPress={() => router.push('/profile')}
              style={s.profile}
            >
              <UserRound color={colors.ink} size={20} />
            </Pressable>
          ),
        }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="picture" />
        <Tabs.Screen name="goals" />
        <Tabs.Screen name="predict" />
      </Tabs>
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        enablePanDownToClose
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        onClose={closeSheet}
        backgroundStyle={s.sheet}
      >
        <BottomSheetScrollView
          contentContainerStyle={[
            s.sheetContent,
            { paddingBottom: insets.bottom + 84 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.sheetTitle}>
            <Text style={s.title}>
              {sheet === 'goal' && goal
                ? `Options for ${goal.title}`
                : sheet === 'sapling'
                  ? 'Why your garden changed'
                  : 'What would you like to explore?'}
            </Text>
            <Pressable
              accessibilityLabel="Close sheet"
              onPress={closeSheet}
              style={s.close}
            >
              <X color={colors.ink} />
            </Pressable>
          </View>
          {sheet === 'sapling' ? (
            <>
              <Text style={s.copy}>
                {goal?.note ??
                  'Overall growth reflects runway and net-position momentum.'}
              </Text>
              {goal && (
                <Text style={s.copy}>
                  {Math.round(goal.growth * 100)}% grown ·{' '}
                  {goal.saved.toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'USD',
                  })}{' '}
                  saved
                </Text>
              )}
            </>
          ) : sheet === 'goal' ? (
            <>
              <Option
                title="12-month CD"
                pros="Predictable estimated yield"
                cons="Funds are locked"
                fit="Fits you because the goal has a defined date."
              />
              <Option
                title="Travel rewards card"
                pros="Benefits may offset trip purchases"
                cons="Interest can exceed rewards"
                fit="Fits only if the statement is paid in full."
              />
              <Option
                title="High-yield savings"
                pros="Flexible access"
                cons="Rate can change"
                fit="Fits you because the money stays available."
              />
              <View style={s.actions}>
                <Text style={s.action}>Wait</Text>
                <Text style={s.action}>Do nothing</Text>
              </View>
              <Text style={s.note}>Informational, not financial advice.</Text>
            </>
          ) : (
            <>
              <Text style={s.optionTitle}>Use a headline</Text>
              <View style={s.chips}>
                {data.impact.headlines.map((item) => (
                  <Pressable
                    key={item}
                    onPress={() => setHeadline(item)}
                    style={s.chip}
                  >
                    <Text style={s.chipText}>{item}</Text>
                  </Pressable>
                ))}
              </View>
              <BottomSheetTextInput
                value={headline}
                onChangeText={setHeadline}
                placeholder="Paste a headline…"
                style={s.input}
              />
              <Action
                label="See headline impact"
                disabled={!headline.trim()}
                onPress={() => go('/impact', { headline: headline.trim() })}
              />
            </>
          )}
        </BottomSheetScrollView>
      </BottomSheet>
    </>
  );
}

function Option({
  title,
  pros,
  cons,
  fit,
}: {
  title: string;
  pros: string;
  cons: string;
  fit: string;
}) {
  return (
    <View style={s.option}>
      <Text style={s.optionTitle}>{title}</Text>
      <Text style={s.copy}>Pros · {pros}</Text>
      <Text style={s.copy}>Cons · {cons}</Text>
      <Text style={s.fit}>Fits you because · {fit}</Text>
    </View>
  );
}
function Action({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[s.primary, disabled && { opacity: 0.45 }]}
    >
      <Text style={s.primaryText}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  headerBlur: { borderBottomWidth: 1, borderColor: 'rgba(255,255,255,.6)' },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(240,248,253,.78)',
  },
  profile: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,.72)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sheet: { backgroundColor: '#F5FBFE', borderRadius: 28 },
  sheetContent: { padding: 18 },
  sheetTitle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 24,
    color: colors.ink,
    flex: 1,
  },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.pale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    lineHeight: 17,
    color: colors.muted,
  },
  fit: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    lineHeight: 17,
    color: colors.ink,
    marginTop: 4,
  },
  option: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,.8)',
    marginBottom: 8,
  },
  optionTitle: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 17,
    color: colors.ink,
    marginBottom: 6,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  action: { fontFamily: 'Inter_700Bold', color: colors.ink, minHeight: 44 },
  note: {
    fontFamily: 'Inter_400Regular',
    fontSize: 9,
    textAlign: 'center',
    color: colors.muted,
  },
  primary: {
    minHeight: 44,
    backgroundColor: colors.pink,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  primaryText: { fontFamily: 'Inter_700Bold', color: 'white' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.pale,
  },
  chipText: { fontFamily: 'Inter_700Bold', fontSize: 10, color: colors.ink },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#CDE4EE',
    borderRadius: 15,
    paddingHorizontal: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.ink,
    backgroundColor: 'white',
    marginBottom: 10,
  },
});
