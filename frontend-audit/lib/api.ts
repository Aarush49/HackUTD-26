type Money = string | number | null;

export type Customer = { id: string; first_name: string | null; last_name: string | null };
export type CustomerOptions = { customers: Customer[]; default_customer_id: string | null };
export type Account = { id: string; type: string; nickname: string | null; balance: Money };
type Debt = { id: string; kind: string; balance: Money };
export type Goal = {
  id: string;
  name: string;
  target_amount: Money;
  target_date: string | null;
  funding_account_id: string | null;
  initial_funded_amount: Money;
  monthly_contribution: Money;
};
type Bill = {
  id: string;
  status: string | null;
  payee: string | null;
  nickname: string | null;
  amount: Money;
  payment_date: string | null;
  upcoming_payment_date: string | null;
};
export type Dashboard = {
  customer: Customer;
  accounts: Account[];
  debts: Debt[];
  goals: Goal[];
  bills: Bill[];
  transaction_activity: { date: string; inflow: Money; outflow: Money }[];
  known_account_net_worth: Money;
  liquid_reserves: Money;
  data_completeness: { retrieved_at: string };
};

type GoalProjection = { name: string; starting_amount: Money; completion_date: string | null };
type GoalChange = { goal_id: string; baseline: GoalProjection; scenario: GoalProjection };
type Month = {
  month: number;
  date: string;
  liquid_balance: Money;
  known_account_net_worth: Money;
  interest_paid: Money;
};
type Runway = {
  status: "shortfall" | "incomplete" | "no_shortfall_within_horizon";
  first_shortfall_month: number | null;
  first_shortfall_date: string | null;
};
export type Risk = Runway & {
  monthly: Month[];
  goal_changes: GoalChange[];
  missing_requirements: string[];
};
export type Projection = {
  monthly: Month[];
  interest_earned: Money;
  interest_paid: Money;
  missing_requirements: string[];
  financial_runway: Runway;
  goals: (GoalProjection & { goal_id: string })[];
};
export type HeadlineAnalysis = {
  headline_exposure_status: "modeled" | "inputs_required" | "no_identified_exposure";
  event: { type: string; explanation: string };
  affected_accounts: {
    account_id: string;
    exposure: string;
    assumed_baseline_apy?: Money;
    adjusted_apy?: Money;
    assumed_baseline_apr?: Money;
    adjusted_apr?: Money;
  }[];
  financial_impacts: { metric: string; change: Money }[];
  baseline_projection: Projection;
  scenario_projection: Projection;
  exposure_explanations: string[];
  goal_changes: GoalChange[];
};
export type Simulation = {
  baseline_projection: Projection;
  scenario_projection: Projection;
};
export type StrategyComparison = {
  baseline_projection: Projection;
  strategies: {
    name: string;
    scenario_projection: Projection;
    headline_exposure_status: HeadlineAnalysis["headline_exposure_status"] | null;
    exposure_explanations: string[];
  }[];
};
export type Product = {
  kind: string;
  name: string;
  advantage: string;
  risk: string;
};
export type FundingPlan = {
  amount: Money;
  sources: { account_id: string; name: string; amount: Money }[];
  uncovered_amount: Money;
  unknown_balance_count: number;
};
export type ProductComparison = {
  comparison_basis: string;
  options: {
    option: "take_action" | "do_nothing" | "wait";
    start_month: number | null;
    estimated_effects: { ending_known_account_net_worth: Money };
    minimum_modeled_liquidity: Money;
    risks: string[];
    projection: Projection;
  }[];
};

const apiOrigin = (process.env.EXPO_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

export async function api<T>(path: string, body?: object, signal?: AbortSignal, method = body ? "POST" : "GET"): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiOrigin}/api${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error("Could not reach the financial API. Check that FastAPI is running.");
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const detail = payload?.detail;
    throw new Error(
      typeof detail === "string" ? detail : detail?.message ?? detail?.[0]?.msg ?? `API returned HTTP ${response.status}.`,
    );
  }
  return response.json();
}

export function number(value: Money | undefined): number | null {
  if (value == null || value === "") return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
export function money(value: Money | undefined): string {
  const amount = number(value);
  return amount === null ? "Unavailable" : usd.format(amount);
}

export function runwayLabel(risk: Runway | null): string {
  if (risk?.first_shortfall_month === 0) return "Now";
  if (risk?.first_shortfall_month != null) return `Month ${risk.first_shortfall_month}`;
  return risk?.status === "no_shortfall_within_horizon" ? "None projected" : "Unavailable";
}

export function displayDate(value: string | null | undefined, options?: Intl.DateTimeFormatOptions): string {
  if (!value) return "Unavailable";
  return new Intl.DateTimeFormat("en-US", {
    ...(options ?? { dateStyle: "medium" }), timeZone: "UTC",
  }).format(new Date(value));
}
