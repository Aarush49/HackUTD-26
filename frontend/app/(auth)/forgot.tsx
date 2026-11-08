import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { SkyBackground } from "@/components/Background";
import { Card, Eyebrow, Heading, TrustTag } from "@/components/ui";
import { colors } from "@/lib/theme";

export default function Forgot() {
  return <SkyBackground><View style={s.page}><View style={s.trust}><TrustTag/></View><Card><Eyebrow>RECOVERY STUB</Eyebrow><Heading accent="growing.">Keep</Heading>
    <Text style={s.copy}>Password recovery will connect to a real authentication service later.</Text><Link href="/(auth)/login" style={s.link}>Back to login</Link></Card>
    <Text style={s.footer}>Synthetic demo data. Informational, not financial advice.</Text></View></SkyBackground>;
}

const s = StyleSheet.create({ page: { flex: 1, justifyContent: "center", padding: 18 }, trust: { alignItems: "flex-end", marginBottom: 10 }, copy: { fontFamily: "Inter_400Regular", color: colors.muted, lineHeight: 20, marginVertical: 18 }, link: { fontFamily: "Inter_700Bold", color: colors.pink, minHeight: 44 }, footer: { fontFamily: "Inter_400Regular", fontSize: 9, color: colors.muted, textAlign: "center", marginTop: 18 } });
