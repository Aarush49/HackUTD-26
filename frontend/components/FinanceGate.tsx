import { useEffect } from "react";
import type { ReactNode } from "react";
import { ActivityIndicator, Text } from "react-native";
import { useFinanceStore } from "@/lib/store";
import { Card, Button3D } from "./ui";
import { colors } from "@/lib/theme";
export function FinanceGate({ children }: { children: ReactNode }) {
  const { snapshot, loadFailed, load } = useFinanceStore();
  useEffect(() => {
    if (snapshot) return;
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [!!snapshot, load]);
  if (snapshot) return <>{children}</>;
  return <Card>{loadFailed ? <><Text accessibilityRole="alert">Financial data is unavailable.</Text>
    <Button3D onClick={() => void load(new AbortController().signal)}>Retry connection</Button3D></> : <ActivityIndicator color={colors.ink}/>}</Card>;
}
