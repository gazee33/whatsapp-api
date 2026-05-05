import { create } from "zustand";
import { persist } from "zustand/middleware";
import axios from "axios";
import type { User } from "@/lib/types";
import { API_BASE } from "@/lib/config";

interface AuthState {
  apiKey: string | null;
  accessToken: string | null;
  user: User | null;
  isAuthenticated: boolean;

  platformToken: string | null;
  platformUser: User | null;
  isPlatformAuthenticated: boolean;

  isLoading: boolean;
  hydrated: boolean;

  setApiKey: (key: string) => void;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, name?: string) => Promise<User>;
  refreshToken: () => Promise<string | null>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<User>;

  platformLogin: (email: string, password: string) => Promise<User>;
  refreshPlatformToken: () => Promise<string | null>;
  platformLogout: () => Promise<void>;
  fetchPlatformMe: () => Promise<User>;

  clearAuth: () => void;
  clearPlatformAuth: () => void;
}

let _setStore: any;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => {
      _setStore = set;
      return {
        apiKey: null,
        accessToken: null,
        user: null,
        isAuthenticated: false,
        platformToken: null,
        platformUser: null,
        isPlatformAuthenticated: false,
        isLoading: false,
        hydrated: false,

        setApiKey: (key: string) => set({ apiKey: key }),

        login: async (email: string, password: string) => {
          set({ isLoading: true });
          try {
            const res = await axios.post(`${API_BASE}/auth/login`, { email, password }, {
              headers: { "x-api-key": get().apiKey },
              withCredentials: true,
            });
            set({
              accessToken: res.data.accessToken,
              user: res.data.user,
              isAuthenticated: true,
              isLoading: false,
            });
            return res.data.user;
          } catch {
            set({ isLoading: false });
            throw new Error("Invalid credentials");
          }
        },

        register: async (email: string, password: string, name?: string) => {
          set({ isLoading: true });
          try {
            const res = await axios.post(`${API_BASE}/auth/register`, { email, password, name }, {
              headers: { "x-api-key": get().apiKey },
              withCredentials: true,
            });
            set({
              accessToken: res.data.accessToken,
              user: res.data.user,
              isAuthenticated: true,
              isLoading: false,
            });
            return res.data.user;
          } catch {
            set({ isLoading: false });
            throw new Error("Registration failed");
          }
        },

        refreshToken: async () => {
          try {
            const res = await axios.post(`${API_BASE}/auth/refresh`, {}, { withCredentials: true });
            set({ accessToken: res.data.accessToken });
            return res.data.accessToken;
          } catch {
            set({ accessToken: null, user: null, isAuthenticated: false });
            return null;
          }
        },

        logout: async () => {
          try {
            await axios.post(`${API_BASE}/auth/logout`, {}, {
              headers: { Authorization: `Bearer ${get().accessToken}` },
              withCredentials: true,
            });
          } catch { /* ignore */ }
          set({ accessToken: null, user: null, isAuthenticated: false });
        },

        fetchMe: async () => {
          const res = await axios.get(`${API_BASE}/auth/me`, {
            headers: { Authorization: `Bearer ${get().accessToken}` },
          });
          set({ user: res.data });
          return res.data;
        },

        platformLogin: async (email: string, password: string) => {
          set({ isLoading: true });
          try {
            const res = await axios.post(`${API_BASE}/auth/platform-login`, { email, password }, {
              withCredentials: true,
            });
            set({
              platformToken: res.data.accessToken,
              platformUser: res.data.user,
              isPlatformAuthenticated: true,
              isLoading: false,
            });
            return res.data.user;
          } catch {
            set({ isLoading: false });
            throw new Error("Invalid platform credentials");
          }
        },

        refreshPlatformToken: async () => {
          try {
            const res = await axios.post(`${API_BASE}/auth/refresh`, {}, { withCredentials: true });
            set({ platformToken: res.data.accessToken });
            return res.data.accessToken;
          } catch {
            set({ platformToken: null, platformUser: null, isPlatformAuthenticated: false });
            return null;
          }
        },

        platformLogout: async () => {
          try {
            await axios.post(`${API_BASE}/auth/logout`, {}, {
              headers: { Authorization: `Bearer ${get().platformToken}` },
              withCredentials: true,
            });
          } catch { /* ignore */ }
          set({ platformToken: null, platformUser: null, isPlatformAuthenticated: false });
        },

        fetchPlatformMe: async () => {
          const res = await axios.get(`${API_BASE}/auth/me`, {
            headers: { Authorization: `Bearer ${get().platformToken}` },
          });
          set({ platformUser: res.data });
          return res.data;
        },

        clearAuth: () => set({ accessToken: null, user: null, isAuthenticated: false }),
        clearPlatformAuth: () => set({ platformToken: null, platformUser: null, isPlatformAuthenticated: false }),
      };
    },
    {
      name: "whatsapp-api-auth",
      partialize: (state) => ({
        apiKey: state.apiKey,
        accessToken: state.accessToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        platformToken: state.platformToken,
        platformUser: state.platformUser,
        isPlatformAuthenticated: state.isPlatformAuthenticated,
      }),
      onRehydrateStorage: () => () => {
        _setStore?.({ hydrated: true });
      },
    }
  )
);
