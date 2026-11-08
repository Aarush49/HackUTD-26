import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { ArrowLeft, Plus, X } from "lucide-react-native";
import Svg, { Circle, Ellipse, G, Path } from "react-native-svg";
import { api, displayDate, money, number } from "@/lib/api";
import type { ApiGoal, GoalRoots } from "@/lib/api";
import { goalViews, useFinanceStore } from "@/lib/store";
import type { Goal } from "@/lib/store";
import { colors } from "@/lib/theme";
import { Badge, Button3D, Card, Eyebrow } from "./ui";
import { SkyBackground } from "./Background";

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
function amount(value: string, allowZero = false) {
  if (!/^\d+(\.\d{1,2})?$/.test(value) || Number(value) > 1e12 || Number(value) < (allowZero ? 0 : .01)) throw new Error("Enter a valid dollar amount with up to two decimal places.");
  return value;
}
function targetDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value || value < today()) throw new Error("Enter today or a future date as YYYY-MM-DD.");
  return value;
}
function Field({ label, value, onChange, numeric = false, multiline = false, placeholder, maxLength = 120 }: {
  label: string; value: string; onChange: (value: string) => void; numeric?: boolean; multiline?: boolean; placeholder?: string; maxLength?: number;
}) {
  return <View style={s.field}><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={label} value={value}
    onChangeText={onChange} style={[s.input, multiline && { minHeight: 90, textAlignVertical: "top" }]}
    keyboardType={numeric ? "decimal-pad" : "default"} placeholder={placeholder} placeholderTextColor={colors.muted}
    multiline={multiline} maxLength={maxLength}/></View>;
}

function GoalForm({ onCreated }: { onCreated: (id: string) => void }) {
  const customerId = useFinanceStore(state => state.dashboard?.customer.id);
  const createGoal = useFinanceStore(state => state.createGoal);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [date, setDate] = useState("");
  const [monthly, setMonthly] = useState("0");
  const [opening, setOpening] = useState("0");
  const [source, setSource] = useState("Opening balance");
  const [context, setContext] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  async function submit() {
    if (submitting.current || !customerId) return;
    submitting.current = true; setBusy(true); setError("");
    try {
      if (!name.trim()) throw new Error("Give your goal a name.");
      if (!source.trim()) throw new Error("Name the source of your opening balance.");
      const goal = await createGoal({ customer_id: customerId, name: name.trim(), target_amount: amount(target),
        target_date: targetDate(date), monthly_contribution: amount(monthly, true), initial_funded_amount: amount(opening, true),
        opening_source: source.trim(), news_context: context.trim() });
      onCreated(goal.id);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not create the goal."); }
    finally { submitting.current = false; setBusy(false); }
  }
  return <Card><Eyebrow>PLANT SOMETHING NEW</Eyebrow><Text style={s.title}>Create a new goal</Text>
    <Field label="Goal name" value={name} onChange={setName} placeholder="Japan in spring"/>
    <Field label="Target amount (USD)" value={target} onChange={setTarget} numeric/>
    <Field label="Target date (YYYY-MM-DD)" value={date} onChange={setDate} placeholder="2027-04-18" maxLength={10}/>
    <Field label="Planned monthly savings (USD)" value={monthly} onChange={setMonthly} numeric/>
    <Field label="Already saved (USD)" value={opening} onChange={setOpening} numeric/>
    <Field label="Opening balance source" value={source} onChange={setSource} placeholder="Job, extra savings…" maxLength={100}/>
    <Field label="What should Predict watch?" value={context} onChange={setContext} multiline maxLength={500} placeholder="Japan hotels, flights, tourist taxes…"/>
    <Text style={s.copy}>This goal tracks savings you record. Planned savings are a forecast, not a contribution.</Text>
    {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    <Button3D loading={busy} onClick={() => void submit()}>Create goal</Button3D>
  </Card>;
}

function FullTree({ goal }: { goal: Goal }) {
  const progress = Math.max(0, Math.min(1, goal.growth ?? 0));
  const shape = <><Path d="M150 268V88m0 123-43-25m43-15 40-24" stroke="#337A5D" strokeWidth={8} fill="none" strokeLinecap="round"/>
    <Ellipse cx={109} cy={185} rx={29} ry={14} fill="#55B98A" transform="rotate(-22 109 185)"/>
    <Ellipse cx={190} cy={146} rx={29} ry={14} fill="#7DD3A7" transform="rotate(22 190 146)"/>
    <Ellipse cx={112} cy={128} rx={27} ry={13} fill="#55B98A" transform="rotate(-22 112 128)"/>
    <Ellipse cx={182} cy={103} rx={28} ry={14} fill="#7DD3A7" transform="rotate(22 182 103)"/>
    <Circle cx={150} cy={85} r={45} fill="#77CFA2"/></>;
  return <View><Svg width="100%" height={300} viewBox="0 0 300 290" accessibilityLabel={`Current tree ${Math.round(progress * 100)}% grown; pale tree shows the full-grown target`}>
    <Ellipse cx={150} cy={273} rx={42} ry={6} fill={colors.sky} opacity={.14}/><G opacity={.16}>{shape}</G>
    <G transform={`translate(150 268) scale(${.2 + progress * .8}) translate(-150 -268)`}>{shape}</G>
  </Svg><Text style={[s.copy, { textAlign: "center" }]}>Your tree today · pale silhouette: full-grown goal</Text></View>;
}

function ContributionForm({ goal, onSaved }: { goal: ApiGoal; onSaved: () => void }) {
  const [source, setSource] = useState("");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Keep the same id and payload after transport failures; safe retry cannot add twice.
  const pending = useRef<{ request_id: string; customer_id: string; source: string; amount: string; contributed_on: string } | null>(null);
  const submitting = useRef(false);
  const updateGoal = useFinanceStore(state => state.updateGoal);
  async function submit() {
    if (submitting.current) return;
    submitting.current = true; setBusy(true); setError("");
    try {
      if (!pending.current) {
        if (!source.trim()) throw new Error("Enter a contribution source.");
        // crypto.randomUUID isn't guaranteed by all React Native runtimes. The server
        // issues idempotency keys via this endpoint for native/web parity.
        const { request_id } = await api<{ request_id: string }>("/goals/contribution-id", {});
        pending.current = { request_id, customer_id: goal.customer_id, source: source.trim(), amount: amount(value), contributed_on: today() };
      }
      const updated = await api<ApiGoal>(`/goals/${encodeURIComponent(goal.id)}/contributions`, pending.current);
      updateGoal(updated); pending.current = null; setSource(""); setValue(""); onSaved();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save this contribution."); }
    finally { submitting.current = false; setBusy(false); }
  }
  return <Card><Eyebrow>FEED YOUR ROOTS</Eyebrow>
    <Field label="Contribution source" value={source} onChange={setSource} maxLength={100} placeholder="Job, extra savings from last month…"/>
    <Field label="Contribution amount (USD)" value={value} onChange={setValue} numeric/>
    {!!pending.current && <Text style={s.copy}>Retry uses the original contribution details to prevent duplicates.</Text>}
    {!!error && <Text style={s.error} accessibilityRole="alert">{error}</Text>}
    <Button3D loading={busy} onClick={() => void submit()}>{pending.current ? "Retry contribution" : "Add contribution"}</Button3D>
  </Card>;
}

function GoalDetail({ goal }: { goal: ApiGoal }) {
  const dashboard = useFinanceStore(state => state.dashboard);
  const baseline = useFinanceStore(state => state.baseline);
  const view = goalViews(dashboard, baseline).find(item => item.id === goal.id)!;
  const [roots, setRoots] = useState<GoalRoots | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setError(""); setRoots(null);
    void api<GoalRoots>(`/goals/${encodeURIComponent(goal.id)}/roots?customer_id=${encodeURIComponent(goal.customer_id)}`, undefined, controller.signal).then(
      data => { if (!controller.signal.aborted) setRoots(data); },
      reason => { if (!controller.signal.aborted) setError(reason.message); },
    );
    return () => controller.abort();
  }, [goal.id, goal.customer_id, revision]);
  // Roots carry a fresh balance for linked accounts; use it for the matching tree.
  const current = roots ? number(roots.saved) : view.saved;
  const treeGoal = { ...view, saved: current, growth: current === null || !view.target ? null : current / view.target };
  const percent = treeGoal.growth === null ? null : Math.min(100, Math.round(treeGoal.growth * 100));
  return <><Eyebrow>{goal.target_date ? `TARGET · ${displayDate(goal.target_date)}` : "YOUR GOAL"}</Eyebrow>
    <Text style={s.title}>{goal.name}</Text><Text style={s.copy}>{money(current)} of {money(goal.target_amount)}</Text>
    <Card><Badge tone="green">{percent === null ? "Progress unavailable" : `${percent}% grown`}</Badge><FullTree goal={treeGoal}/>
      <Text style={s.copy}>{current === null || view.target === null ? "Funding is unavailable." : `${money(Math.max(0, view.target - current))} left to grow`}</Text>
      <Text style={[s.copy, { textAlign: "center" }]}>↓ Scroll down to explore your roots</Text></Card>
    <Svg width="100%" height={110} viewBox="0 0 350 110"><Path d="M175 0v95m0-80Q110 40 40 100m135-85q65 25 135 85M90 65l-40-3m210 3 40-3" fill="none" stroke="#77AB8C" strokeWidth={4} strokeLinecap="round"/></Svg>
    <Eyebrow>WHAT KEEPS YOU GROWING</Eyebrow><Text style={s.title}>Strong roots.</Text>
    {error ? <Card><Text accessibilityRole="alert" style={s.error}>{error}</Text><Button3D tone="white" onClick={() => setRevision(n => n + 1)}>Retry roots</Button3D></Card> : !roots ? <ActivityIndicator color={colors.ink}/> : <Card>
      {roots.roots.length === 0 && <Text style={s.copy}>No contributions yet. Add your first source of progress below.</Text>}
      {roots.roots.map(root => <View key={root.id} style={s.root}><View style={s.rootIcon}><Plus size={17} color={colors.green}/></View><View style={{ flex: 1 }}>
        <Text style={s.label}>{root.source}</Text><Text style={s.copy}>{root.date ? displayDate(root.date) : root.provenance}</Text>
      </View><Text style={s.label}>{money(root.amount)}</Text></View>)}
      <Text style={s.copy}>{roots.can_contribute ? "Sources are savings you recorded, not verified bank deposits." : "Uses the live linked account. Original income sources are not inferred."}</Text>
    </Card>}
    {roots?.can_contribute && <ContributionForm goal={goal} onSaved={() => setRevision(n => n + 1)}/>}
    {!!goal.news_context && <Card><Eyebrow>PREDICT IS WATCHING</Eyebrow><Text style={s.copy}>{goal.news_context}</Text></Card>}
  </>;
}

export function GoalExperience() {
  const { sheet, selectedGoal, dashboard, closeSheet, selectGoal } = useFinanceStore();
  const visible = sheet === "goal" || sheet === "sapling" || sheet === "create-goal";
  const goal = dashboard?.goals.find(item => item.id === selectedGoal);
  if (!visible) return null;
  return <Modal visible={visible} animationType="slide" onRequestClose={closeSheet} presentationStyle="fullScreen">
    <SkyBackground><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.page}>
        <View style={s.header}><Pressable accessibilityRole="button" accessibilityLabel="Back to goals" onPress={closeSheet} style={s.back}><ArrowLeft size={19} color={colors.ink}/><Text style={s.label}>All goals</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Close goal" onPress={closeSheet} style={s.back}><X size={22} color={colors.ink}/></Pressable></View>
        {sheet === "create-goal" ? <GoalForm onCreated={selectGoal}/> : goal ? <GoalDetail key={goal.id} goal={goal}/> : <Text style={s.copy}>Select a goal to explore its roots.</Text>}
      </ScrollView></KeyboardAvoidingView></SkyBackground>
  </Modal>;
}

const s = StyleSheet.create({
  page: { paddingHorizontal: 18, paddingTop: 60, paddingBottom: 50, gap: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  back: { minHeight: 44, minWidth: 44, flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontFamily: "Fraunces_600SemiBold", color: colors.ink, fontSize: 30, marginVertical: 8 },
  copy: { fontFamily: "Inter_400Regular", color: colors.muted, fontSize: 12, lineHeight: 19, marginVertical: 8 },
  label: { fontFamily: "Inter_700Bold", color: colors.ink, fontSize: 12 },
  field: { marginVertical: 8, gap: 6 },
  input: { minHeight: 48, borderWidth: 1, borderColor: "#CDE4EE", borderRadius: 15, padding: 12, color: colors.ink, fontFamily: "Inter_400Regular", backgroundColor: "rgba(255,255,255,.8)" },
  error: { color: colors.danger, fontFamily: "Inter_400Regular", fontSize: 13, marginVertical: 12 },
  root: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 14, borderBottomWidth: 1, borderColor: "#DCEBF0" },
  rootIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#DCF7E8", alignItems: "center", justifyContent: "center" },
});
