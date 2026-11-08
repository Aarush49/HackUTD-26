import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { api, money } from "@/lib/api";
import type { Dashboard, Goal } from "@/lib/api";
import { useFinanceStore } from "@/lib/store";
import { colors } from "@/lib/theme";
import { Button3D, Card, Eyebrow } from "./ui";

export function GoalEditor({ dashboard, goal, initialName = "", onSaved, onCancel }: {
  dashboard: Dashboard; goal?: Goal; initialName?: string; onSaved: () => void; onCancel?: () => void;
}) {
  const load = useFinanceStore(state => state.load);
  const [name, setName] = useState(goal?.name ?? initialName);
  const [target, setTarget] = useState(String(goal?.target_amount ?? ""));
  const [monthly, setMonthly] = useState(String(goal?.monthly_contribution ?? ""));
  const [date, setDate] = useState(goal?.target_date ?? "");
  const [accountId, setAccountId] = useState(goal?.funding_account_id ?? null);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const accounts = dashboard.accounts.filter(account => ["checking", "savings"].includes(account.type.toLowerCase()));

  async function save() {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError(null);
    try {
      const details = {name: name.trim(), target_amount: target.trim(), monthly_contribution: monthly.trim(),
        target_date: date.trim() || null, funding_account_id: accountId};
      if (goal) {
        await api<Goal>(`/goals/${encodeURIComponent(goal.id)}`,
          {...details, ...(accountId !== goal.funding_account_id ? {initial_funded_amount: null} : {})}, undefined, "PATCH");
      } else {
        await api<Goal>("/goals", {...details, customer_id: dashboard.customer.id});
      }
      onSaved();
      void load(new AbortController().signal);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not save your goal.");
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  return <Card style={{marginVertical:12}}><Eyebrow>{goal ? "EDIT GOAL" : "NEW GOAL"}</Eyebrow>
    <View style={s.fields}>
      <TextInput accessibilityLabel="Goal name" placeholder="Goal name" value={name} onChangeText={setName}
        maxLength={120} style={s.input} editable={!busy}/>
      <TextInput accessibilityLabel="Target amount" placeholder="Target amount ($)" value={target}
        onChangeText={setTarget} keyboardType="decimal-pad" style={s.input} editable={!busy}/>
      <TextInput accessibilityLabel="Monthly contribution" placeholder="Monthly contribution ($)" value={monthly}
        onChangeText={setMonthly} keyboardType="decimal-pad" style={s.input} editable={!busy}/>
      <TextInput accessibilityLabel="Target date" placeholder="Target date, YYYY-MM-DD (optional)" value={date}
        onChangeText={setDate} maxLength={10} style={s.input} editable={!busy}/>
      <Text style={s.text}>Funding account (optional)</Text>
      <Pressable disabled={busy} onPress={() => setAccountId(null)} style={[s.option, accountId === null && s.selected]}>
        <Text style={s.text}>No linked account</Text>
      </Pressable>
      {accounts.map(account => <Pressable key={account.id} disabled={busy} onPress={() => setAccountId(account.id)}
        style={[s.option, accountId === account.id && s.selected]}>
        <Text style={s.text}>{account.nickname || account.type} · {money(account.balance)}</Text>
      </Pressable>)}
      {error && <Text accessibilityRole="alert" style={s.text}>{error}</Text>}
      <Button3D loading={busy} disabled={!name.trim() || !target.trim() || !monthly.trim()}
        onClick={() => void save()}>Save goal</Button3D>
      {onCancel && <Button3D tone="white" disabled={busy} onClick={onCancel}>Cancel</Button3D>}
    </View>
  </Card>;
}

const s = StyleSheet.create({
  fields:{gap:8, marginTop:10},
  input:{minHeight:44, borderWidth:1, borderColor:"#CDE4EE", borderRadius:12, paddingHorizontal:10, color:colors.ink},
  option:{padding:10, borderWidth:1, borderColor:colors.pale, borderRadius:12},
  selected:{borderColor:colors.pink},
  text:{fontSize:12, color:colors.ink},
});
