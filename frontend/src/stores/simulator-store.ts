import { create } from "zustand";
import { tenantClient } from "@/lib/api-client";

export interface SimMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface SimulatorState {
  messages: SimMessage[];
  isLoading: boolean;
  error: string | null;

  sendMessage: (text: string) => Promise<void>;
  reset: () => void;
}

export const useSimulatorStore = create<SimulatorState>((set) => ({
  messages: [],
  isLoading: false,
  error: null,

  sendMessage: async (text: string) => {
    const userTimestamp = new Date().toISOString();
    set((state) => ({
      messages: [...state.messages, { role: "user", content: text, timestamp: userTimestamp }],
      isLoading: true,
      error: null,
    }));

    try {
      const payload = {
        object: "whatsapp_business_account",
        entry: [
          {
            id: "simulator",
            changes: [
              {
                value: {
                  messaging_product: "whatsapp",
                  metadata: {
                    display_phone_number: "Simulator",
                    phone_number_id: "simulator",
                  },
                  contacts: [{ profile: { name: "Simulator" }, wa_id: "simulator" }],
                  messages: [
                    {
                      from: "simulator",
                      id: `sim-msg-${Date.now()}`,
                      timestamp: String(Math.floor(Date.now() / 1000)),
                      type: "text",
                      text: { body: text },
                    },
                  ],
                },
                field: "messages",
              },
            ],
          },
        ],
      };

      const res = await tenantClient.post("/webhook", payload);
      const reply = res.data.reply;

      set((state) => ({
        messages: [
          ...state.messages,
          { role: "assistant", content: reply, timestamp: new Date().toISOString() },
        ],
        isLoading: false,
      }));
    } catch (err: any) {
      const errorMessage = err?.response?.data?.error || err?.message || "Failed to send message";
      set((state) => ({
        messages: state.messages,
        isLoading: false,
        error: errorMessage,
      }));
    }
  },

  reset: () => {
    set({ messages: [], isLoading: false, error: null });
  },
}));
