import { useEffect, useRef, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { api, apiUrl, displayDate } from "@/lib/api";
import type { ApiGoal, GoalNews } from "@/lib/api";
import { colors } from "@/lib/theme";
import { Badge, Button3D, Card, Eyebrow } from "./ui";
import { SearchSuggestions } from "./search-suggestions";

function GoalNewsCard({ goal }: { goal: ApiGoal }) {
  const [report, setReport] = useState<GoalNews | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const checking = useRef(false);
  useEffect(() => () => { controller.current?.abort(); }, []);
  async function check() {
    if (checking.current) return;
    checking.current = true; setBusy(true); setError("");
    const abort = new AbortController(); controller.current = abort;
    const timer = setTimeout(() => abort.abort(), 55000);
    try {
      const result = await api<GoalNews>(`/goals/${encodeURIComponent(goal.id)}/news`, { customer_id: goal.customer_id }, abort.signal);
      if (!abort.signal.aborted) setReport(result);
    } catch (reason) {
      if (controller.current === abort) setError(abort.signal.aborted ? "The news check timed out. Please retry." : reason instanceof Error ? reason.message : "Could not check news.");
    } finally { clearTimeout(timer); checking.current = false; if (controller.current === abort) setBusy(false); }
  }
  return <Card style={{ marginBottom: 14 }}><Eyebrow>YOUR GOAL</Eyebrow><Text style={s.title}>{goal.name}</Text>
    <Text style={s.copy}>{goal.news_context || "Recent news that could affect this goal and its timeline."}</Text>
    {!!goal.target_date && <Text style={s.copy}>Target · {displayDate(goal.target_date)}</Text>}
    <Button3D loading={busy} tone="white" onClick={() => void check()}>Check relevant news</Button3D>
    {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    {report && <View style={{ marginTop: 14 }}>
      <View accessibilityLiveRegion="polite"><Badge tone={report.status === "watch" ? "amber" : report.status === "no_change" ? "green" : "blue"}>
        {report.status === "watch" ? "Your plan may need a second look" : report.status === "no_change" ? "No relevant change found" : "News ready to review"}
      </Badge></View>
      <Text style={s.copy}>Checked {displayDate(report.checked_at, { dateStyle: "medium", timeStyle: "short" })}{report.cached ? " · recent check" : ""}</Text>
      <Text style={s.report}>{report.text}</Text><Eyebrow>SOURCES</Eyebrow>
      {report.sources.map(source => <Pressable key={source.index} accessibilityRole="link" onPress={() => void Linking.openURL(source.url)} style={s.source}>
        <Text style={s.sourceText}>[{source.index + 1}] {source.title} ↗</Text>
      </Pressable>)}
      <SearchSuggestions url={apiUrl(report.suggestions_path)}/>
      <Text style={s.copy}>These are possible effects. Your goal amount and date have not been changed.</Text>
    </View>}
  </Card>;
}

export function GoalNewsSection({ goals }: { goals: ApiGoal[] }) {
  return <><Text style={s.copy}>Check Google news for changes relevant to your goals. Checks share the goal name, target date, and watch context with Gemini and Google Search.</Text>
    {goals.length === 0 && <Card><Text style={s.copy}>Create a goal in Goals to start checking relevant news.</Text></Card>}
    {goals.map(goal => <GoalNewsCard key={`${goal.id}:${goal.name}:${goal.news_context}:${goal.target_date}`} goal={goal}/>)}
  </>;
}
const s = StyleSheet.create({
  title: { fontFamily: "Fraunces_600SemiBold", color: colors.ink, fontSize: 23, marginVertical: 8 },
  copy: { fontFamily: "Inter_400Regular", color: colors.muted, fontSize: 11, lineHeight: 17, marginVertical: 10 },
  error: { fontFamily: "Inter_400Regular", color: colors.danger, fontSize: 12, marginTop: 12 },
  report: { fontFamily: "Inter_400Regular", color: colors.ink, fontSize: 13, lineHeight: 21, marginVertical: 16 },
  source: { minHeight: 44, justifyContent: "center" },
  sourceText: { fontFamily: "Inter_700Bold", color: colors.ink, fontSize: 11, textDecorationLine: "underline" },
});
