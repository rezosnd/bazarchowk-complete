import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import api from '@/services/api';
import { socketService } from '@/services/socket';
import * as SecureStore from 'expo-secure-store';

export default function PartnerServicesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'SERVICES' | 'STAFF' | 'BOOKINGS'>('BOOKINGS');

  const getShopId = async () => {
    // For demo purposes, assuming shopId is returned in user profile or token
    const res = await api.get('/auth/profile');
    return res.data.shopId || res.data.id;
  };

  const { data: services } = useQuery({
    queryKey: ['partner-services'],
    queryFn: async () => {
      const id = await getShopId();
      return (await api.get(`/appointments/services/${id}`)).data;
    },
  });

  const { data: providers } = useQuery({
    queryKey: ['partner-providers'],
    queryFn: async () => {
      const id = await getShopId();
      return (await api.get(`/appointments/providers/${id}`)).data;
    },
  });

  const { data: bookings } = useQuery({
    queryKey: ['partner-bookings'],
    queryFn: async () => (await api.get(`/appointments/shop/all`)).data,
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => 
      api.patch(`/appointments/shop/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-bookings'] });
    },
    onError: (err: any) => {
      Alert.alert("Error", err.response?.data?.message || "Failed to update status");
    }
  });

  useEffect(() => {
    socketService.on('new_appointment', (data) => {
      queryClient.invalidateQueries({ queryKey: ['partner-bookings'] });
    });
    socketService.on('appointment_cancelled', (data) => {
      queryClient.invalidateQueries({ queryKey: ['partner-bookings'] });
    });
    return () => {
      socketService.off('new_appointment');
      socketService.off('appointment_cancelled');
    };
  }, []);

  return (
    <View className="flex-1 bg-gray-50">
      <View className="pt-12 pb-4 px-4 bg-white shadow-sm flex-row items-center justify-between border-b border-gray-100">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Feather name="arrow-left" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">Appointments Engine</Text>
        </View>
      </View>

      <View className="flex-row bg-white border-b border-gray-200">
        {['BOOKINGS', 'SERVICES', 'STAFF'].map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab as any)}
            className={`flex-1 py-4 items-center border-b-2 ${activeTab === tab ? 'border-blue-600' : 'border-transparent'}`}
          >
            <Text className={`font-bold ${activeTab === tab ? 'text-blue-600' : 'text-gray-500'}`}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView className="flex-1 p-4">
        {activeTab === 'SERVICES' && (
          <View>
            <Text className="text-lg font-bold mb-4">Your Service Menu</Text>
            {services?.map((s: any) => (
              <View key={s.id} className="bg-white p-4 rounded-xl border border-gray-200 mb-3 flex-row justify-between items-center">
                <View>
                  <Text className="font-bold text-gray-900">{s.name}</Text>
                  <Text className="text-gray-500">{s.durationMin} mins</Text>
                </View>
                <Text className="font-bold text-gray-900">₹{s.price}</Text>
              </View>
            ))}
            <TouchableOpacity className="bg-blue-50 py-4 mt-4 rounded-xl items-center border border-blue-200">
              <Text className="font-bold text-blue-600">+ Add New Service</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'STAFF' && (
          <View>
            <Text className="text-lg font-bold mb-4">Professionals & Staff</Text>
            {providers?.map((p: any) => (
              <View key={p.id} className="bg-white p-4 rounded-xl border border-gray-200 mb-3 flex-row items-center">
                <View className="w-12 h-12 bg-gray-100 rounded-full items-center justify-center mr-4">
                  <Feather name="user" size={20} color="#6b7280" />
                </View>
                <View>
                  <Text className="font-bold text-gray-900">{p.name}</Text>
                  <Text className="text-gray-500">{p.specialty}</Text>
                </View>
              </View>
            ))}
            <TouchableOpacity className="bg-blue-50 py-4 mt-4 rounded-xl items-center border border-blue-200">
              <Text className="font-bold text-blue-600">+ Add Staff Member</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'BOOKINGS' && (
          <View>
            <Text className="text-lg font-bold mb-4">Live Appointments</Text>
            {bookings?.map((b: any) => (
              <View key={b.id} className="bg-white p-4 rounded-xl border border-gray-200 mb-3 shadow-sm">
                <View className="flex-row justify-between items-start mb-3">
                  <View>
                    <Text className="font-bold text-lg text-gray-900">{b.serviceOffering.name}</Text>
                    <Text className="text-gray-500">Customer: {b.customer.firstName} {b.customer.lastName}</Text>
                    <Text className="text-gray-500">Staff: {b.provider.name}</Text>
                  </View>
                  <View className={`px-3 py-1 rounded-full ${b.status === 'PENDING' ? 'bg-yellow-100' : b.status === 'CONFIRMED' ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <Text className={`text-xs font-bold ${b.status === 'PENDING' ? 'text-yellow-700' : b.status === 'CONFIRMED' ? 'text-green-700' : 'text-gray-700'}`}>
                      {b.status}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center mb-4 space-x-4">
                  <View className="flex-row items-center">
                    <Feather name="calendar" size={14} color="#6b7280" />
                    <Text className="text-gray-600 ml-1">
                      {new Date(b.timeSlot.startTime).toLocaleDateString()}
                    </Text>
                  </View>
                  <View className="flex-row items-center ml-4">
                    <Feather name="clock" size={14} color="#6b7280" />
                    <Text className="text-gray-600 ml-1">
                      {new Date(b.timeSlot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>

                {b.status === 'PENDING' && (
                  <View className="flex-row space-x-2">
                    <TouchableOpacity 
                      disabled={statusMutation.isPending}
                      onPress={() => statusMutation.mutate({ id: b.id, status: 'CONFIRMED' })}
                      className="flex-1 bg-green-500 py-3 rounded-xl items-center"
                    >
                      <Text className="text-white font-bold">Accept Booking</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      disabled={statusMutation.isPending}
                      onPress={() => statusMutation.mutate({ id: b.id, status: 'CANCELLED' })}
                      className="flex-1 bg-red-100 py-3 rounded-xl items-center"
                    >
                      <Text className="text-red-600 font-bold">Decline</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {b.status === 'CONFIRMED' && (
                  <TouchableOpacity 
                    disabled={statusMutation.isPending}
                    onPress={() => statusMutation.mutate({ id: b.id, status: 'COMPLETED' })}
                    className="w-full bg-blue-600 py-3 rounded-xl items-center mt-2"
                  >
                    <Text className="text-white font-bold">Mark as Completed</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {(!bookings || bookings.length === 0) && (
              <View className="items-center justify-center py-10">
                <Feather name="calendar" size={48} color="#d1d5db" />
                <Text className="text-gray-500 mt-4">No appointments found</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
