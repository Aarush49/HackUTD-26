import Constants from "expo-constants";
import { Platform } from "react-native";

type Money = string | number | null;

type Customer = { id: string; first_name: string | null };
export type Account = { id: string; type: string; nickname: string | null; balance: Money };
type Debt = { id: string; kind: string; balance: Money };
type Goal = {
  id: string;
  name: string;
  target_amount: Money;
  target_date: string | null;
  funding_account_id: string | null;
  initial_funded_amount: Money;
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

function getHostFromUri(uri?: string | null): string | null {
  if (!uri) return null;
  const withoutProtocol = uri.replace(/^[a-zA-Z]+:\/\//, "");
  const hostWithPort = withoutProtocol.split("/")[0];
  const host = hostWithPort.split(":")[0];
  return host || null;
}

function isLoopback(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname.startsWith("127.")
  );
}

export function resolveApiOrigin(rawUrl?: string): string {
  const configured = (rawUrl || process.env.EXPO_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");
  const withProtocol = /^https?:\/\//i.test(configured) ? configured : `http://${configured}`;

  try {
    const parsed = new URL(withProtocol);

    // If a non-loopback URL is explicitly configured, leave it untouched
    if (!isLoopback(parsed.hostname)) {
      return configured;
    }

    // 1. Web: preserve loopback on the local device, but connect to the network host on other devices
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.location?.hostname) {
        const browserHost = window.location.hostname;
        if (browserHost) {
          parsed.hostname = browserHost;
          const basePath = parsed.pathname && parsed.pathname !== "/" ? parsed.pathname.replace(/\/+$/, "") : "";
          return `${parsed.origin}${basePath}`;
        }
      }
      return configured;
    }

    // 2. Mobile / Native: discover the machine running Metro bundler
    const hostUri =
      Constants.expoConfig?.hostUri ??
      (Constants as any).expoGoConfig?.debuggerHost ??
      (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ??
      (Constants as any).manifest?.debuggerHost;

    let detectedHost = getHostFromUri(hostUri);
    if (!detectedHost) {
      detectedHost = getHostFromUri(Constants.experienceUrl || Constants.linkingUri);
    }

    if (detectedHost) {
      // Map loopback to the host alias if running inside an Android emulator
      if (Platform.OS === "android" && isLoopback(detectedHost)) {
        detectedHost = "10.0.2.2";
      }
      parsed.hostname = detectedHost;
      const basePath = parsed.pathname && parsed.pathname !== "/" ? parsed.pathname.replace(/\/+$/, "") : "";
      return `${parsed.origin}${basePath}`;
    }

    // Android emulator fallback
    if (Platform.OS === "android") {
      parsed.hostname = "10.0.2.2";
      const basePath = parsed.pathname && parsed.pathname !== "/" ? parsed.pathname.replace(/\/+$/, "") : "";
      return `${parsed.origin}${basePath}`;
    }

    return configured;
  } catch {
    return configured;
  }
}

export function getApiOrigin(): string {
  return resolveApiOrigin();
}

export const apiOrigin = getApiOrigin();

export async function api<T>(path: string, body?: object, signal?: AbortSignal): Promise<T> {
  const origin = getApiOrigin();
  let response: Response;
  try {
    response = await fetch(`${origin}/api${path}`, {
      method: body ? "POST" : "GET",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error(`Could not reach the financial API at ${origin}. Check that FastAPI is running.`);
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
