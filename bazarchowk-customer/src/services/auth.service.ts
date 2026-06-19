import api, { parseApiError, TokenStorage } from './api';

// ─── Auth Types ───────────────────────────────────────────────────────────────
export interface LoginPayload {
  email: string;
  password?: string;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  roleId: string;
  isGuest: boolean;
  isActive: boolean;
  kycStatus: string;
  languagePref: string;
  createdAt: string;
}

// ─── Auth Service ─────────────────────────────────────────────────────────────
export const AuthService = {
  async login(payload: LoginPayload): Promise<AuthResponse> {
    try {
      const { data } = await api.post<AuthResponse>('/auth/login', payload);
      await TokenStorage.setTokens(data.accessToken, data.refreshToken);
      return data;
    } catch (error) {
      throw parseApiError(error);
    }
  },

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    try {
      const { data } = await api.post<AuthResponse>('/auth/register', payload);
      await TokenStorage.setTokens(data.accessToken, data.refreshToken);
      return data;
    } catch (error) {
      throw parseApiError(error);
    }
  },

  async guestLogin(deviceId: string): Promise<AuthResponse> {
    try {
      const { data } = await api.post<AuthResponse>('/auth/guest-login', { deviceId });
      await TokenStorage.setTokens(data.accessToken, data.refreshToken);
      return data;
    } catch (error) {
      throw parseApiError(error);
    }
  },

  async getProfile(): Promise<User> {
    try {
      const { data } = await api.get<User>('/auth/profile');
      return data;
    } catch (error) {
      throw parseApiError(error);
    }
  },

  async logout(): Promise<void> {
    try {
      const refreshToken = await TokenStorage.getRefreshToken();
      await api.post('/auth/logout', { refreshToken });
    } finally {
      await TokenStorage.clearTokens();
    }
  },
};
