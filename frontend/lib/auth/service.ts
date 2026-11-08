import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
export type AuthUser = { id: string; name: string; email: string };
export type Session = { token: string; user: AuthUser; isNew?: boolean };
export interface AuthService {
  login(input: { email: string; password: string }): Promise<Session>;
  signup(input: {
    name: string;
    email: string;
    password: string;
  }): Promise<Session>;
  logout(): Promise<void>;
  getSession(): Promise<Session | null>;
}
const KEY = 'canopy.session',
  wait = () => new Promise((resolve) => setTimeout(resolve, 600));
async function writeSession(value: string) {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(KEY, value);
    return;
  }
  await SecureStore.setItemAsync(KEY, value);
}
async function readSession() {
  if (Platform.OS === 'web')
    return globalThis.localStorage?.getItem(KEY) ?? null;
  return SecureStore.getItemAsync(KEY);
}
async function clearSession() {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.removeItem(KEY);
    return;
  }
  await SecureStore.deleteItemAsync(KEY);
}
export class MockAuthService implements AuthService {
  async login({ email }: { email: string; password: string }) {
    await wait();
    const session = {
      token: `demo-${Date.now()}`,
      user: { id: 'demo-user', name: 'Jordan', email },
    };
    await writeSession(JSON.stringify(session));
    return session;
  }
  async signup({
    name,
    email,
  }: {
    name: string;
    email: string;
    password: string;
  }) {
    await wait();
    const session = {
      token: `demo-${Date.now()}`,
      user: { id: 'demo-user', name, email },
      isNew: true,
    };
    await writeSession(JSON.stringify(session));
    return session;
  }
  async logout() {
    await clearSession();
  }
  async getSession() {
    const raw = await readSession();
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Session;
    } catch {
      await this.logout();
      return null;
    }
  }
}
export const authService: AuthService = new MockAuthService();
