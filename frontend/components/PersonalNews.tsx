// Project-specific adapter. The feature itself has no app aliases or store imports.
import { api, displayDate } from "@/lib/api";
import { useFinanceStore } from "@/lib/store";
import { Badge, Button3D, Card, Eyebrow } from "./ui";
import { NewsProvider, NewsSetup as PortableSetup, PersonalNews as PortableNews } from "../features/personal-news/PersonalNews";
import type { ReactNode } from "react";

function Provider({ children }: { children: ReactNode }) {
  const goals = useFinanceStore(state => state.dashboard?.goals);
  return <NewsProvider value={{ api, displayDate, goalNames: (goals ?? []).map(goal => goal.name), ui: { Badge, Button3D, Card, Eyebrow } }}>{children}</NewsProvider>;
}
export function NewsSetup(props: { customerId: string; onSaved: () => void }) {
  return <Provider><PortableSetup {...props}/></Provider>;
}
export function PersonalNews(props: { customerId: string }) {
  return <Provider><PortableNews {...props}/></Provider>;
}
