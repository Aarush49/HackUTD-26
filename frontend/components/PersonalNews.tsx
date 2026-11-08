// Host adapter for Canopy's fixed demo news goals.
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Text } from "react-native";
import { api, displayDate, resolveCustomerId } from "@/lib/api";
import { Badge, Button3D, Card, Eyebrow } from "./ui";
import { NewsProvider, NewsSetup as PortableSetup, PersonalNews as PortableNews } from "../features/personal-news/PersonalNews";

const goalNames = ["Japan trip", "Buy a house", "New car"];

function Provider({ children }: { children: ReactNode }) {
  return <NewsProvider value={{ api, displayDate, goalNames, fixedGoals: true, ui: { Badge, Button3D, Card, Eyebrow } }}>{children}</NewsProvider>;
}
function Identity({ customerId, children }: { customerId?: string; children: (id: string) => ReactNode }) {
  const [id, setId] = useState(customerId);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setError(""); setId(customerId);
    if (!customerId) void resolveCustomerId().then(value => { if (active) setId(value); }, reason => { if (active) setError(reason.message); });
    return () => { active = false; };
  }, [customerId, retry]);
  if (!id) return <Card><Text>{error || "Loading news profile…"}</Text>{!!error && <Button3D onClick={() => setRetry(value => value + 1)}>Retry news profile</Button3D>}</Card>;
  return <Provider>{children(id)}</Provider>;
}
export function NewsSetup(props: { customerId?: string; onSaved: () => void }) {
  return <Identity customerId={props.customerId}>{id => <PortableSetup key={id} customerId={id} onSaved={props.onSaved}/>}</Identity>;
}
export function PersonalNews(props: { customerId?: string }) {
  return <Identity customerId={props.customerId}>{id => <PortableNews key={id} customerId={id}/>}</Identity>;
}
