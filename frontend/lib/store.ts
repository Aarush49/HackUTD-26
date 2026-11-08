import { create } from "zustand";
import { mockData, Tab } from "@/lib/mock";

type State = {
  data: typeof mockData;
  tab: Tab;
  sheet: null | "whatif" | "goal" | "sapling";
  selectedGoal: string | null;
  shock: string | null;
  predictMode: "shocks" | "simulate";
  period: "Week" | "Month" | "Year";
  sim: { monthly: number; years: number; rate: number };
  setTab: (tab: Tab) => void;
  openSheet: (sheet: State["sheet"]) => void;
  closeSheet: () => void;
  selectGoal: (id: string) => void;
  inspectGoal: (id: string) => void;
  applyShock: (id: string) => void;
  clearShock: () => void;
  setPredictMode: (mode: State["predictMode"]) => void;
  setPeriod: (period: State["period"]) => void;
  setSim: (key: keyof State["sim"], value: number) => void;
};

export const useFinanceStore = create<State>(set => ({
  data: mockData,
  tab: "today",
  sheet: null,
  selectedGoal: null,
  shock: null,
  predictMode: "shocks",
  period: "Month",
  sim: { monthly: mockData.simulate.monthly, years: mockData.simulate.years, rate: mockData.simulate.rate },
  setTab: tab => set({ tab }),
  openSheet: sheet => set({ sheet }),
  closeSheet: () => set({ sheet: null }),
  selectGoal: selectedGoal => set({ selectedGoal, sheet: "goal" }),
  inspectGoal: selectedGoal => set({ selectedGoal, sheet: "sapling" }),
  applyShock: shock => set({ shock, sheet: null }),
  clearShock: () => set({ shock: null }),
  setPredictMode: predictMode => set({ predictMode }),
  setPeriod: period => set({ period }),
  setSim: (key, value) => set(state => ({ sim: { ...state.sim, [key]: value } })),
}));
