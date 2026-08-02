import api, { parseApiError } from './api';

export interface SubCategory {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  iconUrl?: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  iconUrl?: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  subCategories: SubCategory[];
}

export const CategoryService = {
  async getAll(city?: string): Promise<Category[]> {
    try {
      const url = city ? `/categories?city=\${encodeURIComponent(city)}` : '/categories';
      const { data } = await api.get<Category[]>(url);
      return data;
    } catch (error) {
      throw parseApiError(error);
    }
  },

  async getOne(id: string): Promise<Category> {
    try {
      const { data } = await api.get<Category>(`/categories/${id}`);
      return data;
    } catch (error) {
      throw parseApiError(error);
    }
  },
};
