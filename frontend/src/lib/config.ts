export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

// Socket.IO doesn't use /api path - extract host only from API_URL
const getSocketUrl = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
  // Remove /api suffix if present to get the base URL
  return apiUrl.replace(/\/api$/, "");
};

export const SOCKET_URL = getSocketUrl();
