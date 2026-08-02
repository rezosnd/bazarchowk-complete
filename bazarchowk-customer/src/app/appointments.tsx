import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import api from '@/services/api';

export default function AppointmentsTab() {
  const queryClient = useQueryClient();

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['my-appointments'],
    queryFn: async () => (await api.get('/appointments/my-appointments')).data,
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/appointments/${id}/cancel`),
    onSuccess: () => {
      Alert.alert("Success", "Appointment cancelled successfully");
      queryClient.invalidateQueries({ queryKey: ['my-appointments'] });
    },
    onError: (err: any) => {
      Alert.alert("Error", err.response?.data?.message || "Failed to cancel");
    }
  });

  const handleCancel = (id: string) => {
    Alert.alert(
      "Cancel Appointment",
      "Are you sure you want to cancel this appointment?",
      [
        { text: "Keep it", style: "cancel" },
        { text: "Yes, Cancel", style: "destructive", onPress: () => cancelMutation.mutate(id) }
      ]
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return { bg: 'bg-green-100', text: 'text-green-700', icon: 'check-circle' };
      case 'PENDING': return { bg: 'bg-amber-100', text: 'text-amber-700', icon: 'clock' };
      case 'CANCELLED': return { bg: 'bg-red-100', text: 'text-red-700', icon: 'x-circle' };
      case 'COMPLETED': return { bg: 'bg-blue-100', text: 'text-blue-700', icon: 'award' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-700', icon: 'info' };
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F8F9FB]">
        <ActivityIndicator size="large" color="#00B140" />
        <Text className="mt-4 text-gray-500 font-medium">Fetching your schedule...</Text>
      </View>
    );
  }

  const upcoming = appointments?.filter((a: any) => a.status === 'CONFIRMED' || a.status === 'PENDING') || [];
  const past = appointments?.filter((a: any) => a.status !== 'CONFIRMED' && a.status !== 'PENDING') || [];

  return (
    <View className="flex-1 bg-[#F8F9FB]">
      <View className="px-5 pt-14 pb-4 bg-white shadow-sm z-10">
        <Text className="text-[28px] font-extrabold text-gray-900 tracking-tight">Appointments</Text>
        <Text className="text-gray-500 text-sm mt-1 font-medium">Manage your bookings & services</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        
        {upcoming.length > 0 && (
          <View className="mb-8">
            <Text className="text-lg font-black text-gray-800 mb-4 tracking-wide uppercase">Upcoming</Text>
            {upcoming.map((app: any) => {
              const badge = getStatusBadge(app.status);
              return (
                <View key={app.id} className="bg-white rounded-3xl p-5 mb-4 shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-gray-100">
                  
                  <View className="flex-row justify-between items-start mb-4">
                    <View className="flex-row items-center flex-1 pr-4">
                      <View className="w-12 h-12 rounded-full bg-indigo-50 items-center justify-center mr-3">
                        <Ionicons name="cut-outline" size={24} color="#6366F1" />
                      </View>
                      <View>
                        <Text className="font-bold text-[17px] text-gray-900 mb-0.5">{app.serviceOffering.name}</Text>
                        <Text className="text-gray-500 text-xs font-medium">{app.provider.name} • {app.provider.specialty || 'Pro'}</Text>
                      </View>
                    </View>
                    
                    <View className={`flex-row items-center px-2.5 py-1 rounded-lg ${badge.bg}`}>
                      <Feather name={badge.icon as any} size={12} color={badge.text.replace('text-', '')} />
                      <Text className={`text-[10px] font-black uppercase ml-1 tracking-wider ${badge.text}`}>
                        {app.status}
                      </Text>
                    </View>
                  </View>

                  <View className="bg-gray-50 rounded-2xl p-4 mb-4 flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <View className="w-8 h-8 rounded-full bg-white items-center justify-center shadow-sm">
                        <Feather name="calendar" size={14} color="#00B140" />
                      </View>
                      <View className="ml-3">
                        <Text className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Date</Text>
                        <Text className="text-gray-900 font-bold text-sm">
                          {new Date(app.timeSlot.startTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </Text>
                      </View>
                    </View>

                    <View className="h-8 w-[1px] bg-gray-200" />

                    <View className="flex-row items-center">
                      <View className="w-8 h-8 rounded-full bg-white items-center justify-center shadow-sm">
                        <Feather name="clock" size={14} color="#F59E0B" />
                      </View>
                      <View className="ml-3">
                        <Text className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Time</Text>
                        <Text className="text-gray-900 font-bold text-sm">
                          {new Date(app.timeSlot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity 
                    onPress={() => handleCancel(app.id)}
                    disabled={cancelMutation.isPending}
                    className="bg-red-50 py-3.5 rounded-2xl items-center flex-row justify-center active:bg-red-100"
                  >
                    <Feather name="x" size={16} color="#DC2626" />
                    <Text className="text-red-600 font-bold ml-2">Cancel Booking</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {past.length > 0 && (
          <View>
            <Text className="text-lg font-black text-gray-800 mb-4 tracking-wide uppercase">Past & Cancelled</Text>
            {past.map((app: any) => {
              const badge = getStatusBadge(app.status);
              return (
                <View key={app.id} className="bg-white p-4 rounded-2xl border border-gray-100 mb-3 flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <View className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-3">
                      <Ionicons name="checkmark-done" size={18} color="#9CA3AF" />
                    </View>
                    <View>
                      <Text className="font-bold text-gray-800 text-[15px]">{app.serviceOffering.name}</Text>
                      <Text className="text-gray-400 text-xs mt-0.5">
                        {new Date(app.timeSlot.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {app.provider.name}
                      </Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className="font-bold text-gray-900">₹{app.serviceOffering.price}</Text>
                    <Text className={`text-[10px] font-bold uppercase mt-1 ${badge.text}`}>{app.status}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {appointments?.length === 0 && (
          <View className="items-center justify-center py-16 mt-10">
            <View className="w-24 h-24 bg-white rounded-full items-center justify-center mb-6 shadow-[0_8px_30px_rgba(0,177,64,0.1)]">
              <Ionicons name="calendar-clear-outline" size={40} color="#00B140" />
            </View>
            <Text className="text-2xl font-black text-gray-900 tracking-tight">No Bookings Yet</Text>
            <Text className="text-gray-500 text-center mt-2 px-8 font-medium leading-5">
              Book a salon, doctor, or repair service from nearby trusted professionals.
            </Text>
            <TouchableOpacity className="mt-8 bg-[#00B140] px-8 py-4 rounded-full shadow-[0_4px_14px_rgba(0,177,64,0.4)]">
              <Text className="text-white font-bold text-[15px]">Explore Services</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </View>
  );
}
