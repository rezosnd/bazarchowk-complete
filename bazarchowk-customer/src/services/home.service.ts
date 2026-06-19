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
  getCategories: async (): Promise<Category[]> => {
    const res = await api.get('/categories');
    return res.data;
  },
  getNearbyShops: async (): Promise<Shop[]> => {
    const res = await api.get('/shops');
    return res.data;
  },
  getMarkets: async (): Promise<Market[]> => {
    const res = await api.get('/markets');
    return res.data;
  },
  getRecommendedProducts: async (): Promise<Product[]> => {
    const res = await api.get('/products');
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
