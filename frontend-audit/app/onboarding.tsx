import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { SkyBackground } from "@/components/Background";
import { FinanceGate } from "@/components/FinanceGate";
import { GoalEditor } from "@/components/GoalEditor";
import { Sapling } from "@/components/garden";
import { Button3D, Eyebrow, Heading, TrustTag } from "@/components/ui";
import { useAuthStore } from "@/lib/auth/store";
import { useFinanceStore } from "@/lib/store";
import { colors } from "@/lib/theme";

const choices = ["Trip", "Home", "Car", "Emergency fund"];

export default function Onboarding() {
  const [selected, setSelected] = useState(choices[0]);
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
  return <SkyBackground><ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
    <View style={s.top}><Eyebrow>ONE SMALL START</Eyebrow><TrustTag/></View>
    <Heading accent="first.">Plant one goal</Heading>
    <View style={s.plant}><Sapling ambient goal={{title:selected, growth:0}}/></View>
    <FinanceGate>
      <View style={s.choices}>{choices.map(choice => <Pressable key={choice} onPress={() => setSelected(choice)}
        style={[s.choice, choice === selected && s.active]}><Text style={s.text}>{choice}</Text></Pressable>)}</View>
      {dashboard && <GoalEditor key={selected} dashboard={dashboard} initialName={selected} onSaved={() => void finish()}/>}
    </FinanceGate>
    {error && <Text accessibilityRole="alert" style={s.text}>{error}</Text>}
    <Button3D tone="white" loading={finishing} onClick={() => void finish()}>Skip for now</Button3D>
  </ScrollView></SkyBackground>;
}

const s = StyleSheet.create({
  page:{padding:18, paddingTop:70, paddingBottom:40},
  top:{flexDirection:"row", justifyContent:"space-between"},
  plant:{height:160, alignItems:"center", justifyContent:"center"},
  choices:{flexDirection:"row", flexWrap:"wrap", gap:8},
  choice:{minHeight:44, paddingHorizontal:14, justifyContent:"center", borderRadius:999, backgroundColor:colors.pale},
  active:{backgroundColor:"#FFE0EF"},
  text:{fontFamily:"Inter_700Bold", color:colors.ink},
});
