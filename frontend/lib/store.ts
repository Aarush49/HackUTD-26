import { create } from "zustand";
import { api, displayDate, number, resolveCustomerId } from "@/lib/api";
import type { Dashboard, Product, Risk } from "@/lib/api";

export const headlineExamples = ["Fed holds rates", "Inflation cools", "Oil prices climb"];
export const shockPresets = [
  { id: "repair", title: "Car repair", amount: 2400, detail: "One surprise this month", input: { unexpected_expense: 2400 } },
  { id: "income", title: "Lose income", amount: null, detail: "Two months without pay", input: { income_reduction: 1, income_reduction_months: 2 } },
  { id: "rent", title: "Rent rises", amount: null, detail: "Monthly rent shock unavailable", input: null },
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
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
  sheet: null | "whatif" | "goal" | "sapling";
  selectedGoal: string | null;
  shock: string | null;
  predictMode: "news" | "break" | "simulate";
  period: "Week" | "Month" | "Year";
  sim: { monthly: number; years: number; rate: number };
  load: (retry?: boolean) => Promise<void>;
  refresh: () => Promise<void>;
  reset: () => void;
  openSheet: (sheet: State["sheet"]) => void;
  closeSheet: () => void;
  selectGoal: (id: string) => void;
  inspectGoal: (id: string) => void;
  applyShock: (id: string) => void;
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
  status: "idle", error: null, sheet: null, selectedGoal: null,
  shock: null, predictMode: "news", period: "Month",
  sim: { monthly: 650, years: 8, rate: 6.5 },
  load: async (retry = false) => {
    const { status } = get();
    if (status !== "idle" && !(retry && status === "error")) return;
    activeRequest?.abort();
    const controller = new AbortController();
    activeRequest = controller;
    const { signal } = controller;
    set({ status: "loading", error: null });
    try {
      const id = await resolveCustomerId();
      if (signal.aborted) return;
      const dashboard = await api<Dashboard>(`/dashboard/${encodeURIComponent(id)}`, undefined, signal);
      if (signal.aborted) return;
      set({ dashboard, status: "ready" });
      void api<Risk>("/risk/predict", { customer_id: dashboard.customer.id }, signal).then(
        baseline => { if (!signal.aborted) set({ baseline }); },
        error => { if (!signal.aborted) set({ baselineError: String(error.message) }); },
      );
      void api<Product[]>("/products", undefined, signal).then(
        products => { if (!signal.aborted) set({ products }); },
        error => { if (!signal.aborted) set({ productsError: String(error.message) }); },
      );
    } catch (error) {
      if (signal.aborted) return;
      set({ status: "error", error: error instanceof Error ? error.message : "Could not load the financial profile." });
    }
  },
  openSheet: sheet => set({ sheet }),
  refresh: async () => { set({ status: "idle", baseline: null }); await get().load(); },
  reset: () => { activeRequest?.abort(); activeRequest = null; set({ dashboard: null, baseline: null, baselineError: null, products: null, productsError: null,
    status: "idle", error: null, sheet: null, selectedGoal: null, shock: null }); },
  closeSheet: () => set({ sheet: null }),
  selectGoal: id => set({ selectedGoal: id, sheet: "goal" }),
  inspectGoal: id => set({ selectedGoal: id, sheet: "sapling" }),
  applyShock: id => set({ shock: id }),
  setPredictMode: predictMode => set({ predictMode }),
  setPeriod: period => set({ period }),
  setSim: (k, v) => set(s => ({ sim: { ...s.sim, [k]: v } })),
}));
