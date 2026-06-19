import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AddressService, Address, CreateAddressDto, UpdateAddressDto } from '@/services/address.service';

const ADDRESS_KEYS = {
  all: ['addresses'] as const,
};

export function useAddresses() {
  return useQuery({
    queryKey: ADDRESS_KEYS.all,
    queryFn: AddressService.getAll,
  });
}

export function useAddAddress() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateAddressDto) => AddressService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADDRESS_KEYS.all });
    },
  });
}

export function useUpdateAddress() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAddressDto }) => 
      AddressService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADDRESS_KEYS.all });
    },
  });
}

export function useDeleteAddress() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => AddressService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADDRESS_KEYS.all });
    },
  });
}

export function useSetDefaultAddress() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => AddressService.setDefault(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADDRESS_KEYS.all });
    },
  });
}
