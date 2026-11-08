import { Children, ReactNode, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowRight, ChevronRight, CircleDollarSign, Landmark, Newspaper, Sparkles, TrendingUp, WalletCards, Wrench } from "lucide-react-native";
import Svg, { Circle } from "react-native-svg";
import Animated, { FadeIn, LinearTransition } from "react-native-reanimated";
import { useFinanceStore } from "@/lib/store";
import { colors } from "@/lib/theme";
import { Badge, BalanceAreaChart, BigNumber, Button3D, Card, ChunkySlider, Eyebrow, Heading, LineChartWithNodes, SegmentedPill, StatTile, TrustTag } from "./ui";
import { GardenLayer, Sapling } from "./garden";
import { SkyBackground } from "./Background";

const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

function ScreenShell({ children }: { children: ReactNode }) {
  return (
    <SkyBackground>
      <GardenLayer />
      <ScrollView
        contentContainerStyle={s.screen}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.headerSpacer} />
        {children}
      </ScrollView>
    </SkyBackground>
  );
}

function ScreenIntro({ eyebrow, title, accent, sub }: { eyebrow: string; title: string; accent: string; sub?: string }) {
  return <View style={{ marginBottom: 20 }}><View style={s.between}><Eyebrow>{eyebrow}</Eyebrow><TrustTag/></View>
    <Heading accent={accent}>{title}</Heading>{sub && <Text style={s.sub}>{sub}</Text>}
  </View>;
}

function ProgressRing({ progress }: { progress: number }) {
  const value = Math.max(0, Math.min(1, progress));
  const radius = 25, circumference = 2 * Math.PI * radius;
  return <View style={s.ring}><Svg width="62" height="62" viewBox="0 0 62 62">
    <Circle cx="31" cy="31" r={radius} fill="rgba(255,255,255,.72)" stroke={colors.pale} strokeWidth="6"/>
    <Circle cx="31" cy="31" r={radius} fill="none" stroke={colors.pink} strokeWidth="6" strokeLinecap="round"
      strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={circumference * (1 - value)} rotation="-90" origin="31,31"/>
  </Svg><Text style={s.ringText}>{Math.round(value * 100)}%</Text></View>;
}

export function TodayScreen() {
  const { data, selectGoal } = useFinanceStore();
  const goal = data.goals[0];
  return <ScreenShell>
    <ScreenIntro eyebrow={data.profile.todayLabel} title="Good morning," accent={`${data.profile.name}.`} sub="Your plans are taking root."/>
    <Pressable onPress={() => selectGoal(goal.id)}><Card><View style={s.between}><View style={{ flex: 1 }}>
      <Eyebrow>NEXT GOAL</Eyebrow><Text style={s.serif}>{goal.title}</Text><Text style={s.small}>ETA · {goal.eta}</Text>
      <Text style={s.sub}>{money(goal.saved)} of {money(goal.target)}</Text>
    </View><ProgressRing progress={goal.growth}/></View></Card></Pressable>
    <View style={{ alignItems: "flex-start", marginTop: 14 }}><Badge tone="green">Garden grew {data.today.gardenDelta}% this week</Badge></View>
    <Title eyebrow="NEXT 30 DAYS">Cash, in motion.</Title>
    <Card>{data.today.timeline.map((event, index) => <View key={`${event.day}-${event.label}`} style={s.timeline}>
      <View style={[s.timelineDot, { backgroundColor: event.kind === "good" ? colors.green : event.kind === "low" ? colors.amber : colors.pink }]}/>
      <View style={{ flex: 1 }}><Text style={s.mini}>{event.day}</Text><Text style={s.strong}>{event.label}</Text></View>
      <Text style={[s.strong, event.amount < 0 && { color: colors.danger }]}>{event.kind === "low" ? `${money(event.amount)} left` : `${event.amount > 0 ? "+" : ""}${money(event.amount)}`}</Text>
      {index < data.today.timeline.length - 1 && <View style={s.timelineLine}/>} </View>)}</Card>
    <Pressable onPress={() => router.push({ pathname: "/impact", params: { headline: data.today.headline } })}><Card style={{ marginTop: 18 }}><View style={s.row}>
      <View style={s.icon}><Newspaper color={colors.ink}/></View><View style={{ flex: 1 }}><Eyebrow>IN THE NEWS</Eyebrow>
        <Text style={s.strong}>{data.today.headline}</Text><Text style={s.small}>See the estimated effect on your rates and goals.</Text>
      </View><ChevronRight color={colors.ink}/></View></Card></Pressable>
  </ScreenShell>;
}

export function PictureScreen() {
  const { data, period, setPeriod } = useFinanceStore();
  const picture = data.picture, selected = picture.periods[period];
  const groups = [...new Set(picture.accounts.map(account => account.kind))];
  return <ScreenShell>
    <ScreenIntro eyebrow="THE WHOLE PICTURE" title="Your money," accent="together." sub="Assets, debts and momentum—without the noise."/>
    <SegmentedPill options={["Week", "Month", "Year"] as const} value={period} onChange={setPeriod}/>
    <Card><Eyebrow>NET POSITION · ESTIMATED</Eyebrow><View style={s.between}><BigNumber>{money(selected.netPosition)}</BigNumber><Badge tone="green">↗ {selected.change}%</Badge></View>
      <LineChartWithNodes key={period} data={selected.chart} lines={[{ key: "value", color: colors.ink }, { key: "projected", color: colors.pink, dashed: true }]}/>
      <Text style={s.small}>Solid history · dotted projection · {period.toLowerCase()} view</Text></Card>
    <View style={s.stats}><StatTile label="RUNWAY" value={picture.health.runway}/><StatTile label="CUSHION" value={money(picture.health.cushion)} tone="green"/></View>
    <StatTile label="INTEREST DRAG" value={`${money(picture.health.interestDrag)}/yr`} tone="amber"/>
    <Title eyebrow="ACCOUNTS">Where it lives.</Title><Card>{groups.map(group => <View key={group} style={s.group}><Text style={s.serif}>{group}</Text>
      {picture.accounts.filter(account => account.kind === group).map(account => <View key={account.id} style={s.account}>
        <View style={s.smallIcon}>{group === "Loans" ? <Landmark color={colors.ink} size={17}/> : group === "Credit" ? <WalletCards color={colors.ink} size={17}/> : <CircleDollarSign color={colors.ink} size={17}/>}</View>
        <View style={{ flex: 1 }}><Text style={s.strong}>{account.name}</Text>{account.rate && <Text style={s.mini}>{account.rate}% estimated rate</Text>}</View>
        <Text style={[s.strong, account.balance < 0 && { color: colors.danger }]}>{money(account.balance)}</Text>
      </View>)}</View>)}</Card>
  </ScreenShell>;
}

function ShockPanel() {
  const { data, shock, applyShock, clearShock } = useFinanceStore();
  const active = data.shocks.find(item => item.id === shock);
  return <>
    <Title eyebrow="HYPOTHETICAL SHOCKS">Where does it bend?</Title>
    <View style={s.shocks}>{data.shocks.map(item => <Pressable key={item.id} onPress={() => shock === item.id ? clearShock() : applyShock(item.id)} style={[s.shock, shock === item.id && s.shockActive]}>
      <Wrench size={19} color={colors.ink}/><Text style={s.strong}>{item.title}</Text><Text style={s.serif}>{money(item.amount)}</Text><Text style={s.mini}>{item.detail}</Text>
    </Pressable>)}</View>
    {active && <Animated.View entering={FadeIn} layout={LinearTransition}><Card style={{ marginTop: 18 }}><Eyebrow>FUNDING WATERFALL</Eyebrow><Text style={s.serif}>{money(active.amount)} comes from…</Text>
      {data.waterfall.map((source, index) => <View key={source.name} style={{ marginTop: 12 }}><View style={s.between}><Text style={s.strong}>{index + 1}. {source.name}</Text><Text style={s.strong}>{money(source.amount)}</Text></View>
        <View style={s.track}><View style={{ width: `${Math.min(100, source.amount / active.amount * 100)}%`, height: 8, borderRadius: 8, backgroundColor: source.color }}/></View><Text style={s.mini}>{source.cost}</Text></View>)}
      <Text style={s.small}>All costs and timing are estimated.</Text></Card></Animated.View>}
  </>;
}

function SimulationPanel() {
  const { data, sim, setSim } = useFinanceStore();
  const plans = data.simulate.plans;
  const chart = plans[0].points.map((point, index) => Object.fromEntries([["label", point.label], ...plans.map(plan => [plan.name,
    Math.round((plan.points[index].value ?? 0) * (sim.monthly / data.simulate.monthly) * (1 + (sim.rate - data.simulate.rate) / 100 * index / 5))])])) as Record<string, unknown>[];
  return <><Card><View style={s.between}><View><Eyebrow>LONG-RUN BALANCE</Eyebrow><Text style={s.serif}>Three paths, one horizon.</Text></View><Badge>Estimated</Badge></View>
    <BalanceAreaChart data={chart} plans={plans}/><Text style={s.small}>{plans.map(plan => plan.name).join(" · ")}</Text></Card>
    <Card style={{ marginTop: 16 }}><ChunkySlider label="Monthly amount" value={sim.monthly} min={100} max={1800} step={50} suffix=" / mo" onChange={value => setSim("monthly", value)}/>
      <ChunkySlider label="Years" value={sim.years} min={2} max={20} suffix=" yr" onChange={value => setSim("years", value)}/>
      <ChunkySlider label="Estimated return" value={sim.rate} min={2} max={12} step={.5} suffix="%" onChange={value => setSim("rate", value)}/></Card><Advice/></>;
}

export function PredictScreen() {
  const { predictMode, setPredictMode } = useFinanceStore();
  return <ScreenShell><ScreenIntro eyebrow="LOOK AHEAD" title="Make uncertainty" accent="useful." sub="Stress test today, or sketch a longer tomorrow."/>
    <SegmentedPill options={["shocks", "simulate"] as const} value={predictMode} onChange={setPredictMode}/>
    {predictMode === "shocks" ? <ShockPanel/> : <SimulationPanel/>}</ScreenShell>;
}

export function GoalsScreen() {
  const { data, selectGoal } = useFinanceStore();
  return <ScreenShell><ScreenIntro eyebrow="GROW WITH INTENTION" title="Goals with" accent="roots." sub="Every contribution helps something take shape."/>
    {data.goals.map(goal => <Pressable key={goal.id} onPress={() => selectGoal(goal.id)}><Card style={{ marginBottom: 13 }}><View style={s.row}>
      <View style={{ flex: 1 }}><Eyebrow>ETA · {goal.eta}</Eyebrow><Text style={s.serif}>{goal.title}</Text><Text style={s.small}>{money(goal.saved)} of {money(goal.target)}</Text></View>
      <Sapling goal={goal} compact onPress={() => selectGoal(goal.id)}/><ProgressRing progress={goal.growth}/></View></Card></Pressable>)}<Advice/>
  </ScreenShell>;
}

export function ImpactScreen() {
  const { data } = useFinanceStore();
  const params = useLocalSearchParams<{ headline?: string }>();
  const [headline, setHeadline] = useState(params.headline ?? data.impact.active);
  const [input, setInput] = useState("");
  return <ScreenShell><ScreenIntro eyebrow="HEADLINE IMPACT" title="News, translated to" accent="you." sub="A plain-language estimate—not a prediction."/>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 14 }}>{data.impact.headlines.map(item => <Pressable key={item} onPress={() => setHeadline(item)}><Badge tone={headline === item ? "pink" : "blue"}>{item}</Badge></Pressable>)}</ScrollView>
    <Card><Eyebrow>PASTE A HEADLINE</Eyebrow><View style={[s.row, { marginTop: 10 }]}><TextInput accessibilityLabel="Paste a headline" value={input} onChangeText={setInput} placeholder="Paste a headline…" style={s.input}/>
      <Button3D ariaLabel="Use headline" onClick={() => input.trim() && setHeadline(input.trim())}><Sparkles color="white"/></Button3D></View></Card>
    <Title eyebrow="WHAT THIS MEANS FOR YOU">Small shifts, shown honestly.</Title><Card>{data.impact.rows.map(row => <View key={row.label} style={s.impact}>
      <View style={{ flex: 1 }}><Text style={s.strong}>{row.label}</Text><Text style={s.mini}>{row.range}</Text></View><Text style={s.small}>{row.before}</Text><ArrowRight size={14} color={colors.muted}/><Text style={s.strong}>{row.after}</Text>
    </View>)}</Card><Card style={{ marginTop: 16 }}><View style={s.row}><TrendingUp color={colors.ink}/><Text style={[s.small, { flex: 1 }]}>These ranges are estimates based on the selected demo headline: {headline}.</Text></View></Card><Advice/>
  </ScreenShell>;
}

function Title({ eyebrow, children }: { eyebrow: string; children: ReactNode }) { return <View style={{ marginTop: 24, marginBottom: 10 }}><Eyebrow>{eyebrow}</Eyebrow><Text style={s.title}>{children}</Text></View>; }
function Advice() { return <Text style={s.advice}>Informational, not financial advice.</Text>; }

const s = StyleSheet.create({
  screen: { paddingHorizontal: 16, paddingBottom: 130 }, headerSpacer: { height: 72 }, fixedHeader: { position: "absolute", top: 64, left: 16, right: 16, zIndex: 2 },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }, row: { flexDirection: "row", alignItems: "center", gap: 12 },
  sub: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 21, color: colors.muted, marginTop: 8 }, title: { fontFamily: "Fraunces_600SemiBold", fontSize: 27, color: colors.ink, marginTop: 4 },
  serif: { fontFamily: "Fraunces_600SemiBold", fontSize: 21, color: colors.ink, marginVertical: 5 }, strong: { fontFamily: "Inter_700Bold", fontSize: 12, color: colors.ink }, small: { fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 16, color: colors.muted }, mini: { fontFamily: "Inter_400Regular", fontSize: 9, color: colors.muted, letterSpacing: .4 },
  ring: { width: 62, height: 62, alignItems: "center", justifyContent: "center" }, ringText: { position: "absolute", fontFamily: "Inter_700Bold", fontSize: 11, color: colors.ink },
  timeline: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: 10 }, timelineDot: { width: 11, height: 11, borderRadius: 6, borderWidth: 2, borderColor: "white", zIndex: 2 }, timelineLine: { position: "absolute", left: 5, top: 38, height: 40, borderLeftWidth: 2, borderStyle: "dotted", borderColor: "rgba(11,58,91,.18)" },
  icon: { width: 46, height: 46, borderRadius: 16, backgroundColor: colors.pale, alignItems: "center", justifyContent: "center" }, stats: { flexDirection: "row", gap: 9, marginTop: 12, marginBottom: 9 }, group: { paddingVertical: 12, borderBottomWidth: 1, borderColor: "rgba(11,58,91,.09)" }, account: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 }, smallIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.pale, alignItems: "center", justifyContent: "center" },
  shocks: { flexDirection: "row", gap: 8 }, shock: { flex: 1, minHeight: 128, padding: 10, borderRadius: 20, borderWidth: 1, borderColor: "white", backgroundColor: "rgba(255,255,255,.66)", gap: 5 }, shockActive: { borderWidth: 2, borderColor: colors.pink, backgroundColor: "#FFF1F8" }, track: { height: 8, borderRadius: 8, backgroundColor: "#E5EDF0", overflow: "hidden", marginVertical: 6 },
  input: { flex: 1, minHeight: 48, borderWidth: 1, borderColor: "#CDE4EE", borderRadius: 15, paddingHorizontal: 13, fontFamily: "Inter_400Regular", color: colors.ink }, impact: { minHeight: 62, flexDirection: "row", alignItems: "center", gap: 7, borderBottomWidth: 1, borderColor: "rgba(11,58,91,.1)" }, advice: { fontFamily: "Inter_400Regular", textAlign: "center", fontSize: 9, color: colors.muted, margin: 20 },
});
