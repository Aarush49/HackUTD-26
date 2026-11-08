import { useEffect, useMemo, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Tabs, router } from "expo-router";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { UserRound, X } from "lucide-react-native";
import { TabBar } from "@/components/navigation";
import { GoalExperience } from "@/components/goal-experience";
import { useFinanceStore } from "@/lib/store";
import { colors } from "@/lib/theme";

export default function TabsLayout() {
  const sheet = useFinanceStore(state => state.sheet);
  const closeSheet = useFinanceStore(state => state.closeSheet);
  const ref = useRef<BottomSheet>(null);
  const snaps = useMemo(() => ["38%", "64%"], []);
  useEffect(() => { sheet === "whatif" ? ref.current?.snapToIndex(0) : ref.current?.close(); }, [sheet]);
  const go = (path: "/impact" | "/(tabs)/predict") => { closeSheet(); router.push(path); };
  return <><Tabs tabBar={p => <TabBar {...p}/>} screenOptions={{ headerShown: true, headerTransparent: true, headerTitle: "canopy",
    headerTitleStyle: { fontFamily: "Fraunces_600SemiBold", fontSize: 18, color: colors.ink },
    headerRight: () => <Pressable accessibilityLabel="Open profile" onPress={() => router.push("/profile")} style={s.profile}><UserRound color={colors.ink} size={20}/></Pressable> }}>
    <Tabs.Screen name="index"/><Tabs.Screen name="picture"/><Tabs.Screen name="goals"/><Tabs.Screen name="predict"/>
  </Tabs><GoalExperience/>
    <BottomSheet ref={ref} index={-1} snapPoints={snaps} enablePanDownToClose onClose={() => {
      if (useFinanceStore.getState().sheet === "whatif") closeSheet();
    }} backgroundStyle={s.sheet}>
      <BottomSheetView style={s.sheetContent}><View style={s.sheetTitle}><Text style={s.title}>What would you like to explore?</Text>
        <Pressable accessibilityLabel="Close options" onPress={closeSheet} style={s.close}><X color={colors.ink}/></Pressable></View>
        <Option title="Use a headline" copy="Paste or pick news and see your estimated impact."/>
        <Action label="Open headline impact" onPress={() => go("/impact")}/>
        <Option title="Apply a shock" copy="Stress-test a surprise and find a way through."/>
        <Action label="Open shock simulator" onPress={() => { useFinanceStore.getState().setPredictMode("break"); go("/(tabs)/predict"); }}/>
      </BottomSheetView>
    </BottomSheet></>;
}
function Option({ title, copy }: { title: string; copy: string }) {
  return <View style={s.option}><Text style={s.optionTitle}>{title}</Text><Text style={s.copy}>{copy}</Text></View>;
}
function Action({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={s.primary}><Text style={s.primaryText}>{label}</Text></Pressable>;
}
const s = StyleSheet.create({
  profile: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,.72)", alignItems: "center", justifyContent: "center", marginRight: 12 },
  sheet: { backgroundColor: "#F5FBFE", borderRadius: 28 }, sheetContent: { padding: 18 },
  sheetTitle: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  title: { fontFamily: "Fraunces_600SemiBold", fontSize: 24, color: colors.ink, flex: 1 },
  close: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.pale, alignItems: "center", justifyContent: "center" },
  copy: { fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 17, color: colors.muted },
  option: { padding: 14, borderRadius: 18, backgroundColor: "rgba(255,255,255,.8)", marginBottom: 8 },
  optionTitle: { fontFamily: "Fraunces_600SemiBold", fontSize: 17, color: colors.ink },
  primary: { minHeight: 44, backgroundColor: colors.pink, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  primaryText: { fontFamily: "Inter_700Bold", color: "white" },
});
