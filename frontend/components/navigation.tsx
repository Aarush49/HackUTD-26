import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  CalendarDays,
  ChartNoAxesCombined,
  CircleGauge,
  Flower2,
  Sparkles,
} from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/lib/theme';
import { useFinanceStore } from '@/lib/store';
const meta: Record<string, { label: string; Icon: typeof CalendarDays }> = {
  index: { label: 'Today', Icon: CalendarDays },
  picture: { label: 'Picture', Icon: ChartNoAxesCombined },
  goals: { label: 'Goals', Icon: Flower2 },
  predict: { label: 'Predict', Icon: CircleGauge },
};
export function TabBar({ state, navigateToTab, emitter }: any) {
  const insets = useSafeAreaInsets();
  const openSheet = useFinanceStore((x) => x.openSheet);
  const press = (key: string, focused: boolean) => {
    Haptics.selectionAsync();
    const event = emitter.emit({
      type: 'tabPress',
      target: key,
      canPreventDefault: true,
    });
    if (!focused && !event.defaultPrevented) navigateToTab(key);
  };
  const item = (route: any) => {
    const focused = state.routes[state.index].key === route.key,
      { label, Icon } = meta[route.name];
    return (
      <Pressable
        key={route.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        onPress={() => press(route.key, focused)}
        style={s.item}
      >
        <Icon color={focused ? colors.ink : colors.muted} size={21} />
        <Text style={[s.label, focused && s.active]}>{label}</Text>
        {focused && <View style={s.activeDot} />}
      </Pressable>
    );
  };
  return (
    <BlurView
      intensity={55}
      tint="light"
      style={[
        s.bar,
        { height: 68 + insets.bottom, paddingBottom: insets.bottom },
      ]}
    >
      {state.routes.slice(0, 2).map(item)}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="What if"
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          openSheet('whatif');
        }}
        style={s.item}
      >
        <View style={s.orb}>
          <Sparkles color="white" />
        </View>
        <Text style={s.label}>What if</Text>
      </Pressable>
      {state.routes.slice(2).map(item)}
    </BlurView>
  );
}
const s = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: 'white',
    overflow: 'visible',
  },
  item: {
    flex: 1,
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  label: { fontFamily: 'Inter_700Bold', fontSize: 9, color: colors.muted },
  active: { color: colors.ink },
  activeDot: {
    position: 'absolute',
    bottom: 2,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.pink,
  },
  orb: {
    width: 58,
    height: 58,
    borderRadius: 30,
    backgroundColor: colors.pink,
    borderWidth: 5,
    borderColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -28,
    shadowColor: colors.pink,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 7,
  },
});
