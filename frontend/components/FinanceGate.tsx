import { useEffect } from "react";
import type { ReactNode } from "react";
import { ActivityIndicator, Text } from "react-native";
import { useFinanceStore } from "@/lib/store";
import { Card, Button3D } from "./ui";
import { colors } from "@/lib/theme";

export function FinanceGate({ children }: { children: ReactNode }) {
  const { status, load, error } = useFinanceStore();
  useEffect(() => { void load(); }, [load]);
  if (status === "ready") return <>{children}</>;
  return <Card>{status === "error" ? <><Text accessibilityRole="alert">{error}</Text>
    <Button3D onClick={() => void load(true)}>Retry connection</Button3D></> : <ActivityIndicator color={colors.ink}/>}</Card>;
}
