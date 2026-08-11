import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Feather, Ionicons } from '@expo/vector-icons';
import api from '@/services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

export default function AppointmentsTab() {
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

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
      case 'CONFIRMED': return { bg: '#DCFCE7', text: '#15803D', icon: 'check-circle' };
      case 'PENDING': return { bg: '#FEF3C7', text: '#B45309', icon: 'clock' };
      case 'CANCELLED': return { bg: '#FEE2E2', text: '#B91C1C', icon: 'x-circle' };
      case 'COMPLETED': return { bg: '#DBEAFE', text: '#1D4ED8', icon: 'award' };
      default: return { bg: '#F3F4F6', text: '#374151', icon: 'info' };
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00B140" />
        <Text style={styles.loadingText}>Fetching your schedule...</Text>
      </View>
    );
  }

  const upcoming = appointments?.filter((a: any) => a.status === 'CONFIRMED' || a.status === 'PENDING') || [];
  const past = appointments?.filter((a: any) => a.status !== 'CONFIRMED' && a.status !== 'PENDING') || [];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Appointments</Text>
          <Text style={styles.headerSubtitle}>Manage your bookings & services</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {upcoming.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming</Text>
            {upcoming.map((app: any) => {
              const badge = getStatusBadge(app.status);
              return (
                <View key={app.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.serviceInfoRow}>
                      <View style={styles.serviceIconWrap}>
                        <Ionicons name="cut-outline" size={24} color="#6366F1" />
                      </View>
                      <View>
                        <Text style={styles.serviceName}>{app.serviceOffering.name}</Text>
                        <Text style={styles.providerName}>{app.provider.name} • {app.provider.specialty || 'Pro'}</Text>
                      </View>
                    </View>
                    
                    <View style={{ alignItems: 'flex-end' }}>
                      <View style={[styles.badge, { backgroundColor: badge.bg, marginBottom: 8 }]}>
                        <Feather name={badge.icon as any} size={12} color={badge.text} />
                        <Text style={[styles.badgeText, { color: badge.text }]}>{app.status}</Text>
                      </View>
                      <Text style={{ fontWeight: '900', fontSize: 16, color: '#0F172A' }}>₹{app.totalAmount || app.serviceOffering.price}</Text>
                      <Text style={{ fontSize: 10, fontWeight: 'bold', color: app.paymentStatus === 'PAID' ? '#16A34A' : '#D97706', marginTop: 2 }}>{app.paymentStatus === 'PAID' ? 'PAID ONLINE' : 'PAY AFTER SERVICE'}</Text>
                    </View>
                  </View>

                  {app.serviceAddress && (
                    <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
                      <Feather name="map-pin" size={16} color="#00B140" style={{ marginRight: 8 }} />
                      <Text style={{ fontSize: 12, color: '#475569', flex: 1 }} numberOfLines={1}>
                        {app.serviceAddress.streetAddress}, {app.serviceAddress.city}
                      </Text>
                    </View>
                  )}

                  <View style={styles.dateTimeBox}>
                    <View style={styles.dateCol}>
                      <View style={styles.dtIconWrap}><Feather name="calendar" size={14} color="#00B140" /></View>
                      <View style={{ marginLeft: 12 }}>
                        <Text style={styles.dtLabel}>Date</Text>
                        <Text style={styles.dtValue}>
                          {new Date(app.timeSlot.startTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.dateCol}>
                      <View style={styles.dtIconWrap}><Feather name="clock" size={14} color="#F59E0B" /></View>
                      <View style={{ marginLeft: 12 }}>
                        <Text style={styles.dtLabel}>Time</Text>
                        <Text style={styles.dtValue}>
                          {new Date(app.timeSlot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity 
                    onPress={() => handleCancel(app.id)}
                    disabled={cancelMutation.isPending}
                    style={styles.cancelBtn}
                  >
                    <Feather name="x" size={16} color="#DC2626" />
                    <Text style={styles.cancelBtnText}>Cancel Booking</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {past.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Past & Cancelled</Text>
            {past.map((app: any) => {
              const badge = getStatusBadge(app.status);
              return (
                <View key={app.id} style={styles.pastCard}>
                  <View style={styles.pastInfoRow}>
                    <View style={styles.pastIconWrap}>
                      <Ionicons name="checkmark-done" size={18} color="#9CA3AF" />
                    </View>
                    <View>
                      <Text style={styles.pastServiceName}>{app.serviceOffering.name}</Text>
                      <Text style={styles.pastDateText}>
                        {new Date(app.timeSlot.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {app.provider.name}
                      </Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.pastPrice}>₹{app.serviceOffering.price}</Text>
                    <Text style={[styles.pastStatus, { color: badge.text }]}>{app.status}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {appointments?.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="calendar-clear-outline" size={40} color="#00B140" />
            </View>
            <Text style={styles.emptyTitle}>No Bookings Yet</Text>
            <Text style={styles.emptySubtitle}>Book a salon, doctor, or repair service from nearby trusted professionals.</Text>
            <TouchableOpacity style={styles.exploreBtn} onPress={() => router.push('/')}>
              <Text style={styles.exploreBtnText}>Explore Services</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8F9FB' },
  loadingText: { marginTop: 16, color: '#64748B', fontWeight: '500' },
  
  header: { paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 15, elevation: 5, zIndex: 10 },
  backBtn: { marginRight: 16 },
  headerTitle: { fontSize: 28, fontWeight: '900', color: '#0F172A' },
  headerSubtitle: { color: '#64748B', fontSize: 14, fontWeight: '500', marginTop: 4 },
  
  scrollContent: { padding: 20, paddingBottom: 100 },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  
  card: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 20, elevation: 4, borderWidth: 1, borderColor: '#F1F5F9' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  serviceInfoRow: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 16 },
  serviceIconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  serviceName: { fontSize: 17, fontWeight: 'bold', color: '#0F172A', marginBottom: 2 },
  providerName: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', marginLeft: 4, letterSpacing: 0.5 },
  
  dateTimeBox: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateCol: { flexDirection: 'row', alignItems: 'center' },
  dtIconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  dtLabel: { fontSize: 10, color: '#94A3B8', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  dtValue: { fontSize: 14, color: '#0F172A', fontWeight: 'bold' },
  divider: { height: 32, width: 1, backgroundColor: '#E2E8F0' },
  
  cancelBtn: { backgroundColor: '#FEF2F2', paddingVertical: 14, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { color: '#DC2626', fontWeight: 'bold', marginLeft: 8 },
  
  pastCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pastInfoRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  pastIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  pastServiceName: { fontWeight: 'bold', color: '#1E293B', fontSize: 15 },
  pastDateText: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  pastPrice: { fontWeight: 'bold', color: '#0F172A' },
  pastStatus: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', marginTop: 4 },
  
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 64, marginTop: 40 },
  emptyIconWrap: { width: 96, height: 96, backgroundColor: '#FFF', borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 24, shadowColor: '#00B140', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 30, elevation: 10 },
  emptyTitle: { fontSize: 24, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 },
  emptySubtitle: { color: '#64748B', textAlign: 'center', marginTop: 8, paddingHorizontal: 32, fontWeight: '500', lineHeight: 20 },
  exploreBtn: { marginTop: 32, backgroundColor: '#00B140', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 30, shadowColor: '#00B140', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 14, elevation: 8 },
  exploreBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 }
});
