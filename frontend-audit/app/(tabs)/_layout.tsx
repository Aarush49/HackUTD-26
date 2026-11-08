import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Tabs, router } from "expo-router";
import BottomSheet, { BottomSheetScrollView, BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { UserRound, X } from "lucide-react-native";
import { TabBar } from "@/components/navigation";
import { goalViews, headlineExamples, shockPresets, useFinanceStore } from "@/lib/store";
import { money } from "@/lib/api";
import { GoalEditor } from "@/components/GoalEditor";
import { GoalProducts } from "@/components/GoalProducts";
import { colors } from "@/lib/theme";

const SheetTextInput = Platform.OS === "web" ? TextInput : BottomSheetTextInput;

export default function TabsLayout() {
  const { sheet, closeSheet, dashboard, baseline, products, productsError, selectedGoal, applyShock } = useFinanceStore();
  const [headline, setHeadline] = useState("");
  const [editingGoal, setEditingGoal] = useState(false);
  const insets = useSafeAreaInsets();
  const ref = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["45%", "92%"], []);
  const goal = goalViews(dashboard, baseline).find(item => item.id === selectedGoal);
  const record = dashboard?.goals.find(item => item.id === selectedGoal);
  useEffect(() => setEditingGoal(false), [sheet, selectedGoal]);
  useEffect(() => { sheet ? ref.current?.snapToIndex(sheet === "goal" ? 1 : 0) : ref.current?.close(); }, [sheet]);
  function go(path: "/impact" | "/(tabs)/predict", params?: { headline: string }) { closeSheet(); router.push(params ? { pathname: path, params } : path); }
  return <><Tabs tabBar={props => <TabBar {...props}/>} screenOptions={{ headerShown: true, headerTransparent: true, headerTitle: "canopy", headerTitleStyle: { fontFamily: "Fraunces_600SemiBold", fontSize: 18, color: colors.ink }, headerRight: () => <Pressable accessibilityLabel="Open profile" onPress={() => router.push("/profile")} style={s.profile}><UserRound color={colors.ink} size={20}/></Pressable> }}>
    <Tabs.Screen name="index" options={{ headerShown: false }} /><Tabs.Screen name="picture"/><Tabs.Screen name="goals"/><Tabs.Screen name="predict"/></Tabs>
    <View style={[StyleSheet.absoluteFill, { zIndex: sheet ? 1 : -1 }]} pointerEvents={sheet ? "box-none" : "none"}
      accessibilityElementsHidden={!sheet} importantForAccessibility={sheet ? "auto" : "no-hide-descendants"}>
    <BottomSheet ref={ref} index={-1} snapPoints={snapPoints} enableDynamicSizing={false} enablePanDownToClose keyboardBehavior="interactive" keyboardBlurBehavior="restore" android_keyboardInputMode="adjustResize" onClose={closeSheet} backgroundStyle={s.sheet}>
      <BottomSheetScrollView contentContainerStyle={[s.sheetContent, { paddingBottom: insets.bottom + 84 }]} keyboardShouldPersistTaps="handled">
        <View style={s.sheetTitle}><Text style={s.title}>{sheet === "goal" && goal ? `Options for ${goal.title}` : sheet === "sapling" ? "Goal progress" : "What would you like to explore?"}</Text>
          <Pressable accessibilityLabel="Close sheet" onPress={closeSheet} style={s.close}><X color={colors.ink}/></Pressable></View>
        {sheet === "sapling" ? <Text style={s.copy}>{goal?.saved == null ? "Funding is unavailable." :
          `${money(goal.saved)} of ${money(goal.target)} funded.`}</Text> : sheet === "goal" ?
          dashboard && record ? <>
            {editingGoal ? <GoalEditor key={record.id} dashboard={dashboard} goal={record}
              onSaved={closeSheet} onCancel={() => setEditingGoal(false)}/> :
              <Action label="Edit goal" onPress={() => setEditingGoal(true)}/>}
            {products ? <GoalProducts key={record.id} dashboard={dashboard} products={products}/> :
              <Text style={s.copy}>{productsError ?? "Loading product options…"}</Text>}
          </> : <Text style={s.copy}>Choose a saved goal first.</Text> : <>
          <Text style={s.optionTitle}>Use a headline</Text><View style={s.chips}>{headlineExamples.map(item => <Pressable key={item} onPress={() => setHeadline(item)} style={s.chip}><Text style={s.chipText}>{item}</Text></Pressable>)}</View>
          <SheetTextInput value={headline} onChangeText={setHeadline} placeholder="Paste a headline…" maxLength={500} style={s.input}/><Action label="See headline impact" disabled={!headline.trim()} onPress={() => go("/impact", { headline: headline.trim() })}/>
          <Text style={s.optionTitle}>Apply a shock</Text>{shockPresets.map(item => <Pressable key={item.id} disabled={!dashboard} onPress={() => { applyShock(item.id); go("/(tabs)/predict"); }} style={s.option}>
            <Text style={s.optionTitle}>{item.title}</Text><Text style={s.copy}>{item.detail}{item.amount === null ? "" : ` · ${money(item.amount)}`}</Text></Pressable>)}
        </>}
      </BottomSheetScrollView>
    </BottomSheet>
    </View>
  </>;
}

function Action({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) { return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[s.primary, disabled && { opacity: .45 }]}><Text style={s.primaryText}>{label}</Text></Pressable>; }

const s = StyleSheet.create({ profile: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,.72)", alignItems: "center", justifyContent: "center", marginRight: 12 }, sheet: { backgroundColor: "#F5FBFE", borderRadius: 28 }, sheetContent: { padding: 18 }, sheetTitle: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }, title: { fontFamily: "Fraunces_600SemiBold", fontSize: 24, color: colors.ink, flex: 1 }, close: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.pale, alignItems: "center", justifyContent: "center" }, copy: { fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 17, color: colors.muted }, fit: { fontFamily: "Inter_700Bold", fontSize: 11, lineHeight: 17, color: colors.ink, marginTop: 4 }, option: { padding: 14, borderRadius: 18, backgroundColor: "rgba(255,255,255,.8)", marginBottom: 8 }, optionTitle: { fontFamily: "Fraunces_600SemiBold", fontSize: 17, color: colors.ink, marginBottom: 6 }, actions: { flexDirection: "row", justifyContent: "space-around", marginTop: 8 }, action: { fontFamily: "Inter_700Bold", color: colors.ink, minHeight: 44 }, note: { fontFamily: "Inter_400Regular", fontSize: 9, textAlign: "center", color: colors.muted }, primary: { minHeight: 44, backgroundColor: colors.pink, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 14 }, primaryText: { fontFamily: "Inter_700Bold", color: "white" }, chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 }, chip: { minHeight: 44, justifyContent: "center", paddingHorizontal: 12, borderRadius: 999, backgroundColor: colors.pale }, chipText: { fontFamily: "Inter_700Bold", fontSize: 10, color: colors.ink }, input: { minHeight: 48, borderWidth: 1, borderColor: "#CDE4EE", borderRadius: 15, paddingHorizontal: 13, fontFamily: "Inter_400Regular", color: colors.ink, backgroundColor: "white", marginBottom: 10 } });
