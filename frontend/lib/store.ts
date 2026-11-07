"use client";
import { create } from "zustand";
import { mockData, Tab } from "@/lib/mock";

type State = {
  data: typeof mockData; tab: Tab; sheet: null | "whatif" | "goal" | "sapling"; selectedGoal: string | null;
  shock: string | null; fixed: boolean; predictMode: "break" | "simulate"; period: "Week" | "Month" | "Year";
  sim: { monthly: number; years: number; rate: number };
  setTab: (tab: Tab) => void; openSheet: (sheet: State["sheet"]) => void; closeSheet: () => void;
  selectGoal: (id: string) => void; applyShock: (id: string) => void; fixShock: () => void;
  setPredictMode: (m: State["predictMode"]) => void; setPeriod: (p: State["period"]) => void; setSim: (k: keyof State["sim"], v: number) => void;
};
export const useFinanceStore = create<State>((set) => ({
  data: mockData, tab: "today", sheet: null, selectedGoal: null, shock: null, fixed: false, predictMode: "break", period: "Month",
  sim: { monthly: mockData.simulate.monthly, years: mockData.simulate.years, rate: mockData.simulate.rate },
  setTab: (tab) => set({ tab }), openSheet: (sheet) => set({ sheet }), closeSheet: () => set({ sheet: null }),
  selectGoal: (id) => set({ selectedGoal: id, sheet: "goal" }), applyShock: (id) => set({ shock: id, fixed: false }),
  fixShock: () => set({ fixed: true }), setPredictMode: (predictMode) => set({ predictMode }), setPeriod: (period) => set({ period }),
  setSim: (k, v) => set((s) => ({ sim: { ...s.sim, [k]: v } }))
}));
