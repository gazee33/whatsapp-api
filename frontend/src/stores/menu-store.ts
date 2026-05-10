import { create } from "zustand";
import { tenantClient } from "@/lib/api-client";
import type { MenuCategory, MenuItem, MenuCategoryPayload, OptionPayload, ExtractedCategory, BulkCreateResult } from "@/lib/types";

interface MenuState {
  categories: MenuCategory[];
  items: MenuItem[];
  searchResults: MenuItem[];
  isLoading: boolean;

  fetchMenu: () => Promise<void>;
  searchMenu: (query: string) => Promise<void>;

  createCategory: (data: MenuCategoryPayload) => Promise<MenuCategory>;
  updateCategory: (id: string, data: Partial<MenuCategoryPayload>) => Promise<void>;

  createItem: (formData: FormData) => Promise<MenuItem>;
  updateItem: (id: string, formData: FormData) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  toggleItemAvailable: (id: string) => Promise<void>;

  createOption: (itemId: string, data: OptionPayload) => Promise<void>;
  updateOption: (optionId: string, data: { name?: string; price?: number }) => Promise<void>;
  deleteOption: (optionId: string) => Promise<void>;

  bulkCreateMenu: (data: { categories: ExtractedCategory[] }) => Promise<BulkCreateResult>;
}

export const useMenuStore = create<MenuState>((set, get) => ({
  categories: [],
  items: [],
  searchResults: [],
  isLoading: false,

  fetchMenu: async () => {
    set({ isLoading: true });
    try {
      const res = await tenantClient.get("/menu");
      set({ categories: res.data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  searchMenu: async (query: string) => {
    if (!query.trim()) {
      set({ searchResults: [] });
      return;
    }
    try {
      const res = await tenantClient.get("/menu/search", { params: { q: query } });
      set({ searchResults: res.data });
    } catch { /* ignore */ }
  },

  createCategory: async (data) => {
    const res = await tenantClient.post("/menu/categories", data);
    set((state) => ({ categories: [...state.categories, res.data] }));
    return res.data;
  },

  updateCategory: async (id, data) => {
    const res = await tenantClient.put(`/menu/categories/${id}`, data);
    set((state) => ({
      categories: state.categories.map((c) => (c.id === id ? res.data : c)),
    }));
  },

  createItem: async (formData: FormData) => {
    const res = await tenantClient.post("/menu/items", formData);
    await get().fetchMenu();
    return res.data;
  },

  updateItem: async (id, formData: FormData) => {
    const res = await tenantClient.put(`/menu/items/${id}`, formData);
    await get().fetchMenu();
    return res.data;
  },

  deleteItem: async (id) => {
    await tenantClient.delete(`/menu/items/${id}`);
    await get().fetchMenu();
  },

  toggleItemAvailable: async (id) => {
    const res = await tenantClient.patch(`/menu/items/${id}/toggle`);
    set((state) => ({
      categories: state.categories.map((cat) => ({
        ...cat,
        items: cat.items?.map((item) => (item.id === id ? res.data : item)),
      })),
    }));
  },

  createOption: async (itemId, data) => {
    set({ isLoading: true });
    try {
      await tenantClient.post(`/menu/items/${itemId}/options`, data);
      await get().fetchMenu();
    } catch (error: unknown) {
      console.error('Failed to create option:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  updateOption: async (optionId, data) => {
    set({ isLoading: true });
    try {
      await tenantClient.put(`/menu/options/${optionId}`, data);
      await get().fetchMenu();
    } catch (error: unknown) {
      console.error('Failed to update option:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteOption: async (optionId) => {
    set({ isLoading: true });
    try {
      await tenantClient.delete(`/menu/options/${optionId}`);
      await get().fetchMenu();
    } catch (error: unknown) {
      console.error('Failed to delete option:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  bulkCreateMenu: async (data) => {
    const res = await tenantClient.post("/menu/bulk", data);
    await get().fetchMenu();
    return res.data as BulkCreateResult;
  },
}));
