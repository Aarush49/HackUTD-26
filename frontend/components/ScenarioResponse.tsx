import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { api, displayDate, money, number, runwayLabel } from "@/lib/api";
import type { Projection, StrategyComparison } from "@/lib/api";
import { colors } from "@/lib/theme";
import { Button3D, Card, Eyebrow } from "./ui";

type Trigger = { label: string } & (
  { shock: { unexpected_expense?: number; income_reduction?: number; income_reduction_months?: number;
    monthly_spending_increase?: number; monthly_spending_increase_months?: number } } |
  { headline: string; acceptsFuelSensitivity: boolean }
);

function readAmount(text: string, label: string, max = 1_000_000_000_000) {
  const value = text.trim();
  if (!value) return undefined;
  if (!/^(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/.test(value) || Number(value) > max) {
    throw new Error(`Enter a valid amount for ${label} with up to two decimal places.`);
  }
  return Number(value);
}

export function ScenarioResponse({ customerId, trigger }: { customerId: string; trigger: Trigger }) {
  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState({ reduction: "", income: "", spending: "", fuel: "" });
  const [result, setResult] = useState<StrategyComparison | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  const usesFuel = "headline" in trigger && trigger.acceptsFuelSensitivity;

  async function compare() {
    if (request.current) return;
    setError(null);
    setResult(null);
    try {
      const reduction = readAmount(fields.reduction, "monthly spending reduction");
      if (reduction === undefined || reduction <= 0) throw new Error("Enter a monthly spending reduction greater than zero.");
      const income = readAmount(fields.income, "monthly income");
      const spending = readAmount(fields.spending, "monthly spending");
      const fuel = usesFuel ? readAmount(fields.fuel, "fuel price sensitivity", 100) : undefined;
      if (usesFuel && fuel === undefined) throw new Error("Enter a fuel price sensitivity between 0% and 100%.");
      const event = "headline" in trigger ? { headline: trigger.headline } : { shock: trigger.shock };
      const controller = new AbortController();
      request.current = controller;
      setLoading(true);
      const data = await api<StrategyComparison>("/simulate", {
        customer_id: customerId,
        horizon_months: 12,
        assumptions: { monthly_income: income, monthly_spending: spending },
        exposure: fuel === undefined ? undefined : { spending_sensitivity: (fuel / 100).toFixed(4) },
        strategies: [
          { name: "Event only", ...event },
          { name: "With response", ...event, decision: { monthly_spending_reduction: reduction } },
        ],
      }, controller.signal);
      if (!controller.signal.aborted) setResult(data);
    } catch (failure) {
      if (!request.current?.signal.aborted) {
        setError(failure instanceof Error ? failure.message : "Could not compare the scenarios.");
      }
    } finally {
      if (!request.current?.signal.aborted) setLoading(false);
      request.current = null;
    }
  }

  function field(name: keyof typeof fields, label: string) {
    return <View>
      <Text style={s.label}>{label}</Text>
      <TextInput accessibilityLabel={label} style={s.input} keyboardType="decimal-pad" maxLength={18}
        editable={!loading} value={fields[name]} onChangeText={value => {
          setFields(previous => ({ ...previous, [name]: value }));
          setResult(null);
          setError(null);
        }}/>
    </View>;
  }

  return <Card style={s.card}>
    <Eyebrow>TEST A RESPONSE</Eyebrow>
    <Text style={s.copy}>See what reducing monthly spending could change after {trigger.label}.</Text>
    {!open ? <Button3D onClick={() => setOpen(true)}>Try a response</Button3D> : <View style={s.fields}>
      {field("reduction", "Monthly spending reduction ($)")}
      {usesFuel && <>
        {field("fuel", "Fuel price sensitivity (%)")}
        <Text style={s.copy}>Enter the share of the headline’s price change to apply to observed fuel spending.</Text>
      </>}
      <Text style={s.copy}>If Nessie history is incomplete, enter your own monthly estimates. Leave these blank to use the available Nessie estimates.</Text>
      {field("income", "Monthly take-home income ($), optional")}
      {field("spending", "Monthly spending excluding debt payments ($), optional")}
      <Button3D onClick={() => void compare()} loading={loading}>Compare 12-month outcomes</Button3D>
      {error && <Text accessibilityRole="alert" style={s.copy}>{error}</Text>}
      {result && <Comparison result={result}/>}
    </View>}
  </Card>;
}

function Comparison({ result }: { result: StrategyComparison }) {
  const [event, response] = result.strategies;
  if (!event || !response) return <Text style={s.copy}>The API did not return both scenarios.</Text>;
  if (event.headline_exposure_status !== null && event.headline_exposure_status !== "modeled") {
    const missing = event.scenario_projection.missing_requirements.find(
      reason => !result.baseline_projection.missing_requirements.includes(reason),
    );
    return <Text style={s.copy}>{missing ?? event.exposure_explanations[0] ?? "There is no identified exposure to compare."}</Text>;
  }
  const columns = [
    { label: "Baseline", projection: result.baseline_projection },
    { label: "Event only", projection: event.scenario_projection },
    { label: "With response", projection: response.scenario_projection },
  ];
  const endingCash = (projection: Projection) => number(projection.monthly.at(-1)?.liquid_balance);
  const before = endingCash(event.scenario_projection);
  const after = endingCash(response.scenario_projection);
  const delta = before === null || after === null ? null : after - before;
  const missing = [...new Set(columns.flatMap(column => column.projection.missing_requirements))];
  return <View style={s.fields}>
    <View style={s.row}>
      {columns.map(({ label, projection }) => <View key={label} style={s.column}>
        <Text style={s.label}>{label}</Text>
        <Text style={s.copy}>Cash at month 12</Text><Text style={s.label}>{money(endingCash(projection))}</Text>
        <Text style={s.copy}>First shortfall</Text><Text style={s.label}>{runwayLabel(projection.financial_runway)}</Text>
      </View>)}
    </View>
    {delta !== null && <Text style={s.copy}>{delta === 0 ? "The response leaves ending cash unchanged." :
      `The response leaves ${money(Math.abs(delta))} ${delta > 0 ? "more" : "less"} cash at month 12 than the event alone.`}</Text>}
    {result.baseline_projection.goals.map(goal => <View key={goal.goal_id}>
      <Text style={s.label}>{goal.name} · estimated completion</Text>
      <View style={s.row}>{columns.map(({label, projection}) => <Text key={label} style={[s.column, s.copy]}>
        {displayDate(projection.goals.find(item => item.goal_id === goal.goal_id)?.completion_date)}
      </Text>)}</View>
    </View>)}
    {missing.map(reason => <Text key={reason} style={s.copy}>{reason}</Text>)}
  </View>;
}

const s = StyleSheet.create({
  card: { marginTop: 18 },
  fields: { gap: 10 },
  row: { flexDirection: "row", gap: 8 },
  column: { flex: 1, gap: 4 },
  label: { color: colors.ink, fontFamily: "Inter_700Bold", fontSize: 11 },
  copy: { color: colors.muted, fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 17, marginVertical: 4 },
  input: { minHeight: 44, borderWidth: 1, borderColor: colors.pale, borderRadius: 12, paddingHorizontal: 10, color: colors.ink },
});
