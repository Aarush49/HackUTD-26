import { useState } from "react";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { api, money } from "@/lib/api";
import type { Dashboard, Product, ProductComparison } from "@/lib/api";
import { colors } from "@/lib/theme";
import { Button3D, Eyebrow } from "./ui";

const labels = {take_action:"Take action", do_nothing:"Do nothing", wait:"Wait"};
const SheetTextInput = Platform.OS === "web" ? TextInput : BottomSheetTextInput;

export function GoalProducts({ dashboard, products }: { dashboard: Dashboard; products: Product[] }) {
  const options = products.filter(product => ["cd","hysa","rewards"].includes(product.kind));
  const [kind, setKind] = useState<string | null>(null);
  const [accountId, setAccountId] = useState("");
  const [inputs, setInputs] = useState({amount:"", rate:"", fee:"", term:"", eligible:"", income:"", spending:""});
  const [paidInFull, setPaidInFull] = useState(false);
  const [result, setResult] = useState<ProductComparison | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const rewards = kind === "rewards";
  const accounts = dashboard.accounts.filter(account => rewards || ["checking","savings"].includes(account.type.toLowerCase()));

  function field(key: keyof typeof inputs, label: string) {
    return <SheetTextInput accessibilityLabel={label} placeholder={label} keyboardType="decimal-pad"
      value={inputs[key]} style={s.input} editable={!loading} onChangeText={value => {
        setInputs(previous => ({...previous, [key]:value}));
        setResult(null);
      }}/>;
  }

  async function compare() {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      if (!accountId || !inputs.rate.trim() || !inputs.fee.trim() ||
        (rewards ? !inputs.eligible.trim() || !paidInFull : !inputs.amount.trim() || (kind === "cd" && !inputs.term.trim()))) {
        throw new Error("Select an account and enter each product assumption.");
      }
      const rate = Number(inputs.rate) / 100;
      const eligible = Number(inputs.eligible) / 100;
      if (!Number.isFinite(rate) || rate < 0 || (rewards && (!Number.isFinite(eligible) || eligible < 0 || eligible > 1))) {
        throw new Error("Enter a valid rate and, for rewards, an eligible spending share from 0% to 100%.");
      }
      const product = rewards ? {kind, account_id:accountId, eligible_spending_fraction:eligible.toFixed(8),
        reward_rate:rate.toFixed(8), annual_fee:inputs.fee, pay_statement_in_full:true} :
        {kind, account_id:accountId, amount:inputs.amount, apy:rate.toFixed(8), fee:inputs.fee,
          ...(kind === "cd" ? {term_months:Number(inputs.term)} : {})};
      setResult(await api<ProductComparison>("/products/recommend", {customer_id:dashboard.customer.id, product,
        assumptions:{monthly_income:inputs.income.trim() || undefined, monthly_spending:inputs.spending.trim() || undefined}}));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not compare the options.");
    } finally {
      setLoading(false);
    }
  }

  return <View style={s.group}><Eyebrow>ILLUSTRATIVE PRODUCTS</Eyebrow>
    {options.map(product => <Pressable key={product.kind} disabled={loading} onPress={() => {
      setKind(product.kind); setAccountId(""); setResult(null); setError(null);
    }} style={[s.option, kind === product.kind && s.selected]}>
      <Text style={s.strong}>{product.name}</Text><Text style={s.copy}>{product.advantage}. {product.risk}.</Text>
    </Pressable>)}
    {kind && <>
      <Text style={s.copy}>Choose an account and enter your own terms. Waiting is modeled as three months.</Text>
      {accounts.map(account => <Pressable key={account.id} disabled={loading} onPress={() => {
        setAccountId(account.id); setResult(null);
      }} style={[s.option, accountId === account.id && s.selected]}>
        <Text style={s.copy}>{account.nickname || account.type} · {money(account.balance)}</Text>
      </Pressable>)}
      {rewards ? <>
        {field("eligible","Eligible share of spending (%)")}{field("rate","Reward rate (%)")}{field("fee","Annual fee ($)")}
        <Pressable accessibilityRole="checkbox" accessibilityState={{checked:paidInFull}} disabled={loading}
          onPress={() => { setPaidInFull(!paidInFull); setResult(null); }} style={[s.option, paidInFull && s.selected]}>
          <Text style={s.copy}>{paidInFull ? "✓ " : ""}Assume the statement is paid in full</Text>
        </Pressable>
      </> : <>
        {field("amount","Amount to move ($)")}{field("rate","Assumed APY (%)")}{field("fee","Fee ($)")}
        {kind === "cd" && field("term","Term in months")}
      </>}
      {field("income","Monthly income ($), optional")}{field("spending","Monthly non-debt spending ($), optional")}
      <Button3D loading={loading} onClick={() => void compare()}>Compare options</Button3D>
      {error && <Text accessibilityRole="alert" style={s.copy}>{error}</Text>}
      {result?.options.map(option => <View key={option.option} style={s.option}>
        <Text style={s.strong}>{labels[option.option]}</Text>
        <Text style={s.copy}>Lowest projected cash · {money(option.minimum_modeled_liquidity)}</Text>
        <Text style={s.copy}>Ending net position change · {money(option.estimated_effects.ending_known_account_net_worth)}</Text>
        {option.risks.map(risk => <Text key={risk} style={s.copy}>{risk}</Text>)}
        {option.projection.missing_requirements.map(reason => <Text key={reason} style={s.copy}>{reason}</Text>)}
      </View>)}
    </>}
  </View>;
}

const s = StyleSheet.create({
  group:{gap:8, marginVertical:10},
  option:{padding:10, borderWidth:1, borderColor:colors.pale, borderRadius:12},
  selected:{borderColor:colors.pink},
  input:{minHeight:44, borderWidth:1, borderColor:"#CDE4EE", borderRadius:12, paddingHorizontal:10, color:colors.ink},
  strong:{fontFamily:"Inter_700Bold", fontSize:12, color:colors.ink},
  copy:{fontFamily:"Inter_400Regular", fontSize:11, color:colors.muted},
});
