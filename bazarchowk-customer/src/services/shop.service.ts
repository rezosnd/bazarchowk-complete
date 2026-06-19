import api, { parseApiError } from './api';

export interface ShopTiming {
  id: string;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
  dayName?: string;
  status?: string;
}

export interface ShopHoliday {
  id: string;
  date: string;
  reason?: string;
}

export interface ShopDocument {
  id: string;
  documentType: string;
  documentUrl: string;
  isVerified: boolean;
}

export interface Shop {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  address: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  deliveryRadius: number;
  isVerified: boolean;
  isActive: boolean;
  timings?: ShopTiming[];
  holidays?: ShopHoliday[];
  documents?: ShopDocument[];
  status?: {
    isOpen: boolean;
    label: string;
    openTime?: string;
    closeTime?: string;
    reason: string;
    isHoliday: boolean;
  };
}

export interface CreateShopDto {
  name: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  address: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  deliveryRadius?: number;
}

export const ShopService = {
  async getAll(): Promise<Shop[]> {
    try {
      const { data } = await api.get<Shop[]>('/shops');
      return data;
    } catch (error) {
      throw parseApiError(error);
    }
  },

  async getOne(id: string): Promise<Shop> {
    try {
      const { data } = await api.get<Shop>(`/shops/${id}`);
      return data;
    } catch (error) {
      throw parseApiError(error);
    }
  },

  async create(payload: CreateShopDto): Promise<Shop> {
    try {
      const { data } = await api.post<Shop>('/shops', payload);
      return data;
    } catch (error) {
      throw parseApiError(error);
    }
  },

  async update(id: string, payload: Partial<CreateShopDto>): Promise<Shop> {
    try {
      const { data } = await api.patch<Shop>(`/shops/${id}`, payload);
      return data;
    } catch (error) {
      throw parseApiError(error);
    }
  },
};
