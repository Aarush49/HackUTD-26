import { Children, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowRight, ChevronRight, CircleDollarSign, Landmark, Newspaper, ShieldCheck, Sparkles, TrendingUp, WalletCards, Wrench } from "lucide-react-native";
import { api, displayDate, money, number, runwayLabel } from "@/lib/api";
import type { Account, HeadlineAnalysis, Risk, Simulation } from "@/lib/api";
import { goalViews, headlineExamples, shockPresets, useFinanceStore } from "@/lib/store";
import { colors } from "@/lib/theme";
import { Badge, BalanceAreaChart, BigNumber, Button3D, Card, ChunkySlider, Eyebrow, Heading, LineChartWithNodes, SegmentedPill, StatTile, TrustTag } from "./ui";
import { GardenLayer, Sapling } from "./garden";
import { SkyBackground } from "./Background";
import { ScenarioResponse } from "./ScenarioResponse";

function ScreenShell({ children }: { children?: ReactNode }) {
  const { status, error, load } = useFinanceStore();
  useEffect(() => { void load(); }, [load]);
  const items = Children.toArray(children);
  const ready = status === "ready";
  return <SkyBackground><GardenLayer/>{ready && items[0] ? <View style={s.fixedHeader}>{items[0]}</View> : null}<ScrollView contentContainerStyle={s.screen} showsVerticalScrollIndicator={false}>
    {ready ? items.slice(1) : status === "error" ?
      <Card><Eyebrow>FINANCIAL DATA UNAVAILABLE</Eyebrow><Text accessibilityRole="alert" style={s.sub}>{error}</Text>
        <Button3D onClick={() => void load(true)}>Retry connection</Button3D>
      </Card> : <Card><ActivityIndicator color={colors.ink}/><Text style={s.sub}>Loading Nessie data…</Text></Card>}
  </ScrollView></SkyBackground>;
}

function ScreenIntro({ eyebrow, title, accent, sub }: { eyebrow: string; title: string; accent: string; sub?: string }) {
  return <View style={{marginBottom:20}}><View style={s.between}><Eyebrow>{eyebrow}</Eyebrow><TrustTag/></View>
    <Heading accent={accent}>{title}</Heading>{sub && <Text style={s.sub}>{sub}</Text>}
  </View>;
}

function runwayDetail(risk: Risk | null, error?: string | null) {
  if (error) return error;
  if (!risk) return "Calculating from your Nessie profile…";
  if (risk.first_shortfall_date) return `The monthly forecast shows a cash shortfall by ${displayDate(risk.first_shortfall_date)}.`;
  return risk.status === "no_shortfall_within_horizon" ? `No cash shortfall over ${risk.monthly.length - 1} months.` :
    risk.missing_requirements[0] ?? "The forecast is incomplete.";
}

export function TodayScreen() {
  const { dashboard, baseline, baselineError } = useFinanceStore();
  if (!dashboard) return <ScreenShell/>;
  const start = dashboard.data_completeness.retrieved_at.slice(0, 10);
  const end = new Date(Date.parse(start) + 30 * 86400000).toISOString().slice(0, 10);
  const bills = dashboard.bills.flatMap(bill => {
    const due = bill.upcoming_payment_date ?? bill.payment_date;
    return due && due >= start && due <= end && ["recurring", "pending"].includes(bill.status?.toLowerCase() ?? "")
      ? [{ ...bill, due }] : [];
  }).sort((a, b) => a.due.localeCompare(b.due));
  return <ScreenShell>
    <ScreenIntro eyebrow={displayDate(start, {weekday:"long",month:"long",day:"numeric"}).toUpperCase()}
      title="Good morning," accent={`${dashboard.customer.first_name || "there"}.`}/>
    <Card><Eyebrow>YOUR FIRST BREAKING POINT</Eyebrow><BigNumber>{runwayLabel(baseline)}</BigNumber>
      <Text style={s.sub}>{runwayDetail(baseline, baselineError)}</Text>
      <Pressable style={s.link} onPress={() => router.push("/(tabs)/predict")}>
        <Text style={s.linkText}>See what could change it</Text><ArrowRight size={15} color={colors.ink}/>
      </Pressable>
    </Card>
    <Title eyebrow="NEXT 30 DAYS">Cash, in motion.</Title>
    <Card>{bills.length === 0 && <Text style={s.sub}>Nessie has no dated bills for the next 30 days.</Text>}
      {bills.map((bill, index) => {
        const amount = number(bill.amount);
        return <View key={bill.id} style={s.timeline}>
          <View style={[s.timelineDot, {backgroundColor:colors.pink}]}/><View style={{flex:1}}>
            <Text style={s.mini}>{displayDate(bill.due)}</Text><Text style={s.strong}>{bill.payee || bill.nickname || "Bill"}</Text>
          </View><Text style={[s.strong,{color:colors.danger}]}>{money(amount === null ? null : -amount)}</Text>
          {index < bills.length - 1 && <View style={s.timelineLine}/>}
        </View>;
      })}
    </Card>
    <Pressable onPress={() => router.push({ pathname: "/impact", params: { headline: headlineExamples[0] } })}><Card style={{marginTop:18}}><View style={s.row}>
      <View style={s.icon}><Newspaper color={colors.ink}/></View><View style={{flex:1}}><Eyebrow>EXAMPLE HEADLINE</Eyebrow>
        <Text style={s.strong}>{headlineExamples[0]}</Text><Text style={s.small}>Explore how a headline could affect you.</Text>
      </View><ChevronRight color={colors.ink}/>
    </View></Card></Pressable>
  </ScreenShell>;
}

export function PictureScreen() {
  const { dashboard, baseline, baselineError, period, setPeriod } = useFinanceStore();
  if (!dashboard) return <ScreenShell/>;
  const accounts = dashboard.accounts.map(account => {
    const balance = number(account.balance);
    return { id: account.id, kind: account.type, name: account.nickname || account.type,
      balance: account.type.toLowerCase() === "credit card" && balance !== null ? -balance : balance };
  });
  for (const debt of dashboard.debts) {
    if (debt.kind.toLowerCase() === "credit card") continue;
    const balance = number(debt.balance);
    accounts.push({ id: debt.id, kind: "Loans", name: debt.kind, balance: balance === null ? null : -balance });
  }
  const groups = [...new Set(accounts.map(account => account.kind))];
  const current = number(dashboard.known_account_net_worth);
  const months = period === "Year" ? 12 : period === "Month" ? 1 : 0;
  const monthly = baseline?.monthly.slice(1, months + 1) ?? [];
  const chart = [{ label: "Now", value: current, projected: number(baseline?.monthly[0]?.known_account_net_worth) },
    ...monthly.map(row => ({ label: displayDate(row.date, {month:"short"}), value: null, projected: number(row.known_account_net_worth) }))];
  const interest = baseline?.monthly.slice(1, 13).map(row => number(row.interest_paid));
  const annualInterest = interest?.length === 12 && interest.every(value => value !== null) &&
    !baseline?.missing_requirements.length ? interest.reduce((sum, value) => sum + value, 0) : null;
  return <ScreenShell>
    <ScreenIntro eyebrow="THE WHOLE PICTURE" title="Your money," accent="together." sub="Balances and projections for known Nessie accounts."/>
    <SegmentedPill options={["Week","Month","Year"] as const} value={period} onChange={setPeriod}/>
    <Card><Eyebrow>KNOWN NET POSITION</Eyebrow><BigNumber>{money(current)}</BigNumber>
      {chart.some(row => row.value !== null || row.projected !== null) &&
        <LineChartWithNodes key={period} data={chart} lines={[{key:"value",color:colors.ink},{key:"projected",color:colors.pink,dashed:true}]}/>}
      <Text style={s.small}>{period === "Week" ? "Projections are monthly." :
        baselineError ?? baseline?.missing_requirements[0] ?? (baseline ? "Current balance and available monthly projection." : "Loading projection…")}</Text>
    </Card>
    <View style={s.stats}><StatTile label="RUNWAY" value={runwayLabel(baseline)}/>
      <StatTile label="CUSHION" value={money(dashboard.liquid_reserves)} tone="green"/></View>
    <StatTile label="INTEREST DRAG" value={annualInterest === null ? "Unavailable" : `${money(annualInterest)}/yr`} tone="amber"/>
    <Title eyebrow="ACCOUNTS">Where it lives.</Title>
    <Card>{groups.length === 0 && <Text style={s.sub}>No Nessie accounts were returned for this customer.</Text>}
      {groups.map(group => <View key={group} style={s.group}><Text style={s.serif}>{group}</Text>
        {accounts.filter(account => account.kind === group).map(account => <View key={account.id} style={s.account}>
          <View style={s.smallIcon}>{group === "Loans" ? <Landmark color={colors.ink} size={17}/> :
            group.toLowerCase() === "credit card" ? <WalletCards color={colors.ink} size={17}/> : <CircleDollarSign color={colors.ink} size={17}/>}</View>
          <View style={{flex:1}}><Text style={s.strong}>{account.name}</Text></View>
          <Text style={[s.strong, account.balance !== null && account.balance < 0 && {color:colors.danger}]}>{money(account.balance)}</Text>
        </View>)}
      </View>)}
    </Card>
  </ScreenShell>;
}

function StressTest({ customerId }: { customerId: string }) {
  const { baseline, baselineError, shock, applyShock } = useFinanceStore();
  const active = shockPresets.find(preset => preset.id === shock);
  const [test, setTest] = useState<{ id: string; result?: Risk; error?: string } | null>(null);
  useEffect(() => {
    if (!active?.input) return;
    const controller = new AbortController();
    void api<Risk>("/risk/predict", { customer_id: customerId, shock: active.input }, controller.signal).then(
      result => { if (!controller.signal.aborted) setTest({ id: active.id, result }); },
      error => { if (!controller.signal.aborted) setTest({ id: active.id, error: error.message }); },
    );
    return () => controller.abort();
  }, [active, customerId]);
  const result = active ? (test?.id === active.id ? test.result ?? null : null) : baseline;
  const error = active ? (test?.id === active.id ? test.error : null) : baselineError;
  return <>
    <Card><View style={s.row}><View style={{flex:1}}><Eyebrow>FIRST BREAKING POINT</Eyebrow>
      <BigNumber>{runwayLabel(result)}</BigNumber><Text style={s.small}>{runwayDetail(result, error)}</Text>
    </View><ShieldCheck size={58} color={colors.sky}/></View></Card>
    <Title eyebrow="HYPOTHETICAL SHOCKS">Where does it bend?</Title>
    <View style={s.shocks}>{shockPresets.map(preset => <Pressable key={preset.id} disabled={!preset.input}
      onPress={() => { if (shock !== preset.id) { setTest(null); applyShock(preset.id); } }}
      style={[s.shock, shock === preset.id && s.shockActive]}>
      <Wrench size={19} color={colors.ink}/><Text style={s.strong}>{preset.title}</Text>
      <Text style={s.serif}>{preset.amount !== null ? money(preset.amount) : preset.input ? "2 months" : "Unavailable"}</Text>
      <Text style={s.mini}>{preset.detail}</Text>
    </Pressable>)}</View>
    {active?.input && <ScenarioResponse key={active.id} customerId={customerId}
      trigger={{ label: active.title, shock: active.input }}/>}
  </>;
}

const savingsPlans = [{name:"Baseline",color:"#94A3B8"},{name:"Save more",color:colors.sky}];

function SavingsSimulation({ customerId, savings }: { customerId: string; savings: Account | undefined }) {
  const { sim, setSim } = useFinanceStore();
  const savingsId = savings?.id;
  const key = `${customerId}:${savingsId}:${sim.monthly}:${sim.years}:${sim.rate}`;
  const [run, setRun] = useState<{ key: string; data?: Simulation; error?: string } | null>(null);
  useEffect(() => {
    if (!savingsId) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void api<Simulation>("/simulate", {
        customer_id: customerId, horizon_months: sim.years * 12,
        assumptions: { account_rates: { [savingsId]: { apy: (sim.rate / 100).toFixed(4) } } },
        decision: { savings_account_id: savingsId, extra_monthly_savings: sim.monthly },
      }, controller.signal).then(
        data => { if (!controller.signal.aborted) setRun({ key, data }); },
        error => { if (!controller.signal.aborted) setRun({ key, error: error.message }); },
      );
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [customerId, savingsId, key, sim.monthly, sim.years, sim.rate]);
  const result = run?.key === key ? run : null;
  const chart = result?.data?.baseline_projection.monthly.flatMap((row, index) => row.month % 12 === 0
    ? [{ label: row.month ? `${row.month / 12}y` : "Now", Baseline: number(row.liquid_balance),
      "Save more": number(result.data?.scenario_projection.monthly[index]?.liquid_balance) }] : []) ?? [];
  const hasForecast = chart.slice(1).some(row => row.Baseline !== null || row["Save more"] !== null);
  const message = !savingsId ? "A Nessie savings account with a known balance is needed." :
    result?.error ?? result?.data?.scenario_projection.missing_requirements[0] ??
    (result ? null : "Calculating savings paths…");
  return <>
    <Card><View style={s.between}><View><Eyebrow>LONG-RUN LIQUID BALANCE</Eyebrow>
      <Text style={s.serif}>Two paths, one horizon.</Text></View><Badge>Estimated</Badge>
    </View>{hasForecast && <><BalanceAreaChart data={chart} plans={savingsPlans}/><Text style={s.small}>Baseline · Save more</Text></>}
      {message && <Text style={s.sub}>{message}</Text>}
      {savings && <Text style={s.small}>The selected APY applies to both paths for {savings.nickname || "your savings account"}.</Text>}
    </Card>
    <Card style={{marginTop:16}}>
      <ChunkySlider label="Monthly savings amount" value={sim.monthly} min={100} max={1800} step={50} suffix=" / mo" onChange={value => setSim("monthly", value)}/>
      <ChunkySlider label="Years" value={sim.years} min={2} max={20} suffix=" yr" onChange={value => setSim("years", value)}/>
      <ChunkySlider label="Assumed savings APY" value={sim.rate} min={2} max={12} step={.5} suffix="%" onChange={value => setSim("rate", value)}/>
    </Card><Advice/>
  </>;
}

export function PredictScreen() {
  const { dashboard, predictMode, setPredictMode } = useFinanceStore();
  if (!dashboard) return <ScreenShell/>;
  const savings = dashboard.accounts.find(account => account.type.toLowerCase() === "savings" && number(account.balance) !== null);
  return <ScreenShell>
    <ScreenIntro eyebrow="LOOK AHEAD" title="Make uncertainty" accent="useful." sub="Stress test today, or sketch a longer tomorrow."/>
    <SegmentedPill options={["break","simulate"] as const} value={predictMode} onChange={setPredictMode}/>
    {predictMode === "break" ? <StressTest customerId={dashboard.customer.id}/> :
      <SavingsSimulation customerId={dashboard.customer.id} savings={savings}/>}
  </ScreenShell>;
}

export function GoalsScreen() {
  const { dashboard, baseline, selectGoal } = useFinanceStore();
  const goals = goalViews(dashboard, baseline);
  return <ScreenShell>
    <ScreenIntro eyebrow="GROW WITH INTENTION" title="Goals with" accent="roots."/>
    {goals.length === 0 && <Card><Text style={s.sub}>No saved goals for this customer.</Text></Card>}
    {goals.map(goal => {
      const percent = goal.growth === null ? null : Math.round(goal.growth * 100);
      const progress = Math.max(0, Math.min(100, percent ?? 0));
      return <Pressable key={goal.id} onPress={() => selectGoal(goal.id)}><Card style={{marginBottom:13}}>
        <View style={s.row}><View style={{flex:1}}><Eyebrow>ETA · {goal.eta}</Eyebrow><Text style={s.serif}>{goal.title}</Text>
          <Text style={s.small}>{money(goal.saved)} of {money(goal.target)}</Text>
          <View style={s.track}><View style={{width:`${progress}%`,height:8,borderRadius:8,backgroundColor:colors.pink}}/></View>
          <Badge tone={progress > 60 ? "green" : "blue"}>{percent === null ? "Progress unavailable" : `${percent}% grown`}</Badge>
        </View><Sapling goal={goal} compact onPress={() => selectGoal(goal.id)}/></View>
      </Card></Pressable>;
    })}<Advice/>
  </ScreenShell>;
}

function impactRows(result: HeadlineAnalysis, accounts: Account[]) {
  const rows: { label: string; before: string; after: string; detail: string }[] = [];
  const percent = new Intl.NumberFormat("en-US", { style:"percent", maximumFractionDigits:3 });
  for (const item of result.affected_accounts) {
    const before = number(item.assumed_baseline_apy ?? item.assumed_baseline_apr);
    const after = number(item.adjusted_apy ?? item.adjusted_apr);
    const account = accounts.find(account => account.id === item.account_id);
    if (before !== null && after !== null) rows.push({ label: account?.nickname || account?.type || item.account_id,
      before: percent.format(before), after: percent.format(after), detail: item.exposure === "variable_savings" ? "Modeled APY" : "Modeled APR" });
  }
  for (const goal of result.goal_changes) {
    if (goal.baseline.completion_date !== goal.scenario.completion_date) rows.push({ label: goal.baseline.name,
      before: displayDate(goal.baseline.completion_date), after: displayDate(goal.scenario.completion_date), detail: "Estimated completion" });
  }
  const before = number(result.baseline_projection.monthly.at(-1)?.liquid_balance);
  const after = number(result.scenario_projection.monthly.at(-1)?.liquid_balance);
  if (before !== null && after !== null && before !== after) {
    rows.push({ label:"Liquid balance", before:money(before), after:money(after), detail:"End of projection" });
  }
  const spending = number(result.financial_impacts.find(item => item.metric === "monthly_spending_exposure")?.change);
  if (spending !== null && spending !== 0) rows.push({ label:"Monthly spending", before:"Baseline",
    after:`${spending > 0 ? "+" : ""}${money(spending)}`, detail:"Modeled change" });
  return rows;
}

export function ImpactScreen() {
  const dashboard = useFinanceStore(state => state.dashboard);
  const { headline } = useLocalSearchParams<{ headline?: string }>();
  const [input, setInput] = useState(headline ?? "");
  const [query, setQuery] = useState<{ text: string } | null>(null);
  const [response, setResponse] = useState<{ query: typeof query; data?: HeadlineAnalysis; error?: string } | null>(null);
  const customerId = dashboard?.customer.id;
  useEffect(() => {
    if (!query || !customerId) return;
    const controller = new AbortController();
    void api<HeadlineAnalysis>("/headlines/analyze", { customer_id: customerId, headline: query.text }, controller.signal).then(
      data => { if (!controller.signal.aborted) setResponse({ query, data }); },
      error => { if (!controller.signal.aborted) setResponse({ query, error: error.message }); },
    );
    return () => controller.abort();
  }, [customerId, query]);

  const matching = response?.query === query ? response : null;
  const result = matching?.data;
  const rows = result ? impactRows(result, dashboard?.accounts ?? []) : [];
  const pending = query !== null && matching === null;
  const requirement = result?.scenario_projection.missing_requirements.find(
    item => !result.baseline_projection.missing_requirements.includes(item),
  );
  const explanation = requirement ?? result?.exposure_explanations[0] ?? result?.event.explanation;
  function submit() {
    const text = input.trim();
    if (text && !pending) setQuery({ text });
  }
  return <ScreenShell>
    <ScreenIntro eyebrow="HEADLINE IMPACT" title="News, translated to" accent="you." sub="See how a headline could affect your finances."/>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:6,marginBottom:14}}>
      {headlineExamples.map(text => <Pressable key={text} onPress={() => { setInput(text); setQuery({text}); }}>
        <Badge tone={query?.text === text ? "pink" : "blue"}>{text}</Badge>
      </Pressable>)}
    </ScrollView>
    <Card><Eyebrow>PASTE A HEADLINE</Eyebrow><View style={[s.row,{marginTop:10}]}>
      <TextInput accessibilityLabel="Paste a headline" placeholder="Paste a headline…" placeholderTextColor={colors.muted}
        style={s.input} maxLength={500} value={input} onChangeText={setInput} onSubmitEditing={submit}/>
      <View style={{width:50}}><Button3D ariaLabel="Analyze headline" disabled={!input.trim()} loading={pending} onClick={submit}>
        <Sparkles color="white" size={18}/>
      </Button3D></View>
    </View></Card>
    <Title eyebrow="WHAT THIS MEANS FOR YOU">Small shifts, shown honestly.</Title>
    <Card>{rows.length === 0 && <Text style={s.sub}>{matching?.error ?? (pending ? "Analyzing headline…" :
      result ? "No account or goal changes could be quantified." : "Enter or select a headline.")}</Text>}
      {rows.map((row, index) => <View key={`${row.label}-${index}`} style={s.impact}>
        <View style={{flex:1}}><Text style={s.strong}>{row.label}</Text><Text style={s.mini}>{row.detail}</Text></View>
        <Text style={s.mini}>{row.before}</Text><ArrowRight size={13} color={colors.muted}/><Text style={s.strong}>{row.after}</Text>
      </View>)}
    </Card>
    {explanation && <Card style={{marginTop:16}}><View style={s.row}><TrendingUp color={colors.pink}/><View style={{flex:1}}>
      <Text style={s.serif}>What the model found</Text><Text style={s.small}>{explanation}</Text>
    </View></View></Card>}
    {result && query && customerId && (result.headline_exposure_status === "modeled" || result.event.type === "gas_prices") &&
      <ScenarioResponse key={query.text} customerId={customerId}
        trigger={{ label: query.text, headline: query.text, acceptsFuelSensitivity: result.event.type === "gas_prices" }}/>}
    <Advice/>
  </ScreenShell>;
}

function Title({ eyebrow, children }: { eyebrow: string; children: ReactNode }) {
  return <View style={{marginTop:25,marginBottom:12}}><Eyebrow>{eyebrow}</Eyebrow><Text style={s.title}>{children}</Text></View>;
}

function Advice() { return <Text style={s.advice}>Informational, not financial advice.</Text>; }

const s=StyleSheet.create({screen:{paddingHorizontal:16,paddingTop:245,paddingBottom:130},fixedHeader:{position:"absolute",top:64,left:16,right:16,zIndex:2},between:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:8},row:{flexDirection:"row",alignItems:"center",gap:12},sub:{fontFamily:"Inter_400Regular",fontSize:14,lineHeight:21,color:colors.muted,marginTop:8},range:{fontFamily:"Inter_700Bold",fontSize:12,color:"#1B759F"},link:{minHeight:44,flexDirection:"row",gap:7,alignItems:"center"},linkText:{fontFamily:"Inter_700Bold",fontSize:12,color:colors.ink},title:{fontFamily:"Fraunces_600SemiBold",fontSize:27,color:colors.ink,marginTop:4},serif:{fontFamily:"Fraunces_600SemiBold",fontSize:21,color:colors.ink,marginVertical:5},strong:{fontFamily:"Inter_700Bold",fontSize:12,color:colors.ink},small:{fontFamily:"Inter_400Regular",fontSize:11,lineHeight:16,color:colors.muted},mini:{fontFamily:"Inter_400Regular",fontSize:9,color:colors.muted,letterSpacing:.4},timeline:{minHeight:64,flexDirection:"row",alignItems:"center",gap:10},timelineDot:{width:11,height:11,borderRadius:6,borderWidth:2,borderColor:"white",zIndex:2},timelineLine:{position:"absolute",left:5,top:38,height:40,borderLeftWidth:2,borderStyle:"dotted",borderColor:"rgba(11,58,91,.18)"},icon:{width:46,height:46,borderRadius:16,backgroundColor:colors.pale,alignItems:"center",justifyContent:"center"},stats:{flexDirection:"row",gap:9,marginTop:12,marginBottom:9},group:{paddingVertical:12,borderBottomWidth:1,borderColor:"rgba(11,58,91,.09)"},account:{flexDirection:"row",alignItems:"center",gap:10,paddingVertical:8},smallIcon:{width:36,height:36,borderRadius:12,backgroundColor:colors.pale,alignItems:"center",justifyContent:"center"},shocks:{flexDirection:"row",gap:8},shock:{flex:1,minHeight:128,padding:10,borderRadius:20,borderWidth:1,borderColor:"white",backgroundColor:"rgba(255,255,255,.66)",gap:5},shockActive:{borderWidth:2,borderColor:colors.pink,backgroundColor:"#FFF1F8"},track:{height:12,borderRadius:9,backgroundColor:"#E5EDF0",overflow:"hidden",marginVertical:6},input:{flex:1,minHeight:48,borderWidth:1,borderColor:"#CDE4EE",borderRadius:15,paddingHorizontal:13,fontFamily:"Inter_400Regular",color:colors.ink},impact:{minHeight:62,flexDirection:"row",alignItems:"center",gap:7,borderBottomWidth:1,borderColor:"rgba(11,58,91,.1)"},advice:{fontFamily:"Inter_400Regular",textAlign:"center",fontSize:9,color:colors.muted,margin:20}});
