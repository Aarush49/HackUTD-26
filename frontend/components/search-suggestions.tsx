import { Linking, Pressable, StyleSheet, Text } from "react-native";
import { colors } from "@/lib/theme";

export function SearchSuggestions({ url }: { url: string }) {
  return <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(url)} style={s.link}>
    <Text style={s.text}>View Google Search sources and suggestions ↗</Text>
  </Pressable>;
}
const s = StyleSheet.create({ link: { minHeight: 44, justifyContent: "center" }, text: { color: colors.ink, fontFamily: "Inter_700Bold", fontSize: 12, textDecorationLine: "underline" } });
