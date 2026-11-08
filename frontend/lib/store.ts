import { create } from 'zustand';
import { fetchNessieSnapshot } from '@/lib/finance/api';
import type { NessieSnapshot } from '@/lib/finance/api';
import { buildData, demoSnapshot } from '@/lib/finance/data';
import type { FinanceData, Simulation, Tab } from '@/lib/finance/types';

type State = {
  data: FinanceData;
  snapshot?: NessieSnapshot;
  loadFailed: boolean;
  tab: Tab;
  sheet: null | 'whatif' | 'goal' | 'sapling';
  selectedGoal: string | null;
  predictMode: 'news' | 'predict' | 'simulate';
  period: 'Week' | 'Month' | 'Year';
  sim?: Simulation;
  load: (signal: AbortSignal) => Promise<void>;
  clear: () => void;
  setTab: (tab: Tab) => void;
  openSheet: (sheet: State['sheet']) => void;
  closeSheet: () => void;
  selectGoal: (id: string) => void;
  inspectGoal: (id: string) => void;
  setPredictMode: (mode: State['predictMode']) => void;
  setPeriod: (period: State['period']) => void;
  setSim: (key: keyof Simulation, value: number) => void;
};

const demoData = buildData(demoSnapshot);
const demoSettings = demoData.simulate.settings;
const demoSimulation = demoSettings && {
  monthly: demoSettings.monthly.initial,
  years: demoSettings.years.initial,
  rate: demoSettings.rate.initial,
};

export const useFinanceStore = create<State>((set) => ({
  data: demoData,
  snapshot: demoSnapshot,
  loadFailed: false,
  tab: 'today',
  sheet: null,
  selectedGoal: null,
  predictMode: 'news',
  period: 'Month',
  sim: demoSimulation,
  load: async (signal) => {
    set({ loadFailed: false });
    try {
      const snapshot = await fetchNessieSnapshot(signal);
      if (signal.aborted) return;
      const data = buildData(snapshot);
      const settings = data.simulate.settings;
      const sim = settings && {
        monthly: settings.monthly.initial,
        years: settings.years.initial,
        rate: settings.rate.initial,
      };
      set({ snapshot, data, sim });
    } catch {
      if (!signal.aborted) set({ loadFailed: true });
    }
  },
  clear: () =>
    set({
      snapshot: demoSnapshot,
      data: demoData,
      sim: demoSimulation,
      loadFailed: false,
    }),
  setTab: (tab) => set({ tab }),
  openSheet: (sheet) => set({ sheet }),
  closeSheet: () => set({ sheet: null }),
  selectGoal: (selectedGoal) => set({ selectedGoal, sheet: 'goal' }),
  inspectGoal: (selectedGoal) => set({ selectedGoal, sheet: 'sapling' }),
  setPredictMode: (predictMode) => set({ predictMode }),
  setPeriod: (period) => set({ period }),
  setSim: (key, value) =>
    set((state) =>
      state.sim ? { sim: { ...state.sim, [key]: value } } : state
    ),
}));
