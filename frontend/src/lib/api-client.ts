import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/stores/auth-store";
import { API_BASE } from "@/lib/config";

const tenantClient = axios.create({ baseURL: API_BASE });
const platformClient = axios.create({ baseURL: API_BASE });

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token!);
  });
  failedQueue = [];
}

function attachAuthInterceptor(
  client: typeof tenantClient,
  getToken: () => string | null,
  getApiKey: () => string | null,
  refreshFn: () => Promise<string | null>,
  clearFn: () => void,
  redirectPath: string
) {
  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = getToken();
    const apiKey = getApiKey();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    if (apiKey) config.headers["x-api-key"] = apiKey;
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & {
        _retry?: boolean;
      };

      if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({
              resolve: (token: string) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                resolve(client(originalRequest));
              },
              reject,
            });
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const newToken = await refreshFn();
          if (newToken) {
            processQueue(null, newToken);
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return client(originalRequest);
          }
          processQueue(new Error("Refresh failed"));
          clearFn();
          if (typeof window !== "undefined") {
            window.location.href = redirectPath;
          }
        } catch {
          processQueue(error);
          clearFn();
          if (typeof window !== "undefined") {
            window.location.href = redirectPath;
          }
        } finally {
          isRefreshing = false;
        }
      }

      return Promise.reject(error);
    }
  );
}

let initialized = false;

// Initialize interceptors immediately at module load time to ensure
// they're set up before any API calls are made. This prevents race
// conditions where a component might fetch data before interceptors exist.
function initializeInterceptors() {
  if (initialized) return;
  initialized = true;

  attachAuthInterceptor(
    tenantClient,
    () => useAuthStore.getState().accessToken,
    () => useAuthStore.getState().apiKey,
    () => useAuthStore.getState().refreshToken(),
    () => useAuthStore.getState().clearAuth(),
    "/login"
  );

  attachAuthInterceptor(
    platformClient,
    () => useAuthStore.getState().platformToken,
    () => null,
    () => useAuthStore.getState().refreshPlatformToken(),
    () => useAuthStore.getState().clearPlatformAuth(),
    "/platform-login"
  );
}

// Initialize immediately at module load time
initializeInterceptors();

export function initApiClients() {
  // Already initialized above, but kept for compatibility
  // This function can still be called to force re-initialization if needed
}

export { tenantClient, platformClient, API_BASE };

export class ApiClient {
  async listTemplates(status?: string) {
    const params = status ? `?status=${status}` : "";
    const res = await tenantClient.get(`/templates${params}`);
    return res.data;
  }

  async getTemplate(id: string) {
    const res = await tenantClient.get(`/templates/${id}`);
    return res.data;
  }

  async createTemplate(data: {
    name: string;
    category: string;
    language: string;
    components: any[];
  }) {
    const res = await tenantClient.post("/templates", data);
    return res.data;
  }

  async deleteTemplate(id: string) {
    const res = await tenantClient.delete(`/templates/${id}`);
    return res.data;
  }
}

export const apiClient = new ApiClient();
