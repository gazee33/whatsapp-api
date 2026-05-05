import { create } from "zustand";
import { tenantClient } from "@/lib/api-client";
import type { Order, OrderStatus } from "@/lib/types";

interface OrderState {
  orders: Order[];
  currentOrder: Order | null;
  isLoading: boolean;
  statusFilter: OrderStatus | "all";

  fetchOrders: (status?: string) => Promise<void>;
  fetchOrder: (id: string) => Promise<void>;
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
  setStatusFilter: (status: OrderStatus | "all") => void;
  addOrUpdateOrder: (order: Order) => void;
}

export const useOrderStore = create<OrderState>((set) => ({
  orders: [],
  currentOrder: null,
  isLoading: false,
  statusFilter: "all",

  fetchOrders: async (status?: string) => {
    set({ isLoading: true });
    try {
      const params = status && status !== "all" ? { status } : {};
      const res = await tenantClient.get("/orders", { params });
      set({ orders: res.data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchOrder: async (id: string) => {
    set({ isLoading: true });
    try {
      const res = await tenantClient.get(`/orders/${id}`);
      set({ currentOrder: res.data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  updateOrderStatus: async (id: string, status: OrderStatus) => {
    const res = await tenantClient.put(`/orders/${id}/status`, { status });
    set((state) => ({
      currentOrder: res.data,
      orders: state.orders.map((o) => (o.id === id ? res.data : o)),
    }));
  },

  setStatusFilter: (status) => set({ statusFilter: status }),

  addOrUpdateOrder: (order: Order) => {
    set((state) => {
      const existing = state.orders.findIndex((o) => o.id === order.id);
      if (existing >= 0) {
        const updated = [...state.orders];
        updated[existing] = order;
        return { orders: updated };
      }
      return { orders: [order, ...state.orders] };
    });
  },
}));
