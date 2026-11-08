import React, { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  router,
  useFocusEffect,
  useLocalSearchParams,
  useSegments,
} from 'expo-router';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Landmark,
  Newspaper,
  Sparkles,
  TrendingUp,
  WalletCards,
} from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { impactRows, money, simulationChart } from '@/lib/finance/data';
import { useFinanceStore } from '@/lib/store';
import { colors } from '@/lib/theme';
import {
  Badge,
  BalanceAreaChart,
  BigNumber,
  Button3D,
  Card,
  Eyebrow,
  Heading,
  LineChartWithNodes,
  SegmentedPill,
  StatTile,
} from './ui';
import { GardenLayer, Sapling } from './garden';
import { SkyBackground } from './Background';
import { BrandHeader } from './BrandHeader';
import { PersonalNews } from './PersonalNews';
import { MotionReveal } from './MotionReveal';

export function ScreenShell({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  const insideTabs = segments[0] === '(tabs)';
  const titleTop = insets.top + 116;
  return (
    <SkyBackground>
      <GardenLayer />
      {!insideTabs && (
        <View style={[s.standaloneHeader, { top: insets.top + 10 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)');
              }
            }}
            style={s.backPill}
          >
            <ChevronLeft size={18} color={colors.ink} />
            <Text style={s.backPillText}>Back</Text>
          </Pressable>
          <BrandHeader compact />
        </View>
      )}
      <ScrollView
        style={s.scroller}
        contentContainerStyle={[
          s.screen,
          {
            paddingTop: titleTop,
            paddingBottom: insets.bottom + 104,
          },
        ]}
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </SkyBackground>
  );
}

export function ScreenIntro({
  eyebrow,
  title,
  accent,
  sub,
}: {
  eyebrow?: string;
  title: string;
  accent?: string;
  sub?: string;
}) {
  return (
    <MotionReveal style={{ marginBottom: 20 }}>
      {eyebrow ? (
        <View style={s.between}>
          <Eyebrow>{eyebrow}</Eyebrow>
        </View>
      ) : null}
      <Heading accent={accent}>{title}</Heading>
      {sub && <Text style={s.sub}>{sub}</Text>}
    </MotionReveal>
  );
}

export function ProgressRing({ progress }: { progress?: number }) {
  const value = Math.max(0, Math.min(1, progress ?? 0));
  const radius = 25,
    circumference = 2 * Math.PI * radius;
  return (
    <View style={s.ring}>
      <Svg width="62" height="62" viewBox="0 0 62 62">
        <Circle
          cx="31"
          cy="31"
          r={radius}
          fill="rgba(255,255,255,.72)"
          stroke={colors.pale}
          strokeWidth="6"
        />
        <Circle
          cx="31"
          cy="31"
          r={radius}
          fill="none"
          stroke={colors.pink}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - value)}
          transform="rotate(-90 31 31)"
        />
      </Svg>
      <Text style={s.ringText}>
        {progress === undefined ? '—' : `${Math.round(value * 100)}%`}
      </Text>
    </View>
  );
}

export function PictureScreen() {
  const { data, period, setPeriod } = useFinanceStore();
  const picture = data.picture,
    selected = picture.periods[period];
  const groups = [...new Set(picture.accounts.map((account) => account.kind))];
  return (
    <ScreenShell>
      <ScreenIntro
        eyebrow="THE WHOLE PICTURE"
        title="Your money,"
        accent="together."
        sub="Assets, debts and momentum—without the noise."
      />
      <MotionReveal beat="second">
        <SegmentedPill
          options={['Week', 'Month', 'Year'] as const}
          value={period}
          onChange={setPeriod}
        />
      </MotionReveal>
      <MotionReveal beat="third">
        <Card>
          <Eyebrow>PROJECTED NET POSITION</Eyebrow>
          <View style={s.between}>
            <BigNumber>{money(selected.projectedBalance)}</BigNumber>
            <Badge tone={(selected.change ?? 0) < 0 ? 'amber' : 'green'}>
              {selected.change === undefined
                ? '—'
                : `${selected.change > 0 ? '+' : ''}${selected.change}%`}
            </Badge>
          </View>
          <LineChartWithNodes
            key={period}
            data={selected.chart}
            lines={[
              { key: 'value', color: colors.ink },
              { key: 'projected', color: colors.pink, dashed: true },
            ]}
          />
          <Text style={s.small}>
            Solid history · dotted projection · {period.toLowerCase()} view
          </Text>
        </Card>
      </MotionReveal>
      <View style={s.stats}>
        <StatTile label="RUNWAY" value={picture.health.runway} />
        <StatTile
          label="CUSHION"
          value={money(picture.health.cushion)}
          tone="green"
        />
      </View>
      <StatTile
        label="INTEREST DRAG"
        value={
          picture.health.interestDrag === undefined
            ? '—'
            : `${money(picture.health.interestDrag)}/yr`
        }
        tone="amber"
      />
      <Title eyebrow="ACCOUNTS">Where it lives.</Title>
      <Card>
        {groups.map((group) => (
          <View key={group} style={s.group}>
            <Text style={s.serif}>{group}</Text>
            {picture.accounts
              .filter((account) => account.kind === group)
              .map((account) => (
                <View key={account.id} style={s.account}>
                  <View style={s.smallIcon}>
                    {group === 'Loans' ? (
                      <Landmark color={colors.ink} size={17} />
                    ) : group === 'Credit' ? (
                      <WalletCards color={colors.ink} size={17} />
                    ) : (
                      <CircleDollarSign color={colors.ink} size={17} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.strong}>{account.name}</Text>
                    {account.rate !== undefined && (
                      <Text style={s.mini}>{account.rate}% estimated rate</Text>
                    )}
                  </View>
                  <Text
                    style={[
                      s.strong,
                      account.balance !== undefined &&
                        account.balance < 0 && { color: colors.danger },
                    ]}
                  >
                    {money(account.balance)}
                  </Text>
                </View>
              ))}
          </View>
        ))}
      </Card>
    </ScreenShell>
  );
}

function PredictorPanel() {
  const { data } = useFinanceStore();
  return (
    <>
      <Title eyebrow="RANKED BY ESTIMATED COST">
        Where you might lose money.
      </Title>
      {data.losses.map((loss, index) => (
        <Card key={loss.id} style={{ marginBottom: 12 }}>
          <View style={s.lossRow}>
            <View style={s.lossRank}>
              <Text style={s.lossRankText}>{index + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.serif}>{loss.title}</Text>
              <Text style={s.strong}>
                {money(loss.minimum)}–{money(loss.maximum)} estimated
              </Text>
              <Text style={s.small}>{loss.reason}</Text>
              <Text style={s.lossAction}>Suggested action · {loss.action}</Text>
            </View>
          </View>
        </Card>
      ))}
    </>
  );
}

function SimulationPanel() {
  const { data, sim } = useFinanceStore();
  const { plans } = data.simulate;
  const chart = sim ? simulationChart(data.simulate, sim) : [];
  const final = chart.at(-1);
  return (
    <>
      <Card>
        <View style={s.between}>
          <View>
            <Eyebrow>LONG-RUN BALANCE</Eyebrow>
            <Text style={s.serif}>Three paths, one horizon.</Text>
          </View>
          <Badge>Estimated</Badge>
        </View>
        {chart.length > 0 ? (
          <BalanceAreaChart data={chart} plans={plans} />
        ) : (
          <View style={{ aspectRatio: 330 / 230 }} />
        )}
        <Text style={s.small}>
          {plans.map((plan) => plan.name).join(' · ')}
        </Text>
        <View style={s.finalBalances}>
          {plans.map((plan) => (
            <View key={plan.name} style={s.finalBalance}>
              <Text style={s.mini}>{plan.name.toUpperCase()}</Text>
              <Text style={s.strong}>
                {money(final ? Number(final[plan.name]) : undefined)} estimated
              </Text>
            </View>
          ))}
        </View>
      </Card>
    </>
  );
}

export function PredictScreen() {
  const { predictMode, setPredictMode } = useFinanceStore();
  return (
    <ScreenShell>
      <ScreenIntro
        eyebrow="LOOK AHEAD"
        title="Make uncertainty"
        accent="useful."
        sub="Stress test today, or sketch a longer tomorrow."
      />
      <MotionReveal beat="second">
        <SegmentedPill
          options={['news', 'predict', 'simulate'] as const}
          value={predictMode}
          onChange={setPredictMode}
        />
      </MotionReveal>
      <MotionReveal key={predictMode} beat="third">
        {predictMode === 'news' ? (
          <PersonalNews />
        ) : predictMode === 'predict' ? (
          <PredictorPanel />
        ) : (
          <SimulationPanel />
        )}
      </MotionReveal>
    </ScreenShell>
  );
}

export function GoalsScreen() {
  const { data, selectGoal, loadGoals } = useFinanceStore();
  const [loadFailed, setLoadFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      setLoadFailed(false);
      void loadGoals(controller.signal).catch(() => {
        if (!controller.signal.aborted) setLoadFailed(true);
      });
      return () => controller.abort();
    }, [loadGoals, retry])
  );
  return (
    <ScreenShell>
      <ScreenIntro
        eyebrow="GROW WITH INTENTION"
        title="Goals with"
        accent="roots."
        sub="Every contribution helps something take shape."
      />
      <MotionReveal beat="second" style={{ marginBottom: 13 }}>
        <Button3D onClick={() => router.push('/create-goal')}>
          Create a goal
        </Button3D>
      </MotionReveal>
      {loadFailed && (
        <Card style={{ marginBottom: 13 }}>
          <Text accessibilityRole="alert" style={s.small}>
            Could not load saved goals.
          </Text>
          <Button3D tone="white" onClick={() => setRetry((count) => count + 1)}>
            Retry
          </Button3D>
        </Card>
      )}
      {data.goals.map((goal) => (
        <Pressable key={goal.id} onPress={() => selectGoal(goal.id)}>
          <Card style={{ marginBottom: 13 }}>
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Eyebrow>ETA · {goal.eta}</Eyebrow>
                <Text style={s.serif}>{goal.title}</Text>
                <Text style={s.small}>
                  {money(goal.saved)} of {money(goal.target)}
                </Text>
              </View>
              <Sapling
                goal={goal}
                compact
                onPress={() => selectGoal(goal.id)}
              />
              <ProgressRing
                progress={goal.saved === undefined ? undefined : goal.growth}
              />
            </View>
          </Card>
        </Pressable>
      ))}
    </ScreenShell>
  );
}

export function ImpactScreen() {
  const { data, snapshot } = useFinanceStore();
  const params = useLocalSearchParams<{ headline?: string }>();
  const [headline, setHeadline] = useState(
    params.headline ?? data.impact.active
  );
  const [input, setInput] = useState('');
  return (
    <ScreenShell>
      <ScreenIntro
        eyebrow="HEADLINE IMPACT"
        title="News, translated to"
        accent="you."
        sub="A plain-language estimate—not a prediction."
      />
      <MotionReveal beat="second">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, marginBottom: 14 }}
        >
          {data.impact.headlines.map((item) => (
            <Pressable key={item} onPress={() => setHeadline(item)}>
              <Badge tone={headline === item ? 'pink' : 'blue'}>{item}</Badge>
            </Pressable>
          ))}
        </ScrollView>
      </MotionReveal>
      <Card>
        <Eyebrow>PASTE A HEADLINE</Eyebrow>
        <View style={[s.row, { marginTop: 10 }]}>
          <TextInput
            accessibilityLabel="Paste a headline"
            value={input}
            onChangeText={setInput}
            placeholder="Paste a headline…"
            style={s.input}
          />
          <Button3D
            ariaLabel="Use headline"
            onClick={() => input.trim() && setHeadline(input.trim())}
          >
            <Sparkles color="white" />
          </Button3D>
        </View>
      </Card>
      <Title eyebrow="WHAT THIS MEANS FOR YOU">
        Small shifts, shown honestly.
      </Title>
      <MotionReveal key={headline} beat="update">
        <Card>
          {impactRows(snapshot, headline).map((row) => (
            <View key={row.label} style={s.impact}>
              <View style={{ flex: 1 }}>
                <Text style={s.strong}>{row.label}</Text>
                <Text style={s.mini}>{row.range}</Text>
              </View>
              <Text style={s.small}>{row.before}</Text>
              <ArrowRight size={14} color={colors.muted} />
              <Text style={s.strong}>{row.after}</Text>
            </View>
          ))}
        </Card>
      </MotionReveal>
      <Card style={{ marginTop: 16 }}>
        <View style={s.row}>
          <TrendingUp color={colors.ink} />
          <Text style={[s.small, { flex: 1 }]}>
            These ranges are estimates.
          </Text>
        </View>
      </Card>
    </ScreenShell>
  );
}

function Title({
  eyebrow,
  children,
}: {
  eyebrow: string;
  children: ReactNode;
}) {
  return (
    <View style={{ marginTop: 24, marginBottom: 10 }}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <Text style={s.title}>{children}</Text>
    </View>
  );
}
const s = StyleSheet.create({
  screen: { paddingHorizontal: 16 },
  scroller: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  standaloneHeader: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#0B3A5B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  backPillText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: colors.ink,
  },
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
  title: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 27,
    color: colors.ink,
    marginTop: 4,
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
  mini: {
    fontFamily: 'Inter_400Regular',
    fontSize: 9,
    color: colors.muted,
    letterSpacing: 0.4,
  },
  ring: {
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringText: {
    position: 'absolute',
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: colors.ink,
  },
  icon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: colors.pale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stats: { flexDirection: 'row', gap: 9, marginTop: 12, marginBottom: 9 },
  group: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: 'rgba(11,58,91,.09)',
  },
  account: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  smallIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.pale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lossRow: { flexDirection: 'row', gap: 12 },
  lossRank: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.pale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lossRankText: { fontFamily: 'Inter_700Bold', color: colors.ink },
  lossAction: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    lineHeight: 16,
    color: colors.ink,
    marginTop: 8,
  },
  finalBalances: { marginTop: 12, gap: 7 },
  finalBalance: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#CDE4EE',
    borderRadius: 15,
    paddingHorizontal: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.ink,
  },
  impact: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderBottomWidth: 1,
    borderColor: 'rgba(11,58,91,.1)',
  },
});
