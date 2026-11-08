import { useEffect } from "react";
import type { ReactNode } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useFinanceStore } from "@/lib/store";
import { colors } from "@/lib/theme";
import { Button3D, Card, Eyebrow } from "./ui";

export function FinanceGate({ children }: { children?: ReactNode }) {
  const { status, error, customers, load, selectCustomer, changeCustomer } = useFinanceStore();
  useEffect(() => { void load(); }, [load]);
  if (status === "ready") return <>{children}</>;
  if (status === "choose") {
    return <Card>
      <Eyebrow>CHOOSE A NESSIE CUSTOMER</Eyebrow>
      {error && <Text accessibilityRole="alert">{error}</Text>}
      <View style={{gap:8, marginTop:12}}>{customers.map(customer => {
        const name = [customer.first_name, customer.last_name].filter(Boolean).join(" ") || "Sandbox customer";
        return <Button3D key={customer.id} tone="white" onClick={() => void selectCustomer(customer.id)}>
          {`${name} · ${customer.id.slice(-6)}`}
        </Button3D>;
      })}</View>
    </Card>;
  }
  if (status === "error") {
    return <Card><Eyebrow>FINANCIAL DATA UNAVAILABLE</Eyebrow>
      <View style={{gap:8, marginTop:12}}><Text accessibilityRole="alert">{error}</Text>
        <Button3D onClick={() => void load(true)}>Retry connection</Button3D>
        {customers.length > 0 && <Button3D tone="white" onClick={changeCustomer}>Choose a different customer</Button3D>}
      </View>
    </Card>;
  }
  return <Card><ActivityIndicator color={colors.ink}/><Text>Loading Nessie data…</Text></Card>;
}
