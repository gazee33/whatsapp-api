export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

// Socket.IO uses a custom path /api/socket.io — extract host only from API_URL to avoid doubling /api
const getSocketUrl = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
  // Remove /api suffix if present to get the base URL
  return apiUrl.replace(/\/api$/, "");
};

export const SOCKET_URL = getSocketUrl();
