import { create } from "zustand";
import { authService, AuthUser } from "./service";
type AuthStatus = "loading" | "signedOut" | "signedIn";
type AuthState = { user: AuthUser | null; status: AuthStatus; needsOnboarding: boolean; hydrate: () => Promise<void>; login: (v: { email: string; password: string }) => Promise<void>; signup: (v: { name: string; email: string; password: string }) => Promise<void>; completeOnboarding: () => Promise<void>; logout: () => Promise<void> };
export const useAuthStore = create<AuthState>(set => ({
  user: null, status: "loading", needsOnboarding: false,
  hydrate: async () => { try { const session = await authService.getSession(); set(session ? { user: session.user, status: "signedIn", needsOnboarding: !!session.isNew } : { user: null, status: "signedOut", needsOnboarding: false }); } catch { set({ user: null, status: "signedOut", needsOnboarding: false }); } },
  login: async values => { const session = await authService.login(values); set({ user: session.user, status: "signedIn", needsOnboarding: false }); },
  signup: async values => { const session = await authService.signup(values); set({ user: session.user, status: "signedIn", needsOnboarding: true }); },
  completeOnboarding: async () => { await authService.completeOnboarding(); set({ needsOnboarding: false }); },
  logout: async () => { await authService.logout(); set({ user: null, status: "signedOut", needsOnboarding: false }); },
}));
