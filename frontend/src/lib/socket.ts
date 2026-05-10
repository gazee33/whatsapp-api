import { io, Socket } from "socket.io-client";
import { useOrderStore } from "@/stores/order-store";
import { useConversationStore } from "@/stores/conversation-store";
import { useAuthStore } from "@/stores/auth-store";
import { SOCKET_URL } from "@/lib/config";

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(businessId: string): Socket {
  if (socket?.connected) socket.disconnect();

  const token = useAuthStore.getState().accessToken;

  socket = io(SOCKET_URL, {
    path: "/api/socket.io",
    auth: { token },
    transports: ["websocket", "polling"],
  });

  socket.on("connect", () => {
    socket?.emit("join", { businessId });
  });

  socket.on("new-order", (order) => {
    useOrderStore.getState().addOrUpdateOrder(order);
  });

  socket.on("order-updated", (order) => {
    useOrderStore.getState().addOrUpdateOrder(order);
  });

  socket.on("new-message", ({ customerId, message }) => {
    useConversationStore.getState().addMessage(customerId, message);
  });

  socket.on("connect_error", (err) => {
    console.error("Socket connection error:", err.message);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
