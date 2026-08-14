import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import api from '@/services/api';
import { useAuthStore } from '@/store/auth.store';

const PRIMARY = '#00B140';

export default function ShopServicesScreen() {
  const { shopId } = useLocalSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();

  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);

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

  const bookMutation = useMutation({
    mutationFn: async (slotId: string) => {
      if (!isAuthenticated) {
        Alert.alert('Login Required', 'Please login to book an appointment.', [
          { text: 'OK', onPress: () => router.push('/(auth)/login' as any) }
        ]);
        return Promise.reject(new Error('Login Required'));
      }
      return api.post('/appointments', {
        serviceOfferingId: selectedServiceId,
        providerId: selectedProviderId,
        timeSlotId: slotId,
        notes: "Booked via BazarChowk App",
        paymentMethod: 'COD',
        paymentStatus: 'PENDING'
      });
    },
    onSuccess: () => {
      Alert.alert("Success", "Appointment Booked Successfully!");
      queryClient.invalidateQueries({ queryKey: ['provider-slots'] });
      queryClient.invalidateQueries({ queryKey: ['my-appointments'] });
      router.push('/appointments' as any);
    },
    onError: (err: any) => {
      Alert.alert("Error", err.response?.data?.message || "Failed to book appointment");
    }
  });

  if (loadingServices || loadingProviders) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={{ marginTop: 12 }}>Loading Services...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book Appointment</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* Step 1: Select Service */}
        <Text style={styles.stepTitle}>1. Select Service</Text>
        <View style={styles.sectionContainer}>
          {services?.map((s: any) => {
            const isSelected = selectedServiceId === s.id;
            return (
              <TouchableOpacity
                key={s.id}
                onPress={() => setSelectedServiceId(s.id)}
                style={[styles.serviceCard, isSelected && styles.serviceCardSelected]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.serviceName, isSelected && { color: PRIMARY }]}>{s.name}</Text>
                  <Text style={styles.serviceDuration}>{s.durationMin} mins</Text>
                </View>
                <Text style={styles.servicePrice}>₹{s.price}</Text>
              </TouchableOpacity>
            );
          })}
          {(!services || services.length === 0) && <Text style={styles.emptyText}>No services available</Text>}
        </View>

        {/* Step 2: Select Provider */}
        {selectedServiceId && (
          <>
            <Text style={styles.stepTitle}>2. Select Professional</Text>
            <View style={styles.providerGrid}>
              {providers?.map((p: any) => {
                const isSelected = selectedProviderId === p.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => setSelectedProviderId(p.id)}
                    style={[styles.providerCard, isSelected && styles.providerCardSelected]}
                  >
                    <View style={styles.providerAvatar}>
                      <Feather name="user" size={20} color={isSelected ? PRIMARY : "#6b7280"} />
                    </View>
                    <Text style={[styles.providerName, isSelected && { color: PRIMARY }]}>{p.name}</Text>
                    <Text style={styles.providerSpecialty}>{p.specialty || 'Staff'}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* Step 3: Select Time Slot & Book */}
        {selectedProviderId && (
          <>
            <Text style={styles.stepTitle}>3. Select Time & Book</Text>
            {loadingSlots ? (
               <Text style={styles.emptyText}>Loading schedule...</Text>
            ) : (
              <View style={styles.slotsGrid}>
                {timeSlots?.map((slot: any) => {
                  const isFull = slot.isFull;
                  return (
                    <TouchableOpacity
                      key={slot.id}
                      disabled={isFull || bookMutation.isPending}
                      onPress={() => bookMutation.mutate(slot.id)}
                      style={[styles.slotCard, isFull && styles.slotCardFull]}
                    >
                      <Text style={[styles.slotText, isFull && styles.slotTextFull]}>
                        {new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      {slot.maxCapacity > 1 && (
                        <Text style={styles.slotCapacityText}>
                          {slot.availableSpots} left
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
                {(!timeSlots || timeSlots.length === 0) && (
                  <Text style={styles.emptyText}>No time slots available for this professional.</Text>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingTop: 48, paddingBottom: 16, paddingHorizontal: 16, backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  backBtn: { marginRight: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#0F172A' },
  
  stepTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F172A', marginBottom: 12 },
  sectionContainer: { marginBottom: 24, gap: 12 },
  
  serviceCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  serviceCardSelected: { borderColor: PRIMARY, backgroundColor: '#F0FDF4' },
  serviceName: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },
  serviceDuration: { fontSize: 14, color: '#64748B', marginTop: 4 },
  servicePrice: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },
  
  providerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  providerCard: { width: '48%', backgroundColor: '#FFF', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
  providerCardSelected: { borderColor: PRIMARY, backgroundColor: '#F0FDF4' },
  providerAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  providerName: { fontSize: 15, fontWeight: 'bold', color: '#0F172A', textAlign: 'center' },
  providerSpecialty: { fontSize: 12, color: '#64748B', marginTop: 4, textAlign: 'center' },
  
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  slotCard: { paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', minWidth: 100 },
  slotCardFull: { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0', opacity: 0.6 },
  slotText: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  slotTextFull: { color: '#94A3B8' },
  slotCapacityText: { fontSize: 10, color: '#64748B', marginTop: 4 },
  
  emptyText: { color: '#64748B', textAlign: 'center', paddingVertical: 16 },
});
