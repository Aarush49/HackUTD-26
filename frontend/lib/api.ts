type Money = string | number | null;

type Customer = { id: string; first_name: string | null };
export type Account = { id: string; type: string; nickname: string | null; balance: Money };
type Debt = { id: string; kind: string; balance: Money };
export type ApiGoal = {
  id: string;
  customer_id: string;
  name: string;
  target_amount: Money;
  target_date: string | null;
  funding_account_id: string | null;
  initial_funded_amount: Money;
  monthly_contribution: Money;
  news_context: string;
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
  goals: ApiGoal[];
  bills: Bill[];
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
type Projection = {
  monthly: Month[];
  interest_earned: Money;
  interest_paid: Money;
  missing_requirements: string[];
};
export type HeadlineAnalysis = {
  headline_exposure_status: "modeled" | "inputs_required" | "no_identified_exposure";
  event: { explanation: string };
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
export type Product = {
  kind: string;
  name: string;
  advantage: string;
  risk: string;
};

const apiOrigin = (process.env.EXPO_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

export const apiUrl = (path: string) => `${apiOrigin}/api${path}`;

export type GoalCreate = {
  customer_id: string; name: string; target_amount: string; target_date: string;
  monthly_contribution: string; initial_funded_amount: string; opening_source: string; news_context: string;
};
export type GoalRoots = {
  goal_id: string; saved: Money; can_contribute: boolean;
  roots: { id: string; source: string; amount: Money; date: string | null; provenance: string }[];
};
export type GoalNews = {
  id: string; goal_id: string; status: "watch" | "no_change" | "review"; text: string;
  sources: { index: number; title: string; url: string }[];
  checked_at: string; cached: boolean; suggestions_path: string;
};

export async function api<T>(path: string, body?: object, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiOrigin}/api${path}`, {
      method: body ? "POST" : "GET",
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

export async function resolveCustomerId(): Promise<string> {
  const configured = process.env.EXPO_PUBLIC_NESSIE_CUSTOMER_ID?.trim();
  if (configured) return configured;
  const customers = await api<Customer[]>("/customers");
  if (customers.length === 1) return customers[0].id;
  throw new Error(customers.length
    ? "Set EXPO_PUBLIC_NESSIE_CUSTOMER_ID to choose a sandbox customer."
    : "Nessie returned no customers for the configured key.");
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

export function displayDate(value: string | null | undefined, options?: Intl.DateTimeFormatOptions): string {
  if (!value) return "Unavailable";
  return new Intl.DateTimeFormat("en-US", {
    ...(options ?? { dateStyle: "medium" }), timeZone: "UTC",
  }).format(new Date(value));
}
