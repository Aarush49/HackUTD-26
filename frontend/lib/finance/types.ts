export type Tab = 'today' | 'picture' | 'whatif' | 'goals' | 'predict';
export type ChartPoint = { label: string; value?: number; projected?: number };
export type Goal = {
  id: string;
  title: string;
  saved?: number;
  target?: number;
  eta: string;
  growth: number;
  note: string;
};
export type Account = {
  id: string;
  name: string;
  kind: string;
  balance?: number;
  rate?: number;
};
export type ProjectedLoss = {
  id: string;
  title: string;
  minimum?: number;
  maximum?: number;
  reason: string;
  action: string;
};
export type PicturePeriod = {
  netPosition?: number;
  projectedBalance?: number;
  change?: number;
  chart: ChartPoint[];
};
export type FinanceData = {
  profile: { name: string; todayLabel: string };
  today: { headline: string };
  picture: {
    periods: Record<'Week' | 'Month' | 'Year', PicturePeriod>;
    accounts: Account[];
    health: { runway: string; cushion?: number; interestDrag?: number };
  };
  goals: Goal[];
  losses: ProjectedLoss[];
  simulate: {
    settings?: Record<keyof Simulation, SliderSettings>;
    openingBalance?: number;
    growthPremium?: number;
    plans: { name: string; color: string }[];
  };
  impact: {
    headlines: string[];
    active: string;
  };
};

export type Simulation = { monthly: number; years: number; rate: number };
export type SliderSettings = {
  initial: number;
  min: number;
  max: number;
  step: number;
};
