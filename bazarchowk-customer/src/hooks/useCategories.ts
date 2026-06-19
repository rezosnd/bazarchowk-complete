import { useQuery } from '@tanstack/react-query';
import { CategoryService } from '@/services/category.service';

const CATEGORY_KEYS = {
  all: ['categories'] as const,
  detail: (id: string) => ['categories', id] as const,
};

export function useCategories() {
  return useQuery({
    queryKey: CATEGORY_KEYS.all,
    queryFn: CategoryService.getAll,
  });
}

export function useCategory(id: string) {
  return useQuery({
    queryKey: CATEGORY_KEYS.detail(id),
    queryFn: () => CategoryService.getOne(id),
    enabled: !!id,
  });
}
