import { create } from 'zustand';
import { api, resolveCustomerId } from '@/lib/api';
import type { Goal } from '@/lib/api';
import { fetchNessieSnapshot } from '@/lib/finance/api';
import type { NessieSnapshot } from '@/lib/finance/api';
import { buildData } from '@/lib/finance/data';
import type { FinanceData, Simulation, Tab } from '@/lib/finance/types';

type State = {
  data: FinanceData;
  snapshot?: NessieSnapshot;
  savedGoals: Goal[];
  loadFailed: boolean;
  tab: Tab;
  sheet: null | 'whatif' | 'goal' | 'sapling';
  selectedGoal: string | null;
  predictMode: 'news' | 'predict' | 'simulate';
  period: 'Week' | 'Month' | 'Year';
  sim?: Simulation;
  load: (signal: AbortSignal) => Promise<void>;
  loadGoals: (signal: AbortSignal) => Promise<void>;
  addGoal: (goal: Goal) => void;
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

export const useFinanceStore = create<State>((set, get) => ({
  data: buildData(),
  savedGoals: [],
  loadFailed: false,
  tab: 'today',
  sheet: null,
  selectedGoal: null,
  predictMode: 'news',
  period: 'Month',
  load: async (signal) => {
    set({ loadFailed: false });
    try {
      const snapshot = await fetchNessieSnapshot(signal);
      if (signal.aborted) return;
      const data = buildData(snapshot, get().savedGoals);
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
  loadGoals: async (signal) => {
    const customer = await resolveCustomerId(signal);
    const savedGoals = await api<Goal[]>(
      `/goals/${encodeURIComponent(customer)}`,
      undefined,
      signal
    );
    if (!signal.aborted) {
      set({ savedGoals, data: buildData(get().snapshot, savedGoals) });
    }
  },
  addGoal: (goal) =>
    set(({ savedGoals, snapshot }) => {
      const goals = [...savedGoals.filter(({ id }) => id !== goal.id), goal];
      return { savedGoals: goals, data: buildData(snapshot, goals) };
    }),
  clear: () =>
    set({
      snapshot: undefined,
      savedGoals: [],
      data: buildData(),
      sim: undefined,
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
