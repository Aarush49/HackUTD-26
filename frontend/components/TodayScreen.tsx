import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ChevronRight, Newspaper } from 'lucide-react-native';
import { money } from '@/lib/finance/data';
import { useFinanceStore } from '@/lib/store';
import { colors } from '@/lib/theme';
import { BigNumber, Card, Eyebrow } from './ui';
import { ScreenShell, ScreenIntro, ProgressRing } from './screens';
import { MotionReveal } from './MotionReveal';

export function TodayScreen() {
  const { data, selectGoal, loadFailed } = useFinanceStore();
  const goal = data.goals[0];
  return (
    <ScreenShell>
      <ScreenIntro
        eyebrow="QUICK SUMMARY"
        title={`Hello, ${data.profile.name}`}
      />
      <MotionReveal beat="second">
        <Card>
          <Eyebrow>NET POSITION · ESTIMATED</Eyebrow>
          <BigNumber>
            {loadFailed
              ? 'Unavailable'
              : money(data.picture.periods.Month.netPosition)}
          </BigNumber>
        </Card>
      </MotionReveal>
      <MotionReveal beat="third">
        <Pressable onPress={() => selectGoal(goal.id)}>
          <Card style={{ marginTop: 18 }}>
            <View style={s.between}>
              <View style={{ flex: 1 }}>
                <Eyebrow>NEXT GOAL</Eyebrow>
                <Text style={s.serif}>{goal.title}</Text>
                <Text style={s.small}>ETA · {goal.eta}</Text>
                <Text style={s.sub}>
                  {money(goal.saved)} of {money(goal.target)}
                </Text>
              </View>
              <ProgressRing
                progress={goal.saved === undefined ? undefined : goal.growth}
              />
            </View>
          </Card>
        </Pressable>
      </MotionReveal>
      <Pressable
        onPress={() =>
          router.push({
            pathname: '/impact',
            params: { headline: data.today.headline },
          })
        }
      >
        <Card style={{ marginTop: 18 }}>
          <View style={s.row}>
            <View style={s.icon}>
              <Newspaper color={colors.ink} />
            </View>
            <View style={{ flex: 1 }}>
              <Eyebrow>IN THE NEWS</Eyebrow>
              <Text style={s.strong}>{data.today.headline}</Text>
              <Text style={s.small}>
                See the estimated effect on your rates and goals.
              </Text>
            </View>
            <ChevronRight color={colors.ink} />
          </View>
        </Card>
      </Pressable>
      <Card style={{ marginTop: 18 }}>
        <Eyebrow>WHERE YOU MIGHT LOSE MONEY</Eyebrow>
        <Text style={s.serif}>{data.losses[0].title}</Text>
        <Text style={s.strong}>
          {money(data.losses[0].minimum)}–{money(data.losses[0].maximum)}{' '}
          estimated
        </Text>
        <Text style={s.small}>{data.losses[0].reason}</Text>
      </Card>
    </ScreenShell>
  );
}

const s = StyleSheet.create({
  between: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 21,
    color: colors.muted,
    marginTop: 8,
  },
  serif: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 21,
    color: colors.ink,
    marginVertical: 5,
  },
  strong: { fontFamily: 'Inter_700Bold', fontSize: 12, color: colors.ink },
  small: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    lineHeight: 16,
    color: colors.muted,
  },
  icon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: colors.pale,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
