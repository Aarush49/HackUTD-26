import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";


export type NewsRuntime = {
  api: <T>(path: string, body?: object, signal?: AbortSignal) => Promise<T>;
  displayDate: (value: string | null | undefined) => string;
  goalNames: string[];
  ui: {
    Card: ComponentType<{ children: ReactNode; style?: StyleProp<ViewStyle> }>;
    Eyebrow: ComponentType<{ children: ReactNode }>;
    Badge: ComponentType<{ children: ReactNode }>;
    Button3D: ComponentType<{ children: ReactNode; tone?: "white" | "pink" | "sky"; loading?: boolean; disabled?: boolean; onClick?: () => void }>;
  };
};
const RuntimeContext = createContext<NewsRuntime | null>(null);
export const NewsProvider = RuntimeContext.Provider;
function useNewsRuntime() {
  const runtime = useContext(RuntimeContext);
  if (!runtime) throw new Error("Wrap personalized news components in NewsProvider.");
  return runtime;
}
// Same Canopy palette; host UI components are supplied by the adapter.
const colors = { ink: "#0B3A5B", muted: "#55788D", pink: "#FF2E93", danger: "#B52F67" };
function Card(props: { children: ReactNode; style?: StyleProp<ViewStyle> }) { const Component = useNewsRuntime().ui.Card; return <Component {...props}/>; }
function Eyebrow(props: { children: ReactNode }) { const Component = useNewsRuntime().ui.Eyebrow; return <Component {...props}/>; }
function Badge(props: { children: ReactNode }) { const Component = useNewsRuntime().ui.Badge; return <Component {...props}/>; }
function Button3D(props: { children: ReactNode; tone?: "white" | "pink" | "sky"; loading?: boolean; disabled?: boolean; onClick?: () => void }) { const Component = useNewsRuntime().ui.Button3D; return <Component {...props}/>; }

export type Preferences = { goals: string[]; topics: string[]; destination: string; timeframe: string };
export type Suggestion = { topic: string; purchase_count: number; latest_date: string };
export type Feed = { notice: string; checked_at: string; cached: boolean; ai_formatted: boolean; articles: {
  id: number; title: string; summary: string; why_it_matters: string; suggested_action: string; url: string; source: string; published_at: string | null;
}[] };
const split = (value: string) => [...new Set(value.split(",").map(v => v.trim()).filter(Boolean))];
function Field({ label, value, set }: { label: string; value: string; set: (value: string) => void }) {
  return <View style={{ gap: 6 }}><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={set} style={s.input} maxLength={500}/></View>;
}

export function NewsSetup({ customerId, onSaved }: { customerId: string; onSaved: () => void }) {
  const { api, displayDate, goalNames } = useNewsRuntime();
  const [goals, setGoals] = useState("");
  const [topics, setTopics] = useState("");
  const [destination, setDestination] = useState("");
  const [timeframe, setTimeframe] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [busy, setBusy] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const saving = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    setLoaded(false);
    void api<Preferences>(`/news/preferences/${encodeURIComponent(customerId)}`, undefined, controller.signal).then(prefs => {
      if (controller.signal.aborted) return;
      setGoals((prefs.goals.length ? prefs.goals : goalNames.slice(0, 5)).join(", "));
      setTopics(prefs.topics.join(", ")); setDestination(prefs.destination); setTimeframe(prefs.timeframe); setLoaded(true);
    }).catch(reason => { if (!controller.signal.aborted) { setError(reason.message); } });
    return () => controller.abort();
  }, [customerId]);
  async function suggest() {
    setSuggesting(true); setError("");
    try {
      const result = await api<{ suggestions: Suggestion[] }>(`/news/suggestions/${encodeURIComponent(customerId)}`);
      setSuggestions(result.suggestions);
      if (!result.suggestions.length) setError("No suitable recent purchase categories were found. You can enter your interests yourself.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load suggestions."); }
    finally { setSuggesting(false); }
  }
  async function save() {
    if (saving.current) return;
    saving.current = true; setBusy(true); setError("");
    try {
      const goalList = split(goals), topicList = split(topics);
      if (!goalList.length && !topicList.length && !destination.trim()) throw new Error("Add at least one goal, destination, or topic.");
      if (goalList.length > 5 || topicList.length > 8 || [...goalList, ...topicList].some(v => v.length > 80)) throw new Error("Use up to 5 goals and 8 topics, each under 80 characters.");
      await api<Preferences>("/news/preferences", { customer_id: customerId, goals: goalList, topics: topicList, destination, timeframe });
      onSaved();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save preferences."); }
    finally { saving.current = false; setBusy(false); }
  }
  const selected = split(topics);
  return <Card><Eyebrow>YOUR WORLD, YOUR CHOICE</Eyebrow><Text style={s.title}>What matters to you?</Text>
    <View style={{ gap: 14 }}>
      <Field label="What are your goals? (separate with commas)" value={goals} set={setGoals}/>
      <Field label="What news topics should we watch? (separate with commas)" value={topics} set={setTopics}/>
      <Field label="Any destination or place?" value={destination} set={setDestination}/>
      <Field label="When are you planning this?" value={timeframe} set={setTimeframe}/>
      <Text style={s.copy}>Examples: hotel prices, Japan travel, fuel prices, technology. Saving this profile does not create or change savings targets.</Text>
      <Text style={s.copy}>Optional: review broad suggestions from posted purchases in the last 60 days. We rank by frequency, then recency. Purchase records and merchant names stay on the backend.</Text>
      <Button3D tone="white" loading={suggesting} disabled={!loaded || busy} onClick={() => void suggest()}>Suggest from recent purchases</Button3D>
      {suggestions.map(item => <Pressable key={item.topic} accessibilityRole="checkbox" accessibilityState={{ checked: selected.includes(item.topic) }}
        onPress={() => setTopics((selected.includes(item.topic) ? selected.filter(t => t !== item.topic) : [...selected, item.topic]).join(", "))}
        style={[s.choice, selected.includes(item.topic) && { borderColor: colors.pink }]}>
        <Text style={s.label}>{selected.includes(item.topic) ? "✓ " : "＋ "}{item.topic}</Text><Text style={s.copy}>{item.purchase_count} purchases · most recent {displayDate(item.latest_date)}</Text>
      </Pressable>)}
      <Text style={s.copy}>Only the topics you save are used. Search terms go to News API; approved preferences and article snippets go to Gemini. No balances or raw purchases are shared.</Text>
      {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
      <Button3D loading={busy} disabled={!loaded || suggesting} onClick={() => void save()}>Save my news interests</Button3D>
    </View>
  </Card>;
}

export function PersonalNews({ customerId }: { customerId: string }) {
  const { api, displayDate } = useNewsRuntime();
  const [setup, setSetup] = useState(false);
  const [feed, setFeed] = useState<Feed | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => { request.current?.abort(); request.current = null; }, []);
  async function check() {
    if (request.current) return;
    const controller = new AbortController(); request.current = controller;
    const timeout = setTimeout(() => controller.abort(), 70000);
    setBusy(true); setError("");
    try {
      const result = await api<Feed>("/news/feed", { customer_id: customerId }, controller.signal);
      if (!controller.signal.aborted) setFeed(result);
    } catch (reason) { if (request.current === controller) setError(controller.signal.aborted ? "The news check timed out. Please retry." : reason instanceof Error ? reason.message : "News could not be loaded."); }
    finally { clearTimeout(timeout); if (request.current === controller) { request.current = null; setBusy(false); } }
  }
  return <View style={{ gap: 14 }}><Text style={s.copy}>News chosen around the goals and interests you approve. Developer-plan articles can be delayed by 24 hours.</Text>
    <Button3D tone="white" disabled={busy} onClick={() => setSetup(value => !value)}>{setup ? "Close news setup" : "Set up or edit my news interests"}</Button3D>
    {setup && <NewsSetup customerId={customerId} onSaved={() => { setSetup(false); setFeed(null); setError(""); }}/>}
    <Button3D loading={busy} onClick={() => void check()}>Get news for me</Button3D>
    {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    {feed && <><Text accessibilityLiveRegion="polite" style={s.copy}>{feed.notice} Checked {displayDate(feed.checked_at)}{feed.cached ? " · cached" : ""}</Text>
      {!feed.articles.length && <Card><Text style={s.copy}>No articles matched. Try broader topics in your setup.</Text></Card>}
      {feed.articles.map(article => <Card key={article.url}><Eyebrow>{article.source}</Eyebrow><Text style={s.title}>{article.title}</Text>
        <Text style={s.copy}>{displayDate(article.published_at)}</Text><Badge>{feed.ai_formatted ? "Gemini summary · from snippets" : "Publisher snippet"}</Badge>
        <Text style={s.body}>{article.summary}</Text>
        {!!article.why_it_matters && <><Eyebrow>WHY IT MAY MATTER</Eyebrow><Text style={s.body}>{article.why_it_matters}</Text></>}
        {!!article.suggested_action && <><Eyebrow>A POSSIBLE NEXT STEP</Eyebrow><Text style={s.body}>{article.suggested_action}</Text></>}
        <Pressable accessibilityRole="link" style={{ minHeight: 44, justifyContent: "center" }} onPress={() => void Linking.openURL(article.url)}><Text style={s.label}>Read the source ↗</Text></Pressable>
      </Card>)}</>}
  </View>;
}
const s = StyleSheet.create({
  title: { fontFamily: "Fraunces_600SemiBold", fontSize: 24, color: colors.ink, marginVertical: 12 },
  label: { fontFamily: "Inter_700Bold", color: colors.ink, fontSize: 12 },
  copy: { fontFamily: "Inter_400Regular", color: colors.muted, fontSize: 12, lineHeight: 19, marginVertical: 6 },
  body: { fontFamily: "Inter_400Regular", color: colors.ink, fontSize: 13, lineHeight: 21, marginVertical: 12 },
  error: { color: colors.danger, fontSize: 13, marginVertical: 8 },
  input: { borderWidth: 1, borderColor: "#CDE4EE", borderRadius: 12, padding: 12, minHeight: 44, color: colors.ink },
  choice: { borderWidth: 1, borderColor: "#CDE4EE", borderRadius: 12, padding: 12 },
});
