import type { NessieSnapshot } from './api';
import type { FinanceData, PicturePeriod, Simulation } from './types';

const monthDays = 365.25 / 12;
const dayMs = 86_400_000;
const dateAt = (date: string) => new Date(`${date}T00:00:00Z`);
const offsetDate = (date: Date, days: number) =>
  new Date(date.getTime() + days * dayMs);
const formatDate = (date: Date, options: Intl.DateTimeFormatOptions) =>
  date.toLocaleDateString('en-US', { ...options, timeZone: 'UTC' });
const sum = (values: number[]) =>
  values.reduce((total, value) => total + value, 0);

const accountRows = [
  { id: 'c1', name: 'Everyday checking', kind: 'Cash', nessieType: 'checking' },
  {
    id: 's1',
    name: 'High-yield savings',
    kind: 'Savings',
    nessieType: 'savings',
  },
  { id: 'cd', name: '12-month CD', kind: 'Savings' },
  { id: 'ira', name: 'IRA + 401(k)', kind: 'Investments' },
  { id: 'cc', name: 'Travel card', kind: 'Credit', nessieType: 'credit card' },
  { id: 'auto', name: 'Auto loan', kind: 'Loans' },
  { id: 'mort', name: 'Mortgage', kind: 'Loans' },
];
const goalRows = [
  { id: 'japan', title: 'Japan in spring' },
  { id: 'home', title: 'Home cushion' },
  { id: 'car', title: 'Next car' },
];
const headline = 'Fed signals a slower path for rate cuts';
const plans = [
  { name: 'Keep cash', color: '#94A3B8' },
  { name: 'Balanced', color: '#38BDF8' },
  { name: 'Growth', color: '#FF2E93' },
];

export const demoSnapshot: NessieSnapshot = {
  accounts: [],
  asOf: '2026-11-07',
  dailyChanges: {
    '2026-11-02': 50,
    '2026-11-03': 70,
    '2026-11-04': -40,
    '2026-11-05': 150,
    '2026-11-06': 120,
  },
  historyStart: '2026-10-01',
  income: 5700,
  cashFlow: 3480,
  runway: 5.2,
  liquidReserves: 22540,
  inputs: {
    accounts: {
      c1: { balance: 3240 },
      s1: { balance: 12800, rate: 4.35 },
      cd: { balance: 6500, rate: 4.65 },
      ira: { balance: 68400 },
      cc: { balance: -1840, rate: 22.4 },
      auto: { balance: -11260, rate: 6.1 },
      mort: { balance: -29600, rate: 4 },
    },
    cashFlow: { income: 5700, spending: 2220, priorMonthlyGrowth: 650 },
    goals: {
      japan: { saved: 4200, target: 6500, eta: '2027-04-18', change: 6 },
      home: { saved: 12800, target: 18000, eta: '2027-08-04' },
      car: { saved: 3600, target: 14000, eta: '2028-11-20', change: 3 },
    },
    risk: { inflation: 3.1, monthlyFees: 10, incomeReduction: 0.7, rangeMargin: 18 },
    simulation: {
      monthly: { initial: 650, min: 100, max: 1800, step: 50 },
      years: { initial: 8, min: 2, max: 20, step: 1 },
      rate: { initial: 6.5, min: 2, max: 12, step: 0.5 },
      growthPremium: 2.5,
    },
    impact: {
      'Fed holds rates': [-180, -0.25, -0.3, 9],
      'Inflation cools': [120, -0.15, -0.2, -5],
      'Oil prices climb': [-240, 0, 0.15, 12],
      range: [80, 0.2, 0.3, 3],
    },
    display: {
      accountRates: { s1: 4.35, cd: 4.65, cc: 22.4, auto: 6.1, mort: 4 },
      defaultImpact: [-180, -0.25, -0.3, 9],
    },
  },
};

export const money = (value: number | undefined) =>
  value === undefined
    ? '—'
    : new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(value);

export function buildData(snapshot?: NessieSnapshot): FinanceData {
  const inputs = snapshot?.inputs;
  const accounts = accountRows.map(({ nessieType, ...row }) => {
    const matching =
      snapshot?.accounts.filter((account) => {
        const namedRow = accountRows.find(
          (candidate) =>
            !candidate.nessieType &&
            account.nickname?.toLowerCase() === candidate.name.toLowerCase()
        );
        return namedRow
          ? namedRow.id === row.id
          : account.type.toLowerCase() === nessieType;
      }) ?? [];
    const balances = matching.flatMap(({ balance }) =>
      balance === null ? [] : [balance]
    );
    const demo = inputs?.accounts?.[row.id];
    const balance = balances.length
      ? sum(balances) * (row.kind === 'Credit' || row.kind === 'Loans' ? -1 : 1)
      : demo?.balance;
    return {
      ...row,
      balance,
      rate: demo?.rate ?? inputs?.display?.accountRates[row.id],
    };
  });
  const knownBalances = accounts.flatMap(({ balance }) =>
    balance === undefined ? [] : [balance]
  );
  const netPosition = knownBalances.length ? sum(knownBalances) : undefined;
  const income = snapshot?.income ?? inputs?.cashFlow?.income;
  const cashFlow =
    snapshot?.cashFlow ??
    (inputs?.cashFlow
      ? (income ?? inputs.cashFlow.income) - inputs.cashFlow.spending
      : undefined);
  const liquid =
    snapshot?.liquidReserves ??
    (inputs?.accounts
      ? sum(
          accounts
            .filter(({ kind }) => kind === 'Cash' || kind === 'Savings')
            .map(({ balance }) => balance ?? 0)
        )
      : undefined);
  const runway =
    snapshot?.runway ??
    (liquid !== undefined && inputs?.cashFlow && inputs.cashFlow.spending > 0
      ? liquid / inputs.cashFlow.spending
      : undefined);
  const interest = accounts.flatMap(({ balance, rate }) =>
    balance !== undefined && balance < 0 && rate !== undefined
      ? [(-balance * rate) / 100]
      : []
  );
  const interestDrag = interest.length ? sum(interest) : undefined;
  const today = new Date();
  const asOf = snapshot ? dateAt(snapshot.asOf) : today;
  const changes = Object.entries(snapshot?.dailyChanges ?? {});

  function balanceAt(days: number) {
    if (netPosition === undefined || !snapshot) return undefined;
    if (days === 0) return netPosition;
    if (days > 0)
      return cashFlow === undefined
        ? undefined
        : netPosition + (cashFlow * days) / monthDays;
    const date = offsetDate(asOf, days).toISOString().slice(0, 10);
    const observedFrom = snapshot.historyStart;
    const boundary = observedFrom && observedFrom > date ? observedFrom : date;
    const observedChange = sum(
      changes.filter(([day]) => day > boundary).map(([, value]) => value)
    );
    if (observedFrom && date >= observedFrom)
      return netPosition - observedChange;
    const priorGrowth = inputs?.cashFlow?.priorMonthlyGrowth;
    if (priorGrowth === undefined) return undefined;
    const unobservedDays = observedFrom
      ? (dateAt(observedFrom).getTime() - dateAt(date).getTime()) / dayMs
      : -days;
    return (
      netPosition - observedChange - (priorGrowth * unobservedDays) / monthDays
    );
  }

  function period(
    history: number[],
    future: number,
    label: (date: Date) => string,
    showNow: boolean
  ): PicturePeriod {
    const first = balanceAt(history[0]);
    const change =
      first && netPosition !== undefined
        ? Math.round(((netPosition - first) / Math.abs(first)) * 1000) / 10
        : undefined;
    return {
      netPosition,
      change,
      chart: [...history, future].map((days, index) => {
        const value = balanceAt(days);
        return {
          label: showNow && days === 0 ? 'Now' : label(offsetDate(asOf, days)),
          value: days <= 0 ? value : undefined,
          projected: index >= history.length - 2 ? value : undefined,
        };
      }),
    };
  }

  const goals = goalRows.map((row) => {
    const goal = inputs?.goals?.[row.id];
    const notes: Record<string, string> = {
      japan: `Up ${goal?.change ?? '—'}% because your travel transfer landed.`,
      home: `Steady—your runway is holding above ${runway === undefined ? '—' : Math.floor(runway)} months.`,
      car: `Down ${goal?.change ?? '—'}% after a higher repair estimate.`,
    };
    return {
      ...row,
      saved: goal?.saved,
      target: goal?.target,
      eta: goal
        ? formatDate(dateAt(goal.eta), {
            month: 'short',
            day: '2-digit',
            year: 'numeric',
          })
        : '—',
      growth: goal ? goal.saved / goal.target : 0,
      note: notes[row.id],
    };
  });
  const risk = inputs?.risk;
  const card = accounts.find(({ id }) => id === 'cc');
  const cardInterest =
    card?.balance !== undefined && card.rate !== undefined
      ? (Math.max(0, -card.balance) * card.rate) / 100
      : undefined;
  const checking = accounts.find(({ id }) => id === 'c1')?.balance;
  const losses = [
    {
      id: 'card-interest',
      title: 'Card interest',
      cost: cardInterest,
      reason: 'Your travel card balance is carrying a high estimated rate.',
      action: 'Pay the highest-rate balance first.',
    },
    {
      id: 'idle-cash',
      title: 'Idle cash',
      cost:
        risk && checking !== undefined
          ? (Math.max(0, checking) * risk.inflation) / 100
          : undefined,
      reason:
        'Part of your cash may earn less than the estimated inflation rate.',
      action: 'Compare insured higher-yield cash options.',
    },
    {
      id: 'fees',
      title: 'Account fees',
      cost: risk ? risk.monthlyFees * 12 : undefined,
      reason:
        'Recurring account and service fees reduce the balance over time.',
      action: 'Review and cancel avoidable fees.',
    },
    {
      id: 'headline-income',
      title: 'Income pressure',
      cost:
        risk && income !== undefined
          ? ((income * risk.incomeReduction) / 100) * 12
          : undefined,
      reason: 'The selected headline may soften near-term income growth.',
      action: 'Keep more of the monthly contribution liquid.',
    },
  ].map(({ cost, ...row }) => ({
    ...row,
    minimum:
      risk && cost !== undefined
        ? cost * (1 - risk.rangeMargin / 100)
        : undefined,
    maximum:
      risk && cost !== undefined
        ? cost * (1 + risk.rangeMargin / 100)
        : undefined,
  }));

  return {
    profile: {
      name: 'Jordan',
      todayLabel:
        today.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase() +
        ' · ' +
        today
          .toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
          .toUpperCase(),
    },
    today: { headline },
    picture: {
      periods: {
        Week: period(
          [-5, -4, -3, -2, -1, 0],
          1,
          (date) => formatDate(date, { weekday: 'short' }),
          false
        ),
        Month: period(
          [-28, -21, -14, -7, 0],
          7,
          (date) => formatDate(date, { month: 'short', day: 'numeric' }),
          true
        ),
        Year: period(
          [-335, -275, -214, -153, -92, -31, 0],
          92,
          (date) => formatDate(date, { month: 'short' }),
          true
        ),
      },
      accounts,
      health: {
        runway: runway === undefined ? '—' : `${Number(runway.toFixed(1))} mo`,
        cushion: cashFlow,
        interestDrag,
      },
    },
    goals,
    losses,
    simulate: {
      settings: inputs?.simulation,
      openingBalance: liquid,
      growthPremium: inputs?.simulation?.growthPremium,
      plans,
    },
    impact: {
      headlines: ['Fed holds rates', 'Inflation cools', 'Oil prices climb'],
      active: 'Fed holds rates',
    },
  };
}

export function simulationChart(
  data: FinanceData['simulate'],
  sim: Simulation
) {
  if (data.openingBalance === undefined || data.growthPremium === undefined)
    return [];
  const openingBalance = data.openingBalance;
  const rates = [0, sim.rate, sim.rate + data.growthPremium].map(
    (rate) => rate / 1200
  );
  return [0, 0.25, 0.5, 0.75, 1].map((fraction) => {
    const years = sim.years * fraction;
    const months = Math.round(years * 12);
    return Object.fromEntries([
      ['label', years ? `${years}y` : 'Now'],
      ...data.plans.map((plan, index) => {
        const rate = rates[index];
        const growth = (1 + rate) ** months;
        const contributions =
          sim.monthly * (rate ? (growth - 1) / rate : months);
        return [plan.name, Math.round(openingBalance * growth + contributions)];
      }),
    ]);
  });
}

export function impactRows(
  snapshot: NessieSnapshot | undefined,
  selected: string
) {
  const inputs = snapshot?.inputs;
  const presets = inputs?.impact;
  const effects =
    presets && Object.hasOwn(presets, selected)
      ? presets[selected]
      : inputs?.display?.defaultImpact;
  const range = inputs?.impact?.range;
  const income = snapshot?.income ?? inputs?.cashFlow?.income;
  const goal = inputs?.goals?.japan?.eta;
  const currency = (value: number) => `${money(value)} est.`;
  const percent = (value: number) => `${Number(value.toFixed(2))}%`;
  const estimatedPercent = (value: number) => `${percent(value)} est.`;
  const date = (value: number) =>
    `${formatDate(new Date(value), { month: 'short', day: 'numeric' })} est.`;
  return [
    {
      label: 'Income',
      baseline: income,
      format: currency,
      formatRange: money,
      scale: 1,
    },
    {
      label: 'Savings APY',
      baseline: inputs?.accounts?.s1?.rate,
      format: estimatedPercent,
      formatRange: percent,
      scale: 1,
    },
    {
      label: 'Card APR',
      baseline: inputs?.accounts?.cc?.rate,
      format: estimatedPercent,
      formatRange: percent,
      scale: 1,
    },
    {
      label: 'Japan goal',
      baseline: goal ? dateAt(goal).getTime() : undefined,
      format: date,
      formatRange: (days: number) => String(days),
      scale: dayMs,
    },
  ].map(({ label, baseline, format, formatRange, scale }, index) => {
    const effect = effects?.[index];
    const margin = range?.[index];
    const after =
      effect !== undefined && baseline !== undefined
        ? baseline + effect * scale
        : undefined;
    let estimatedRange = '—';
    if (after !== undefined && effect !== undefined && margin !== undefined) {
      const center = index === 1 || index === 2 ? after : effect;
      const unit = index === 3 ? ' days' : '';
      estimatedRange = `${formatRange(center - margin)}–${formatRange(center + margin)}${unit} estimated`;
    }
    return {
      label,
      before: baseline === undefined ? '—' : format(baseline),
      after: after === undefined ? '—' : format(after),
      range: estimatedRange,
    };
  });
}
