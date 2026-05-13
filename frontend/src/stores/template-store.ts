import { create } from "zustand";
import { apiClient } from "@/lib/api-client";

interface Template {
  id: string;
  metaTemplateId?: string;
  name: string;
  category: string;
  language: string;
  status: string;
  components?: string;
  createdAt: string;
  updatedAt: string;
}

interface TemplateStore {
  templates: Template[];
  selectedTemplate: Template | null;
  loading: boolean;
  error: string | null;
  setTemplates: (templates: Template[]) => void;
  setSelectedTemplate: (template: Template | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  fetchTemplates: (status?: string) => Promise<void>;
  createTemplate: (data: any) => Promise<Template>;
  deleteTemplate: (id: string) => Promise<void>;
}

export const useTemplateStore = create<TemplateStore>((set, get) => ({
  templates: [],
  selectedTemplate: null,
  loading: false,
  error: null,

  setTemplates: (templates) => set({ templates }),
  setSelectedTemplate: (selectedTemplate) => set({ selectedTemplate }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  fetchTemplates: async (status) => {
    set({ loading: true, error: null });
    try {
      const data = await apiClient.listTemplates(status);
      set({ templates: data.templates || [], loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  createTemplate: async (data) => {
    set({ loading: true, error: null });
    try {
      const result = await apiClient.createTemplate(data);
      await get().fetchTemplates();
      set({ loading: false });
      return result;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  deleteTemplate: async (id) => {
    set({ loading: true, error: null });
    try {
      await apiClient.deleteTemplate(id);
      set({
        templates: get().templates.filter((t) => t.id !== id),
        loading: false,
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },
}));