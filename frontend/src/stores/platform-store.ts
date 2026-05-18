import { create } from "zustand";
import { platformClient } from "@/lib/api-client";
import type {
  PlatformBusiness,
  PlatformAnalytics,
  BusinessStats,
  AuditLog,
  PlatformConfig,
  OnboardingPreset,
  PaginatedResponse,
} from "@/lib/types";

interface PlatformState {
  businesses: PlatformBusiness[];
  currentBusiness: PlatformBusiness | null;
  analytics: PlatformAnalytics | null;
  businessStats: BusinessStats | null;
  auditLogs: PaginatedResponse<AuditLog> | null;
  pagination: { total: number; page: number; limit: number; totalPages: number };
  isLoading: boolean;

  // Platform config
  config: PlatformConfig | null;
  configLoading: boolean;
  configSaving: boolean;

  // Onboarding presets
  presets: OnboardingPreset[];
  presetsLoading: boolean;

  fetchBusinesses: (params?: { q?: string; page?: number; limit?: number }) => Promise<void>;
  fetchBusiness: (id: string) => Promise<void>;
  createBusiness: (data: { name: string; whatsappPhoneNumber?: string }) => Promise<PlatformBusiness>;
  updateBusiness: (id: string, data: Partial<PlatformBusiness>) => Promise<void>;
  deleteBusiness: (id: string) => Promise<void>;
  fetchBusinessStats: (id: string, days?: number) => Promise<void>;
  fetchAnalytics: (days?: number) => Promise<void>;
  fetchAuditLogs: (params?: Record<string, string | number>) => Promise<void>;
  fetchConfig: () => Promise<void>;
  updateConfig: (data: Partial<PlatformConfig>) => Promise<void>;

  // Preset CRUD
  fetchPresets: () => Promise<OnboardingPreset[]>;
  createPreset: (data: Partial<OnboardingPreset>) => Promise<OnboardingPreset>;
  updatePreset: (id: string, data: Partial<OnboardingPreset>) => Promise<OnboardingPreset>;
  deletePreset: (id: string) => Promise<void>;
}

export const usePlatformStore = create<PlatformState>((set) => ({
  businesses: [],
  currentBusiness: null,
  analytics: null,
  businessStats: null,
  auditLogs: null,
  pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
  isLoading: false,

  // Platform config
  config: null,
  configLoading: false,
  configSaving: false,

  // Onboarding presets
  presets: [],
  presetsLoading: false,

  fetchBusinesses: async (params) => {
    set({ isLoading: true });
    try {
      const res = await platformClient.get("/platform/businesses", { params });
      set({ businesses: res.data.data, pagination: res.data.meta, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchBusiness: async (id) => {
    set({ isLoading: true });
    try {
      const res = await platformClient.get(`/platform/businesses/${id}`);
      set({ currentBusiness: res.data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  createBusiness: async (data) => {
    const res = await platformClient.post("/platform/businesses", data);
    return res.data;
  },

  updateBusiness: async (id, data) => {
    const res = await platformClient.put(`/platform/businesses/${id}`, data);
    set({ currentBusiness: res.data });
    return res.data;
  },

  deleteBusiness: async (id) => {
    await platformClient.delete(`/platform/businesses/${id}`);
    set((state) => ({
      businesses: state.businesses.filter((b) => b.id !== id),
    }));
  },

  fetchBusinessStats: async (id, days = 30) => {
    const res = await platformClient.get(`/platform/businesses/${id}/stats`, { params: { days } });
    set({ businessStats: res.data });
  },

  fetchAnalytics: async (days = 30) => {
    set({ isLoading: true });
    try {
      const res = await platformClient.get("/platform/analytics", { params: { days } });
      set({ analytics: res.data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchAuditLogs: async (params) => {
    set({ isLoading: true });
    try {
      const res = await platformClient.get("/platform/audit-logs", { params });
      set({ auditLogs: res.data, pagination: res.data.meta, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchConfig: async () => {
    set({ configLoading: true });
    try {
      const res = await platformClient.get("/platform/config");
      set({ config: res.data, configLoading: false });
    } catch {
      set({ configLoading: false });
    }
  },

  updateConfig: async (data) => {
    set({ configSaving: true });
    try {
      const res = await platformClient.put("/platform/config", data);
      set({ config: res.data, configSaving: false });
    } catch (err) {
      set({ configSaving: false });
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        (err as Error)?.message ||
        "Failed to update platform config";
      throw new Error(message);
    }
  },

  fetchPresets: async () => {
    set({ presetsLoading: true });
    try {
      const res = await platformClient.get("/platform/presets");
      set({ presets: res.data, presetsLoading: false });
      return res.data;
    } catch {
      set({ presetsLoading: false });
      return [];
    }
  },

  createPreset: async (data) => {
    const res = await platformClient.post("/platform/presets", data);
    set((state) => ({ presets: [res.data, ...state.presets] }));
    return res.data;
  },

  updatePreset: async (id, data) => {
    const res = await platformClient.put(`/platform/presets/${id}`, data);
    set((state) => ({
      presets: state.presets.map((p) => (p.id === id ? res.data : p)),
    }));
    return res.data;
  },

  deletePreset: async (id) => {
    await platformClient.delete(`/platform/presets/${id}`);
    set((state) => ({
      presets: state.presets.map((p) =>
        p.id === id ? { ...p, isActive: false } : p
      ),
    }));
  },
}));
