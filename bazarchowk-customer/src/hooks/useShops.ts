import { useQuery } from '@tanstack/react-query';
import { ShopService } from '@/services/shop.service';

const SHOP_KEYS = {
  all: ['shops'] as const,
  detail: (id: string) => ['shops', id] as const,
};

export function useShops() {
  return useQuery({
    queryKey: SHOP_KEYS.all,
    queryFn: ShopService.getAll,
  });
}

export function useShop(id: string) {
  return useQuery({
    queryKey: SHOP_KEYS.detail(id),
    queryFn: () => ShopService.getOne(id),
    enabled: !!id,
  });
}
