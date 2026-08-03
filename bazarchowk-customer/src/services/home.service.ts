import api from './api';

export interface Category {
  id: string;
  name: string;
  icon?: string;
  image?: string;
}

export interface Shop {
  id: string;
  name: string;
  shopImage?: string;
  rating?: number;
  isOpen?: boolean;
}

export interface Market {
  id: string;
  name: string;
  imageUrl?: string;
  shops?: any[];
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  basePrice: number;
  images?: any[];
}

export interface Ad {
  id: string;
  title: string;
  imageUrl: string;
  type: string;
}

export const HomeService = {
  getCategories: async (city?: string): Promise<Category[]> => {
    let url = '/categories';
    if (city) url += `?city=${encodeURIComponent(city)}`;
    const res = await api.get(url);
    return res.data;
  },
  getNearbyShops: async (lat?: number, lng?: number): Promise<Shop[]> => {
    let url = '/shops';
    if (lat !== undefined && lng !== undefined) {
      url += `?lat=${lat}&lng=${lng}`;
    }
    const res = await api.get(url);
    return res.data;
  },
  getMarkets: async (lat?: number, lng?: number): Promise<Market[]> => {
    let url = '/markets';
    if (lat !== undefined && lng !== undefined) {
      url += `?lat=${lat}&lng=${lng}`;
    }
    const res = await api.get(url);
    return res.data;
  },
  getRecommendedProducts: async (lat?: number, lng?: number): Promise<Product[]> => {
    let url = '/products';
    if (lat !== undefined && lng !== undefined) {
      url += `?lat=${lat}&lng=${lng}`;
    }
    const res = await api.get(url);
    return res.data;
  },
  getActiveAds: async (type: string = 'BANNER'): Promise<Ad[]> => {
    try {
      const res = await api.get(`/ads/active/${type}`);
      return res.data;
    } catch (err) {
      return [];
    }
  }
};
