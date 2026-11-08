import { create } from "zustand";
import { api, displayDate, number } from "@/lib/api";
import type { Customer, CustomerOptions, Dashboard, Product, Risk } from "@/lib/api";

export const headlineExamples = ["Gas prices rise 10%", "Fed holds rates", "Inflation cools"];
export const shockPresets = [
  { id: "repair", title: "Car repair", amount: 2400, detail: "One surprise this month", input: { unexpected_expense: 2400 } },
  { id: "income", title: "Lose income", amount: null, detail: "Two months without pay", input: { income_reduction: 1, income_reduction_months: 2 } },
  { id: "rent", title: "Rent rises", amount: 200, detail: "Per month for 12 months", input: { monthly_spending_increase: 200, monthly_spending_increase_months: 12 } },
] as const;

export type Goal = {
  id: string;
  title: string;
  saved: number | null;
  target: number | null;
  eta: string;
  growth: number | null;
};

let activeRequest: AbortController | null = null;

type State = {
  dashboard: Dashboard | null;
  baseline: Risk | null;
  baselineError: string | null;
  products: Product[] | null;
  productsError: string | null;
  status: "idle" | "loading" | "choose" | "ready" | "error";
  customers: Customer[];
  error: string | null;
  sheet: null | "whatif" | "goal" | "sapling";
  selectedGoal: string | null;
  shock: string | null;
  predictMode: "shocks" | "simulate";
  period: "Week" | "Month" | "Year";
  sim: { monthly: number; years: number; rate: number };
  load: (retry?: boolean) => Promise<void>;
  selectCustomer: (id: string) => Promise<void>;
  changeCustomer: () => void;
  refresh: () => Promise<void>;
  openSheet: (sheet: State["sheet"]) => void;
  closeSheet: () => void;
  selectGoal: (id: string) => void;
  inspectGoal: (id: string) => void;
  applyShock: (id: string) => void;
  clearShock: () => void;
  setPredictMode: (m: State["predictMode"]) => void;
  setPeriod: (p: State["period"]) => void;
  setSim: (k: keyof State["sim"], v: number) => void;
};

export function goalViews(dashboard: Dashboard | null, baseline: Risk | null): Goal[] {
  if (!dashboard) return [];
  return dashboard.goals.map(goal => {
    const projection = baseline?.goal_changes.find(change => change.goal_id === goal.id)?.baseline;
    const account = dashboard.accounts.find(account => account.id === goal.funding_account_id);
    const balance = number(account?.balance);
    const initial = number(goal.initial_funded_amount);
    const saved = projection ? number(projection.starting_amount) : goal.funding_account_id
      ? balance === null || (initial !== null && initial > Math.max(0, balance)) ? null : initial ?? Math.max(0, balance)
      : initial ?? 0;
    const target = number(goal.target_amount);
    return {
      id: goal.id, title: goal.name, saved, target,
      eta: projection?.completion_date ? displayDate(projection.completion_date) : "Unavailable",
      growth: saved === null || target === null || target <= 0 ? null : saved / target,
    };
  });
}

export const useFinanceStore = create<State>((set, get) => ({
  dashboard: null, baseline: null, baselineError: null, products: null, productsError: null,
  status: "idle", customers: [], error: null, sheet: null, selectedGoal: null,
  shock: null, predictMode: "shocks", period: "Month",
  sim: { monthly: 650, years: 8, rate: 6.5 },
  load: async (retry = false) => {
    const { status } = get();
    if (status !== "idle" && !(retry && status === "error")) return;
    set({ status: "loading", error: null });
    try {
      const { customers, default_customer_id: defaultId } = await api<CustomerOptions>("/nessie/customer-options");
      set({ customers });
      if (!customers.length) throw new Error("Nessie returned no customers for this sandbox key.");
      const configured = process.env.EXPO_PUBLIC_NESSIE_CUSTOMER_ID?.trim();
      const preferred = configured || defaultId;
      if (preferred && !customers.some(customer => customer.id === preferred)) {
        set({ status: "choose", error: "The configured customer is unavailable for this key. Choose a customer below." });
      } else if (preferred || customers.length === 1) {
        await get().selectCustomer(preferred || customers[0].id);
      } else {
        set({ status: "choose" });
      }
    } catch (error) {
      set({ status: "error", error: error instanceof Error ? error.message : "Could not load Nessie customers." });
    }
  },
  selectCustomer: async id => {
    activeRequest?.abort();
    const controller = new AbortController();
    activeRequest = controller;
    const { signal } = controller;
    set({ status: "loading", dashboard: null, baseline: null, baselineError: null, error: null,
      selectedGoal: null, shock: null, sheet: null });
    try {
      const dashboard = await api<Dashboard>(`/dashboard/${encodeURIComponent(id)}`, undefined, signal);
      if (signal.aborted) return;
      set({ dashboard, status: "ready" });
      void api<Risk>("/risk/predict", { customer_id: id }, signal).then(
        baseline => { if (!signal.aborted) set({ baseline }); },
        error => { if (!signal.aborted) set({ baselineError: error.message }); },
      );
      void api<Product[]>("/products", undefined, signal).then(
        products => { if (!signal.aborted) set({ products, productsError: null }); },
        error => { if (!signal.aborted) set({ productsError: error.message }); },
      );
    } catch (error) {
      if (!signal.aborted) set({ status: "error", error: error instanceof Error ? error.message : "Could not load the financial profile." });
    }
  },
  changeCustomer: () => {
    activeRequest?.abort();
    set({ status: "choose", dashboard: null, baseline: null, baselineError: null, error: null,
      selectedGoal: null, shock: null, sheet: null });
  },
  refresh: async () => {
    const id = get().dashboard?.customer.id;
    if (id) await get().selectCustomer(id);
  },
  openSheet: sheet => set({ sheet }),
  closeSheet: () => set({ sheet: null }),
  selectGoal: id => set({ selectedGoal: id, sheet: "goal" }),
  inspectGoal: id => set({ selectedGoal: id, sheet: "sapling" }),
  applyShock: id => set({ shock: id, sheet: null, predictMode: "shocks" }),
  clearShock: () => set({ shock: null }),
  setPredictMode: predictMode => set({ predictMode }),
  setPeriod: period => set({ period }),
  setSim: (k, v) => set(s => ({ sim: { ...s.sim, [k]: v } })),
}));
