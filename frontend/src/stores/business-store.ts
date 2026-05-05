import { create } from "zustand";
import { tenantClient } from "@/lib/api-client";
import type { Business, RestaurantSettings } from "@/lib/types";

export interface WhatsAppCredentialsPayload {
  whatsappPhoneNumber?: string;
  whatsappPhoneNumberId?: string;
  whatsappAccessToken?: string;
  whatsappAppSecret?: string;
}

interface BusinessState {
  business: Business | null;
  settings: RestaurantSettings | null;
  isLoading: boolean;

  fetchBusiness: () => Promise<void>;
  fetchSettings: () => Promise<void>;
  updateSettings: (data: Partial<RestaurantSettings>) => Promise<void>;
  updateWhatsApp: (data: WhatsAppCredentialsPayload) => Promise<void>;
  rotateVerifyToken: () => Promise<string>;
}

export const useBusinessStore = create<BusinessState>((set) => ({
  business: null,
  settings: null,
  isLoading: false,

  fetchBusiness: async () => {
    set({ isLoading: true });
    try {
      const res = await tenantClient.get("/business");
      set({ business: res.data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchSettings: async () => {
    try {
      const res = await tenantClient.get("/settings");
      set({ settings: res.data });
    } catch { /* ignore */ }
  },

  updateSettings: async (data: Partial<RestaurantSettings>) => {
    const res = await tenantClient.put("/settings", data);
    set({ settings: res.data });
  },

  updateWhatsApp: async (data: WhatsAppCredentialsPayload) => {
    await tenantClient.put("/business/whatsapp", data);
    const res = await tenantClient.get("/business");
    set({ business: res.data });
  },

  rotateVerifyToken: async () => {
    const res = await tenantClient.post("/business/whatsapp/verify-token");
    const updated = await tenantClient.get("/business");
    set({ business: updated.data });
    return res.data.verifyToken;
  },
}));
