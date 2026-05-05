import { create } from "zustand";
import { tenantClient } from "@/lib/api-client";
import type { Customer, ConversationDetail, Message } from "@/lib/types";

interface ConversationState {
  conversations: Customer[];
  currentConversation: ConversationDetail | null;
  isLoading: boolean;

  fetchConversations: () => Promise<void>;
  fetchConversation: (phone: string) => Promise<void>;
  addMessage: (customerId: string, message: Message) => void;
}

export const useConversationStore = create<ConversationState>((set) => ({
  conversations: [],
  currentConversation: null,
  isLoading: false,

  fetchConversations: async () => {
    set({ isLoading: true });
    try {
      const res = await tenantClient.get("/conversations");
      set({ conversations: res.data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchConversation: async (phone: string) => {
    set({ isLoading: true });
    try {
      const res = await tenantClient.get(`/conversations/${phone}`);
      set({ currentConversation: res.data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addMessage: (customerId: string, message: Message) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === customerId
          ? { ...c, messages: [...(c.messages || []), message] }
          : c
      ),
      currentConversation:
        state.currentConversation &&
        state.currentConversation.customer.id === customerId
          ? {
              ...state.currentConversation,
              sessions: {
                ...state.currentConversation.sessions,
                [message.sessionId]: [
                  ...(state.currentConversation.sessions[message.sessionId] ||
                    []),
                  message,
                ],
              },
            }
          : state.currentConversation,
    }));
  },
}));
