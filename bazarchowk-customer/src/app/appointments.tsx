import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
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
        { text: "No", style: "cancel" },
        { text: "Yes, Cancel", style: "destructive", onPress: () => cancelMutation.mutate(id) }
      ]
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Text>Loading appointments...</Text>
      </View>
    );
  }

  const upcoming = appointments?.filter((a: any) => a.status === 'CONFIRMED' || a.status === 'PENDING') || [];
  const past = appointments?.filter((a: any) => a.status !== 'CONFIRMED' && a.status !== 'PENDING') || [];

  return (
    <View className="flex-1 bg-gray-50 pt-14">
      <View className="px-4 pb-4">
        <Text className="text-2xl font-bold text-gray-900">My Appointments</Text>
      </View>

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 100 }}>
        
        {upcoming.length > 0 && (
          <View className="mb-6">
            <Text className="text-lg font-bold text-gray-900 mb-3">Upcoming</Text>
            {upcoming.map((app: any) => (
              <View key={app.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-3">
                <View className="flex-row justify-between items-start mb-3">
                  <View>
                    <Text className="font-bold text-lg text-gray-900">{app.serviceOffering.name}</Text>
                    <Text className="text-gray-500">{app.provider.name} • {app.provider.specialty || 'Professional'}</Text>
                  </View>
                  <View className="bg-blue-50 px-3 py-1 rounded-full">
                    <Text className="text-blue-600 text-xs font-bold">{app.status}</Text>
                  </View>
                </View>

                <View className="flex-row items-center mb-4 space-x-4">
                  <View className="flex-row items-center">
                    <Feather name="calendar" size={14} color="#6b7280" />
                    <Text className="text-gray-600 ml-1">
                      {new Date(app.timeSlot.startTime).toLocaleDateString()}
                    </Text>
                  </View>
                  <View className="flex-row items-center ml-4">
                    <Feather name="clock" size={14} color="#6b7280" />
                    <Text className="text-gray-600 ml-1">
                      {new Date(app.timeSlot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity 
                  onPress={() => handleCancel(app.id)}
                  disabled={cancelMutation.isPending}
                  className="bg-red-50 py-3 rounded-xl items-center"
                >
                  <Text className="text-red-600 font-bold">Cancel Appointment</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {past.length > 0 && (
          <View>
            <Text className="text-lg font-bold text-gray-900 mb-3">Past & Cancelled</Text>
            {past.map((app: any) => (
              <View key={app.id} className="bg-white p-4 rounded-2xl border border-gray-200 mb-3 opacity-75">
                <View className="flex-row justify-between items-start">
                  <View>
                    <Text className="font-bold text-gray-900">{app.serviceOffering.name}</Text>
                    <Text className="text-gray-500 text-sm">
                      {new Date(app.timeSlot.startTime).toLocaleDateString()} • {app.status}
                    </Text>
                  </View>
                  <Text className="font-bold text-gray-500">₹{app.serviceOffering.price}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {appointments?.length === 0 && (
          <View className="items-center justify-center py-10 mt-10">
            <View className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-4">
              <Feather name="calendar" size={32} color="#9ca3af" />
            </View>
            <Text className="text-lg font-bold text-gray-900">No Appointments Yet</Text>
            <Text className="text-gray-500 text-center mt-1">Book a salon, doctor, or repair service from nearby shops.</Text>
          </View>
        )}

      </ScrollView>
    </View>
  );
}
