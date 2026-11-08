export type Tab = "today" | "picture" | "whatif" | "goals" | "predict";
export type ChartPoint = { label: string; value?: number; projected?: number };
export type Goal = { id: string; title: string; saved: number; target: number; eta: string; growth: number; note: string };
export type Account = { id: string; name: string; kind: string; balance: number; rate?: number };
export type Shock = { id: string; title: string; amount: number; detail: string };
export type FundingSource = { name: string; amount: number; cost: string; color: string };
export type PicturePeriod = { netPosition: number; change: number; chart: ChartPoint[] };
export type MockData = {
  profile: { name: string; demoTag: string; todayLabel: string };
  today: { gardenDelta: number; timeline: { day: string; label: string; amount: number; kind: string }[]; headline: string };
  picture: { netPosition: number; change: number; chart: ChartPoint[]; periods: Record<"Week" | "Month" | "Year", PicturePeriod>; accounts: Account[]; health: { runway: string; cushion: number; interestDrag: number } };
  goals: Goal[];
  shocks: Shock[];
  waterfall: FundingSource[];
  simulate: { monthly: number; years: number; rate: number; plans: { name: string; color: string; points: ChartPoint[] }[] };
  impact: { headlines: string[]; active: string; rows: { label: string; before: string; after: string; range: string }[] };
};
