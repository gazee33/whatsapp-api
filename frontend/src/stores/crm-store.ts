import { create } from "zustand";
import { tenantClient } from "@/lib/api-client";
import type {
  CustomerListItem,
  CustomerDetailResponse,
  TimelineEntry,
} from "@/lib/types";

interface CrmState {
  customers: CustomerListItem[];
  selectedCustomer: CustomerDetailResponse | null;
  timeline: TimelineEntry[];
  isLoadingList: boolean;
  isLoadingDetail: boolean;
  isLoadingTimeline: boolean;
  search: string;
  sort: string;

  fetchCustomers: (params?: { search?: string; sort?: string }) => Promise<void>;
  fetchCustomer: (id: string) => Promise<void>;
  fetchTimeline: (id: string) => Promise<void>;
  setSearch: (search: string) => void;
  setSort: (sort: string) => void;
}

export const useCrmStore = create<CrmState>((set, get) => ({
  customers: [],
  selectedCustomer: null,
  timeline: [],
  isLoadingList: false,
  isLoadingDetail: false,
  isLoadingTimeline: false,
  search: "",
  sort: "recent",

  fetchCustomers: async (params) => {
    set({ isLoadingList: true });
    try {
      const search = params?.search ?? get().search;
      const sort = params?.sort ?? get().sort;
      const query = new URLSearchParams();
      if (search) query.set("search", search);
      if (sort) query.set("sort", sort);
      const url = `/customers${query.toString() ? `?${query.toString()}` : ""}`;
      const res = await tenantClient.get(url);
      set({ customers: res.data, isLoadingList: false });
    } catch {
      set({ isLoadingList: false });
    }
  },

  fetchCustomer: async (id: string) => {
    set({ isLoadingDetail: true });
    try {
      const res = await tenantClient.get(`/customers/${id}`);
      set({ selectedCustomer: res.data, isLoadingDetail: false });
    } catch {
      set({ isLoadingDetail: false });
    }
  },

  fetchTimeline: async (id: string) => {
    set({ isLoadingTimeline: true });
    try {
      const res = await tenantClient.get(`/customers/${id}/timeline`);
      set({ timeline: res.data, isLoadingTimeline: false });
    } catch {
      set({ isLoadingTimeline: false });
    }
  },

  setSearch: (search: string) => set({ search }),
  setSort: (sort: string) => set({ sort }),
}));
