import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SkyBackground } from "@/components/Background";
import { FinanceGate } from "@/components/FinanceGate";
import { GoalEditor } from "@/components/GoalEditor";
import { NewsSetup } from "@/components/PersonalNews";
import { Sapling } from "@/components/garden";
import { Button3D, Eyebrow, Heading, TrustTag } from "@/components/ui";
import { useAuthStore } from "@/lib/auth/store";
import { useFinanceStore } from "@/lib/store";
import { colors } from "@/lib/theme";

const choices = ["Trip", "Home", "Car", "Emergency fund"];

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState(choices[0]);
  const [newsStep, setNewsStep] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dashboard = useFinanceStore(state => state.dashboard);
  const done = useAuthStore(state => state.completeOnboarding);
  async function finish() {
    setFinishing(true);
    setError(null);
    try {
      await done();
      router.replace("/(tabs)");
    } catch {
      setError("Could not finish onboarding. Try again.");
    } finally {
      setFinishing(false);
    }
  }
  return <SkyBackground><ScrollView contentInsetAdjustmentBehavior="never"
    contentContainerStyle={[s.page, {paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24}]}
    keyboardShouldPersistTaps="handled">
    <View style={s.top}><Eyebrow>ONE SMALL START</Eyebrow><TrustTag/></View>
    <Heading accent={newsStep ? "you." : "first."}>{newsStep ? "News around" : "Plant one goal"}</Heading>
    <View style={s.plant}><Sapling ambient goal={{title:selected, growth:0}}/></View>
    <FinanceGate>
      {!newsStep && <View style={s.choices}>{choices.map(choice => <Pressable key={choice} onPress={() => setSelected(choice)}
        style={[s.choice, choice === selected && s.active]}><Text style={s.text}>{choice}</Text></Pressable>)}</View>}
      {dashboard && (newsStep ? <NewsSetup key={dashboard.customer.id} customerId={dashboard.customer.id} onSaved={() => void finish()}/> : <GoalEditor key={selected} dashboard={dashboard} initialName={selected} onSaved={() => setNewsStep(true)}/>)}
    </FinanceGate>
    {error && <Text accessibilityRole="alert" style={s.text}>{error}</Text>}
    <Button3D tone="white" loading={finishing} onClick={() => newsStep ? void finish() : setNewsStep(true)}>{newsStep ? "Skip news setup for now" : "Continue to news setup"}</Button3D>
  </ScrollView></SkyBackground>;
}

const s = StyleSheet.create({
  page:{flexGrow:1, paddingHorizontal:18},
  top:{flexDirection:"row", justifyContent:"space-between"},
  plant:{height:160, alignItems:"center", justifyContent:"center"},
  choices:{flexDirection:"row", flexWrap:"wrap", gap:8},
  choice:{minHeight:44, paddingHorizontal:14, justifyContent:"center", borderRadius:999, backgroundColor:colors.pale},
  active:{backgroundColor:"#FFE0EF"},
  text:{fontFamily:"Inter_700Bold", color:colors.ink},
});
