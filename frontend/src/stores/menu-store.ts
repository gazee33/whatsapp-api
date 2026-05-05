import { create } from "zustand";
import { tenantClient } from "@/lib/api-client";
import type { MenuCategory, MenuItem, MenuCategoryPayload, MenuItemPayload } from "@/lib/types";

interface MenuState {
  categories: MenuCategory[];
  items: MenuItem[];
  searchResults: MenuItem[];
  isLoading: boolean;

  fetchMenu: () => Promise<void>;
  searchMenu: (query: string) => Promise<void>;

  createCategory: (data: MenuCategoryPayload) => Promise<MenuCategory>;
  updateCategory: (id: string, data: Partial<MenuCategoryPayload>) => Promise<void>;

  createItem: (data: MenuItemPayload) => Promise<MenuItem>;
  updateItem: (id: string, data: Partial<MenuItemPayload>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  toggleItemAvailable: (id: string) => Promise<void>;
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

  createItem: async (data) => {
    const res = await tenantClient.post("/menu/items", data);
    await get().fetchMenu();
    return res.data;
  },

  updateItem: async (id, data) => {
    const res = await tenantClient.put(`/menu/items/${id}`, data);
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
}));
