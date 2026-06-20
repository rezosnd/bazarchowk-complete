import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import api from '@/services/api';
import * as SecureStore from 'expo-secure-store';

export default function PartnerServicesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'SERVICES' | 'STAFF' | 'SLOTS'>('SERVICES');

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
        {['SERVICES', 'STAFF', 'SLOTS'].map((tab) => (
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

        {activeTab === 'SLOTS' && (
          <View className="items-center justify-center py-10">
            <Feather name="clock" size={48} color="#9ca3af" />
            <Text className="text-lg font-bold text-gray-900 mt-4">Time Slot Management</Text>
            <Text className="text-gray-500 text-center mt-2 px-4">
              Select a staff member to generate their daily availability calendar.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
