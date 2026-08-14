import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, FlatList, Modal, Alert
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import api from '@/services/api';
import { useAuthStore } from '@/store';

const CATEGORY_META: Record<string, { color: string; gradient: [string, string]; icon: string; emoji: string }> = {
  Salon: { color: '#EC4899', gradient: ['#FCE7F3', '#FDF2F8'], icon: 'cut', emoji: '✂️' },
  Plumber: { color: '#3B82F6', gradient: ['#DBEAFE', '#EFF6FF'], icon: 'build', emoji: '🔧' },
  Electrician: { color: '#EAB308', gradient: ['#FEF3C7', '#FFFBEB'], icon: 'flash', emoji: '⚡' },
  Cleaning: { color: '#14B8A6', gradient: ['#CCFBF1', '#F0FDFA'], icon: 'sparkles', emoji: '🧹' },
  Carpenter: { color: '#F97316', gradient: ['#FFEDD5', '#FFF7ED'], icon: 'hammer', emoji: '🔨' },
  Painter: { color: '#8B5CF6', gradient: ['#EDE9FE', '#F5F3FF'], icon: 'brush', emoji: '🎨' },
};

export default function ServiceCategoryScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const meta = CATEGORY_META[type || 'Salon'] || CATEGORY_META['Salon'];

  const [selectedShop, setSelectedShop] = useState<any>(null);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [showBookModal, setShowBookModal] = useState(false);
  const [bookingStep, setBookingStep] = useState<'service' | 'provider' | 'slot'>('service');

  // Fetch all shops of this service type
  const { data: shops, isLoading } = useQuery({
    queryKey: ['service-shops', type],
    queryFn: async () => {
      const res = await api.get(`/shops?serviceType=${type}&hasServices=true`);
      return res.data?.data || res.data || [];
    },
  });

  // Fetch services for selected shop
  const { data: services, isLoading: loadingServices } = useQuery({
    queryKey: ['shop-services', selectedShop?.id],
    queryFn: async () => (await api.get(`/appointments/services/${selectedShop.id}`)).data,
    enabled: !!selectedShop?.id,
  });

  // Fetch providers for selected shop
  const { data: providers, isLoading: loadingProviders } = useQuery({
    queryKey: ['shop-providers', selectedShop?.id],
    queryFn: async () => (await api.get(`/appointments/providers/${selectedShop.id}`)).data,
    enabled: !!selectedShop?.id,
  });

  // Fetch slots for selected provider
  const { data: slots, isLoading: loadingSlots } = useQuery({
    queryKey: ['provider-slots', selectedProvider?.id],
    queryFn: async () => (await api.get(`/appointments/slots/provider/${selectedProvider.id}`)).data,
    enabled: !!selectedProvider?.id,
  });

  const bookMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSlot || !selectedService || !selectedProvider) return;
      return api.post('/appointments/book', {
        shopId: selectedShop.id,
        serviceOfferingId: selectedService.id,
        providerId: selectedProvider.id,
        timeSlotId: selectedSlot.id,
        paymentMethod: 'COD',
      });
    },
    onSuccess: () => {
      Alert.alert('✅ Booking Confirmed!', `Your ${selectedService?.name} appointment with ${selectedProvider?.name} is confirmed!`, [
        { text: 'View My Bookings', onPress: () => router.push('/appointments' as any) },
        { text: 'OK' },
      ]);
      setShowBookModal(false);
      setSelectedService(null);
      setSelectedProvider(null);
      setSelectedSlot(null);
      setBookingStep('service');
    },
    onError: (err: any) => {
      Alert.alert('Booking Failed', err?.response?.data?.message || 'Could not complete booking. Please try again.');
    },
  });

  const handleShopPress = (shop: any) => {
    setSelectedShop(shop);
    setSelectedService(null);
    setSelectedProvider(null);
    setSelectedSlot(null);
    setBookingStep('service');
    setShowBookModal(true);
  };

  const formatSlotTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatSlotDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <LinearGradient colors={meta.gradient} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={meta.color} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerEmoji}>{meta.emoji}</Text>
          <View>
            <Text style={[styles.headerTitle, { color: meta.color }]}>{type} Services</Text>
            <Text style={styles.headerSub}>Find & book verified professionals</Text>
          </View>
        </View>
      </LinearGradient>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={meta.color} />
          <Text style={styles.loadingText}>Finding {type} professionals near you...</Text>
        </View>
      ) : !shops || shops.length === 0 ? (
        <View style={styles.centered}>
          <Text style={{ fontSize: 60 }}>{meta.emoji}</Text>
          <Text style={styles.emptyTitle}>No {type} Shops Yet</Text>
          <Text style={styles.emptySub}>We're onboarding {type} professionals in your area. Check back soon!</Text>
          <TouchableOpacity style={[styles.backHomeBtn, { backgroundColor: meta.color }]} onPress={() => router.back()}>
            <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 15 }}>← Back to Home</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={shops}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          ListHeaderComponent={
            <Text style={styles.resultCount}>{shops.length} Professionals Available</Text>
          }
          renderItem={({ item: shop }) => (
            <TouchableOpacity style={styles.shopCard} onPress={() => handleShopPress(shop)} activeOpacity={0.8}>
              <LinearGradient colors={meta.gradient} style={styles.shopIconWrap}>
                <Text style={{ fontSize: 28 }}>{meta.emoji}</Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.shopName}>{shop.name}</Text>
                <Text style={styles.shopCity}>{shop.city || 'Local Area'}</Text>
                <View style={styles.tagsRow}>
                  {shop.isOpen ? (
                    <View style={styles.openBadge}><Text style={styles.openBadgeText}>● Open</Text></View>
                  ) : (
                    <View style={styles.closedBadge}><Text style={styles.closedBadgeText}>● Closed</Text></View>
                  )}
                  {shop.isVerified && (
                    <View style={styles.verifiedBadge}>
                      <Ionicons name="checkmark-circle" size={12} color="#00B140" />
                      <Text style={styles.verifiedBadgeText}>Verified</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={[styles.bookNowBtn, { backgroundColor: meta.color }]}>
                <Text style={styles.bookNowText}>Book</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Booking Modal */}
      <Modal visible={showBookModal} animationType="slide" transparent onRequestClose={() => setShowBookModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Book Appointment</Text>
                <Text style={styles.modalShopName}>{selectedShop?.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowBookModal(false)}>
                <Ionicons name="close-circle" size={28} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* Step Indicator */}
            <View style={styles.steps}>
              {['Service', 'Staff', 'Time'].map((s, i) => {
                const stepKeys = ['service', 'provider', 'slot'];
                const activeIdx = stepKeys.indexOf(bookingStep);
                const done = i < activeIdx;
                const active = i === activeIdx;
                return (
                  <View key={s} style={{ alignItems: 'center', flex: 1 }}>
                    <View style={[styles.stepDot, done && { backgroundColor: '#00B140' }, active && { backgroundColor: meta.color, borderColor: meta.color }]}>
                      {done ? <Ionicons name="checkmark" size={14} color="#FFF" /> : <Text style={[styles.stepNum, active && { color: '#FFF' }]}>{i + 1}</Text>}
                    </View>
                    <Text style={[styles.stepLabel, active && { color: meta.color, fontWeight: '700' }]}>{s}</Text>
                  </View>
                );
              })}
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
              {/* Step 1: Select Service */}
              {bookingStep === 'service' && (
                <View>
                  <Text style={styles.stepTitle}>Choose a Service</Text>
                  {loadingServices ? (
                    <ActivityIndicator color={meta.color} style={{ marginTop: 24 }} />
                  ) : !services || services.length === 0 ? (
                    <View style={styles.emptyStep}>
                      <Text style={styles.emptyStepIcon}>🔍</Text>
                      <Text style={styles.emptyStepText}>No services listed yet by this shop.</Text>
                    </View>
                  ) : services.map((s: any) => (
                    <TouchableOpacity
                      key={s.id}
                      style={[styles.optionCard, selectedService?.id === s.id && { borderColor: meta.color, backgroundColor: meta.gradient[0] }]}
                      onPress={() => setSelectedService(s)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.optionName}>{s.name}</Text>
                        <Text style={styles.optionSub}>{s.durationMin} minutes</Text>
                      </View>
                      <Text style={[styles.optionPrice, { color: meta.color }]}>₹{s.price}</Text>
                      {selectedService?.id === s.id && <Ionicons name="checkmark-circle" size={22} color={meta.color} style={{ marginLeft: 8 }} />}
                    </TouchableOpacity>
                  ))}
                  {selectedService && (
                    <TouchableOpacity style={[styles.nextBtn, { backgroundColor: meta.color }]} onPress={() => setBookingStep('provider')}>
                      <Text style={styles.nextBtnText}>Next: Choose Staff →</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Step 2: Select Provider */}
              {bookingStep === 'provider' && (
                <View>
                  <Text style={styles.stepTitle}>Choose a Professional</Text>
                  {loadingProviders ? (
                    <ActivityIndicator color={meta.color} style={{ marginTop: 24 }} />
                  ) : !providers || providers.length === 0 ? (
                    <View style={styles.emptyStep}>
                      <Text style={styles.emptyStepIcon}>👤</Text>
                      <Text style={styles.emptyStepText}>No staff members listed yet.</Text>
                    </View>
                  ) : providers.map((p: any) => (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.optionCard, selectedProvider?.id === p.id && { borderColor: meta.color, backgroundColor: meta.gradient[0] }]}
                      onPress={() => setSelectedProvider(p)}
                    >
                      <View style={[styles.providerAvatar, { backgroundColor: meta.gradient[0] }]}>
                        <Text style={{ fontSize: 20 }}>👤</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.optionName}>{p.name}</Text>
                        <Text style={styles.optionSub}>{p.specialty || 'Professional'}</Text>
                      </View>
                      {selectedProvider?.id === p.id && <Ionicons name="checkmark-circle" size={22} color={meta.color} />}
                    </TouchableOpacity>
                  ))}
                  <View style={styles.navRow}>
                    <TouchableOpacity style={styles.backStep} onPress={() => setBookingStep('service')}>
                      <Text style={{ color: '#64748B', fontWeight: '700' }}>← Back</Text>
                    </TouchableOpacity>
                    {selectedProvider && (
                      <TouchableOpacity style={[styles.nextBtn, { backgroundColor: meta.color, flex: 1, marginLeft: 12 }]} onPress={() => setBookingStep('slot')}>
                        <Text style={styles.nextBtnText}>Next: Pick Time →</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}

              {/* Step 3: Select Time Slot */}
              {bookingStep === 'slot' && (
                <View>
                  <Text style={styles.stepTitle}>Pick a Time Slot</Text>
                  {loadingSlots ? (
                    <ActivityIndicator color={meta.color} style={{ marginTop: 24 }} />
                  ) : !slots || slots.length === 0 ? (
                    <View style={styles.emptyStep}>
                      <Text style={styles.emptyStepIcon}>📅</Text>
                      <Text style={styles.emptyStepText}>No available slots right now. Try another staff member.</Text>
                    </View>
                  ) : slots.map((slot: any) => (
                    <TouchableOpacity
                      key={slot.id}
                      style={[styles.optionCard, selectedSlot?.id === slot.id && { borderColor: meta.color, backgroundColor: meta.gradient[0] }]}
                      onPress={() => setSelectedSlot(slot)}
                    >
                      <Ionicons name="time-outline" size={20} color={selectedSlot?.id === slot.id ? meta.color : '#64748B'} />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.optionName}>{formatSlotDate(slot.startTime)}</Text>
                        <Text style={styles.optionSub}>{formatSlotTime(slot.startTime)} – {formatSlotTime(slot.endTime)}</Text>
                      </View>
                      {selectedSlot?.id === slot.id && <Ionicons name="checkmark-circle" size={22} color={meta.color} />}
                    </TouchableOpacity>
                  ))}

                  {/* Summary & Confirm */}
                  {selectedSlot && (
                    <View style={styles.summaryCard}>
                      <Text style={styles.summaryTitle}>Booking Summary</Text>
                      <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Service</Text><Text style={styles.summaryVal}>{selectedService?.name}</Text></View>
                      <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Staff</Text><Text style={styles.summaryVal}>{selectedProvider?.name}</Text></View>
                      <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Time</Text><Text style={styles.summaryVal}>{formatSlotDate(selectedSlot.startTime)} at {formatSlotTime(selectedSlot.startTime)}</Text></View>
                      <View style={[styles.summaryRow, { borderTopWidth: 1, borderColor: '#E2E8F0', marginTop: 8, paddingTop: 8 }]}>
                        <Text style={[styles.summaryLabel, { fontWeight: '800' }]}>Total</Text>
                        <Text style={[styles.summaryVal, { color: meta.color, fontSize: 18, fontWeight: '900' }]}>₹{selectedService?.price}</Text>
                      </View>
                    </View>
                  )}

                  <View style={styles.navRow}>
                    <TouchableOpacity style={styles.backStep} onPress={() => setBookingStep('provider')}>
                      <Text style={{ color: '#64748B', fontWeight: '700' }}>← Back</Text>
                    </TouchableOpacity>
                    {selectedSlot && (
                      <TouchableOpacity
                        style={[styles.nextBtn, { backgroundColor: meta.color, flex: 1, marginLeft: 12 }]}
                        onPress={() => {
                          if (!isAuthenticated) {
                            Alert.alert('Login Required', 'Please login to book.', [
                              { text: 'Login', onPress: () => { setShowBookModal(false); router.push('/(auth)/login' as any); } },
                              { text: 'Cancel', style: 'cancel' }
                            ]);
                            return;
                          }
                          bookMutation.mutate();
                        }}
                        disabled={bookMutation.isPending}
                      >
                        {bookMutation.isPending
                          ? <ActivityIndicator color="#FFF" />
                          : <Text style={styles.nextBtnText}>✅ Confirm Booking</Text>
                        }
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingHorizontal: 16, paddingBottom: 20, paddingTop: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerEmoji: { fontSize: 40 },
  headerTitle: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: '#64748B', fontWeight: '600', marginTop: 2 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { marginTop: 16, color: '#64748B', fontWeight: '600', fontSize: 15 },
  emptyTitle: { fontSize: 22, fontWeight: '900', color: '#0F172A', marginTop: 16 },
  emptySub: { fontSize: 14, color: '#64748B', textAlign: 'center', marginTop: 8, lineHeight: 22 },
  backHomeBtn: { marginTop: 24, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 20 },
  resultCount: { fontSize: 14, fontWeight: '600', color: '#64748B', marginBottom: 12 },
  shopCard: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 20, padding: 16, marginBottom: 12, alignItems: 'center', gap: 14, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 },
  shopIconWrap: { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  shopName: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  shopCity: { fontSize: 13, color: '#64748B', marginTop: 2 },
  tagsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  openBadge: { backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  openBadgeText: { color: '#16A34A', fontSize: 11, fontWeight: '700' },
  closedBadge: { backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  closedBadgeText: { color: '#DC2626', fontSize: 11, fontWeight: '700' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, gap: 3 },
  verifiedBadgeText: { color: '#00B140', fontSize: 11, fontWeight: '700' },
  bookNowBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  bookNowText: { color: '#FFF', fontWeight: '800', fontSize: 14 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 16, maxHeight: '90%' },
  modalHandle: { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '900', color: '#0F172A' },
  modalShopName: { fontSize: 14, color: '#64748B', fontWeight: '600', marginTop: 2 },
  steps: { flexDirection: 'row', marginBottom: 24, paddingBottom: 20, borderBottomWidth: 1, borderColor: '#F1F5F9' },
  stepDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#E2E8F0' },
  stepNum: { fontSize: 13, fontWeight: '800', color: '#94A3B8' },
  stepLabel: { fontSize: 11, color: '#94A3B8', marginTop: 4, fontWeight: '600' },
  stepTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A', marginBottom: 16 },
  optionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 2, borderColor: '#F1F5F9' },
  optionName: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  optionSub: { fontSize: 13, color: '#64748B', marginTop: 2 },
  optionPrice: { fontSize: 18, fontWeight: '900' },
  providerAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  nextBtn: { paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 16 },
  nextBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  navRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  backStep: { paddingVertical: 16, paddingHorizontal: 16, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center' },
  summaryCard: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, marginTop: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  summaryTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 14, color: '#64748B', fontWeight: '500' },
  summaryVal: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  emptyStep: { alignItems: 'center', paddingVertical: 32 },
  emptyStepIcon: { fontSize: 40, marginBottom: 12 },
  emptyStepText: { fontSize: 15, color: '#64748B', textAlign: 'center', fontWeight: '500' },
});
