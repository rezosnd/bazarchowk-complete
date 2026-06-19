import api, { parseApiError } from './api';

export interface Address {
  id: string;
  title: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
}

export interface CreateAddressDto extends Omit<Address, 'id' | 'isDefault'> {
  isDefault?: boolean;
}

export interface UpdateAddressDto extends Partial<CreateAddressDto> {}

export const AddressService = {
  async getAll(): Promise<Address[]> {
    try {
      const { data } = await api.get<Address[]>('/addresses');
      return data;
    } catch (error) {
      throw parseApiError(error);
    }
  },

  async create(payload: CreateAddressDto): Promise<Address> {
    try {
      const { data } = await api.post<Address>('/addresses', payload);
      return data;
    } catch (error) {
      throw parseApiError(error);
    }
  },

  async update(id: string, payload: UpdateAddressDto): Promise<Address> {
    try {
      const { data } = await api.patch<Address>(`/addresses/${id}`, payload);
      return data;
    } catch (error) {
      throw parseApiError(error);
    }
  },

  async delete(id: string): Promise<{ message: string }> {
    try {
      const { data } = await api.delete<{ message: string }>(`/addresses/${id}`);
      return data;
    } catch (error) {
      throw parseApiError(error);
    }
  },

  async setDefault(id: string): Promise<{ message: string }> {
    try {
      const { data } = await api.patch<{ message: string }>(`/addresses/${id}/default`);
      return data;
    } catch (error) {
      throw parseApiError(error);
    }
  },
};
