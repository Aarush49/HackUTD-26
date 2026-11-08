export type Tab = 'today' | 'picture' | 'whatif' | 'goals' | 'predict';
export type ChartPoint = { label: string; value?: number; projected?: number };
export type Goal = {
  id: string;
  title: string;
  saved: number;
  target: number;
  eta: string;
  growth: number;
  note: string;
};
export type Account = {
  id: string;
  name: string;
  kind: string;
  balance: number;
  rate?: number;
};
export type ProjectedLoss = {
  id: string;
  title: string;
  minimum: number;
  maximum: number;
  reason: string;
  action: string;
};
export type PicturePeriod = {
  netPosition: number;
  change: number;
  chart: ChartPoint[];
};
export type MockData = {
  profile: { name: string; demoTag: string; todayLabel: string };
  today: { headline: string };
  picture: {
    periods: Record<'Week' | 'Month' | 'Year', PicturePeriod>;
    accounts: Account[];
    health: { runway: string; cushion: number; interestDrag: number };
  };
  goals: Goal[];
  losses: ProjectedLoss[];
  simulate: {
    monthly: number;
    years: number;
    rate: number;
    plans: { name: string; color: string; points: ChartPoint[] }[];
  };
  impact: {
    headlines: string[];
    active: string;
    rows: { label: string; before: string; after: string; range: string }[];
  };
};
