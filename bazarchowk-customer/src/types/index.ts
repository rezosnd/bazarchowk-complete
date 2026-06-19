// ─── Shared App Types ─────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  statusCode: number;
}

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

export interface Address {
  id: string;
  label: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  coordinates?: GeoCoordinates;
  isDefault: boolean;
}

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export interface Order {
  id: string;
  status: OrderStatus;
  totalAmount: number;
  deliveryFee: number;
  items: OrderItem[];
  address: Address;
  createdAt: string;
  estimatedDelivery?: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  image?: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  discountPrice?: number;
  image?: string;
  category: string;
  shopId: string;
  inStock: boolean;
  rating?: number;
  reviewCount?: number;
}

export interface Shop {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  category: string;
  rating?: number;
  reviewCount?: number;
  deliveryTime?: string;
  deliveryFee?: number;
  minOrder?: number;
  isOpen: boolean;
  distance?: number;
}
