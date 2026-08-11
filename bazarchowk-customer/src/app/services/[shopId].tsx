import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import api from '@/services/api';
import { useAuthStore } from '@/store/auth.store';

export default function ShopServicesScreen() {
  const { shopId } = useLocalSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();

  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  const { data: services, isLoading: loadingServices } = useQuery({
    queryKey: ['shop-services', shopId],
    queryFn: async () => (await api.get(`/appointments/services/${shopId}`)).data,
  });

  const { data: providers, isLoading: loadingProviders } = useQuery({
    queryKey: ['shop-providers', shopId],
    queryFn: async () => (await api.get(`/appointments/providers/${shopId}`)).data,
  });

  const { data: timeSlots, isLoading: loadingSlots } = useQuery({
    queryKey: ['provider-slots', selectedProviderId],
    queryFn: async () => (await api.get(`/appointments/slots/provider/${selectedProviderId}`)).data,
    enabled: !!selectedProviderId,
  });

  const { data: addresses } = useQuery({
    queryKey: ['addresses'],
    queryFn: async () => {
      const res = await api.get('/addresses');
      return res.data;
    },
    enabled: isAuthenticated,
  });

  // Auto-select default address when loaded
  React.useEffect(() => {
    if (addresses && addresses.length > 0 && !selectedAddressId) {
      const defaultAddress = addresses.find((a: any) => a.isDefault) || addresses[0];
      setSelectedAddressId(defaultAddress.id);
    }
  }, [addresses]);

  const bookMutation = useMutation({
    mutationFn: async (slotId: string) => {
      if (!isAuthenticated) {
        Alert.alert('Login Required', 'Please login to book an appointment.', [
          { text: 'OK', onPress: () => router.push('/(auth)/login' as any) }
        ]);
        return Promise.reject(new Error('Login Required'));
      }
      if (!selectedAddressId) {
        Alert.alert('Address Required', 'Please select a service location.');
        return Promise.reject(new Error('Address Required'));
      }
      return api.post('/appointments', {
        serviceOfferingId: selectedServiceId,
        providerId: selectedProviderId,
        timeSlotId: slotId,
        serviceAddressId: selectedAddressId,
        notes: "Booked via BazarChowk App",
        paymentMethod: 'COD',
        paymentStatus: 'PENDING'
      });
    },
    onSuccess: () => {
      Alert.alert("Success", "Appointment Booked Successfully!");
      queryClient.invalidateQueries({ queryKey: ['provider-slots'] });
      queryClient.invalidateQueries({ queryKey: ['my-appointments'] });
      router.push('/(tabs)/appointments' as any);
    },
    onError: (err: any) => {
      Alert.alert("Error", err.response?.data?.message || "Failed to book appointment");
    }
  });

  if (loadingServices || loadingProviders) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text>Loading Services...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <View className="pt-12 pb-4 px-4 bg-white shadow-sm flex-row items-center border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Feather name="arrow-left" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">Book Appointment</Text>
      </View>

      <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Step 1: Select Service */}
        <Text className="text-lg font-bold text-gray-900 mb-3">1. Select Service</Text>
        <View className="mb-6 space-y-3">
          {services?.map((s: any) => (
            <TouchableOpacity
              key={s.id}
              onPress={() => setSelectedServiceId(s.id)}
              className={`p-4 rounded-xl border ${selectedServiceId === s.id ? 'bg-blue-50 border-blue-500' : 'bg-white border-gray-200'}`}
            >
              <View className="flex-row justify-between items-center">
                <View>
                  <Text className={`font-bold ${selectedServiceId === s.id ? 'text-blue-900' : 'text-gray-900'}`}>{s.name}</Text>
                  <Text className="text-gray-500 mt-1">{s.durationMin} mins</Text>
                </View>
                <Text className="font-bold text-gray-900">₹{s.price}</Text>
              </View>
            </TouchableOpacity>
          ))}
          {(!services || services.length === 0) && <Text className="text-gray-500 text-center py-4">No services available</Text>}
        </View>

        {/* Step 2: Select Provider */}
        {selectedServiceId && (
          <>
            <Text className="text-lg font-bold text-gray-900 mb-3">2. Select Professional</Text>
            <View className="mb-6 flex-row flex-wrap">
              {providers?.map((p: any) => (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => setSelectedProviderId(p.id)}
                  className={`p-4 rounded-xl border mr-3 mb-3 w-[45%] ${selectedProviderId === p.id ? 'bg-blue-50 border-blue-500' : 'bg-white border-gray-200'}`}
                >
                  <View className="w-12 h-12 bg-gray-100 rounded-full mb-3 items-center justify-center">
                    <Feather name="user" size={20} color="#6b7280" />
                  </View>
                  <Text className="font-bold text-gray-900">{p.name}</Text>
                  <Text className="text-gray-500 text-xs">{p.specialty || 'Staff'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Step 3: Select Service Location */}
        {selectedProviderId && (
          <>
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-lg font-bold text-gray-900">3. Select Service Location</Text>
              <TouchableOpacity onPress={() => router.push('/addresses/new' as any)}>
                <Text className="text-blue-600 font-bold">+ Add New</Text>
              </TouchableOpacity>
            </View>
            
            <View className="mb-6 space-y-3">
              {addresses?.map((addr: any) => (
                <TouchableOpacity
                  key={addr.id}
                  onPress={() => setSelectedAddressId(addr.id)}
                  className={`p-4 rounded-xl border ${selectedAddressId === addr.id ? 'bg-blue-50 border-blue-500' : 'bg-white border-gray-200'}`}
                >
                  <View className="flex-row items-center">
                    <Feather name="map-pin" size={18} color={selectedAddressId === addr.id ? '#3b82f6' : '#6b7280'} />
                    <View className="ml-3 flex-1">
                      <Text className={`font-bold ${selectedAddressId === addr.id ? 'text-blue-900' : 'text-gray-900'}`}>{addr.type}</Text>
                      <Text className="text-gray-500 text-sm mt-1" numberOfLines={2}>
                        {addr.streetAddress}, {addr.city}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
              {(!addresses || addresses.length === 0) && (
                <Text className="text-gray-500 text-center py-4">No addresses found. Please add an address.</Text>
              )}
            </View>
          </>
        )}

        {/* Step 4: Select Time Slot & Book */}
        {selectedAddressId && selectedProviderId && (
          <>
            <Text className="text-lg font-bold text-gray-900 mb-3">4. Select Time & Book</Text>
            {loadingSlots ? (
               <Text className="text-gray-500">Loading schedule...</Text>
            ) : (
              <View className="flex-row flex-wrap">
                {timeSlots?.map((slot: any) => {
                  const isFull = slot.isFull;
                  return (
                    <TouchableOpacity
                      key={slot.id}
                      disabled={isFull || bookMutation.isPending}
                      onPress={() => bookMutation.mutate(slot.id)}
                      className={`p-3 rounded-lg border mr-3 mb-3 min-w-[100px] items-center justify-center ${
                        isFull 
                          ? 'bg-gray-100 border-gray-200 opacity-60' 
                          : 'bg-white border-gray-300 active:bg-blue-50 active:border-blue-500'
                      }`}
                    >
                      <Text className={`font-semibold ${isFull ? 'text-gray-400' : 'text-gray-900'}`}>
                        {new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      {slot.maxCapacity > 1 && (
                        <Text className="text-[10px] mt-1 text-gray-500">
                          {slot.availableSpots} left
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
                {(!timeSlots || timeSlots.length === 0) && (
                  <Text className="text-gray-500">No time slots available for this professional.</Text>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
