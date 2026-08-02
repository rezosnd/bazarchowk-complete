import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// ─── Constants ────────────────────────────────────────────────────────────────
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://bazarchowk-complete.vercel.app';
const ACCESS_TOKEN_KEY = 'bazar_access_token';
const REFRESH_TOKEN_KEY = 'bazar_refresh_token';
const REQUEST_TIMEOUT = 15000;

// ─── Token Helpers ────────────────────────────────────────────────────────────
export const TokenStorage = {
  async getAccessToken(): Promise<string | null> {
    if (Platform.OS === 'web') return localStorage.getItem(ACCESS_TOKEN_KEY);
    return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  },
  async getRefreshToken(): Promise<string | null> {
    if (Platform.OS === 'web') return localStorage.getItem(REFRESH_TOKEN_KEY);
    return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  },
  async setTokens(access: string, refresh: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(ACCESS_TOKEN_KEY, access);
      localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
      return;
    }
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_TOKEN_KEY, access),
      SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh),
    ]);
  },
  async clearTokens(): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      return;
    }
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    ]);
  },
};

// ─── Axios Instance ───────────────────────────────────────────────────────────
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-App-Platform': 'customer',
    'X-App-Version': '1.0.0',
  },
});

// ─── Request Interceptor ──────────────────────────────────────────────────────
api.interceptors.request.use(
  async (config) => {
    const token = await TokenStorage.getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor (with refresh) ─────────────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token!);
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await TokenStorage.getRefreshToken();
        if (!refreshToken) throw new Error('No refresh token');

        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefresh } = response.data;
        await TokenStorage.setTokens(accessToken, newRefresh);
        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;

        processQueue(null, accessToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await TokenStorage.clearTokens();
        // Emit auth logout event for store to react
        authEventEmitter.emit('logout');
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ─── Simple Event Emitter ─────────────────────────────────────────────────────
const authEventEmitter = {
  listeners: new Map<string, Array<() => void>>(),
  emit(event: string) {
    this.listeners.get(event)?.forEach((fn) => fn());
  },
  on(event: string, fn: () => void) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event)!.push(fn);
    return () => this.off(event, fn);
  },
  off(event: string, fn: () => void) {
    const fns = this.listeners.get(event);
    if (fns) this.listeners.set(event, fns.filter((f) => f !== fn));
  },
};

export { authEventEmitter };

// ─── API Error Helper ─────────────────────────────────────────────────────────
export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function parseApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; statusCode?: number } | undefined;
    return new ApiError(
      error.response?.status ?? 0,
      data?.message ?? error.message ?? 'Network error',
      data
    );
  }
  return new ApiError(0, 'An unexpected error occurred');
}

export default api;
