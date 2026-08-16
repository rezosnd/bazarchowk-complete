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
      case 'CONFIRMED': return { bg: '#EAF8F0', text: '#15803D', icon: 'check-circle' };
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
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#122018" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>My Bookings</Text>
          <Text style={styles.headerSubtitle}>Manage your service appointments</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {upcoming.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Bookings</Text>
            {upcoming.map((app: any) => {
              const badge = getStatusBadge(app.status);
              return (
                <View key={app.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.serviceInfoRow}>
                      <View style={styles.serviceIconWrap}>
                        <Ionicons name="briefcase-outline" size={24} color="#00B140" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.serviceName} numberOfLines={2}>{app.serviceOffering.name}</Text>
                        <Text style={styles.providerName}>{app.provider.name} • {app.provider.specialty || 'Professional'}</Text>
                      </View>
                    </View>
                    
                    <View style={{ alignItems: 'flex-end', minWidth: 80 }}>
                      <View style={[styles.badge, { backgroundColor: badge.bg, marginBottom: 6 }]}>
                        <Feather name={badge.icon as any} size={12} color={badge.text} />
                        <Text style={[styles.badgeText, { color: badge.text }]}>{app.status}</Text>
                      </View>
                      <Text style={{ fontWeight: '900', fontSize: 17, color: '#122018' }}>₹{app.totalAmount || app.serviceOffering.price}</Text>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: app.paymentStatus === 'PAID' ? '#008F3C' : '#D97706', marginTop: 2 }}>{app.paymentStatus === 'PAID' ? 'PAID ONLINE' : 'PAY AFTER SERVICE'}</Text>
                    </View>
                  </View>

                  {app.serviceAddress && (
                    <View style={styles.addressBox}>
                      <View style={styles.addressIcon}>
                        <Feather name="map-pin" size={14} color="#66736B" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>Service Location</Text>
                        <Text style={{ fontSize: 12, color: '#66736B', marginTop: 2 }} numberOfLines={1}>
                          {app.serviceAddress.streetAddress}, {app.serviceAddress.city}
                        </Text>
                      </View>
                    </View>
                  )}

                  <View style={styles.dateTimeBox}>
                    <View style={styles.dateCol}>
                      <View style={styles.dtIconWrap}><Feather name="calendar" size={16} color="#00B140" /></View>
                      <View style={{ marginLeft: 12 }}>
                        <Text style={styles.dtLabel}>Date</Text>
                        <Text style={styles.dtValue}>
                          {new Date(app.timeSlot.startTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.dateCol}>
                      <View style={styles.dtIconWrap}><Feather name="clock" size={16} color="#F59E0B" /></View>
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
                    activeOpacity={0.7}
                  >
                    <Feather name="x-circle" size={16} color="#DC2626" />
                    <Text style={styles.cancelBtnText}>Cancel Booking</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {past.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Past Bookings</Text>
            {past.map((app: any) => {
              const badge = getStatusBadge(app.status);
              return (
                <View key={app.id} style={styles.pastCard}>
                  <View style={styles.pastInfoRow}>
                    <View style={styles.pastIconWrap}>
                      <Ionicons name={app.status === 'COMPLETED' ? 'checkmark-circle' : 'close-circle'} size={24} color={badge.text} />
                    </View>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={styles.pastServiceName} numberOfLines={1}>{app.serviceOffering.name}</Text>
                      <Text style={styles.pastDateText}>
                        {new Date(app.timeSlot.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {app.provider.name}
                      </Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.pastPrice}>₹{app.totalAmount || app.serviceOffering.price}</Text>
                    <View style={[styles.badge, { backgroundColor: badge.bg, marginTop: 4, paddingHorizontal: 6, paddingVertical: 2 }]}>
                      <Text style={[styles.badgeText, { color: badge.text, fontSize: 9 }]}>{app.status}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {appointments?.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="calendar-outline" size={48} color="#00B140" />
            </View>
            <Text style={styles.emptyTitle}>No Bookings Yet</Text>
            <Text style={styles.emptySubtitle}>Book a salon, electrician, or repair service instantly.</Text>
            <TouchableOpacity style={styles.exploreBtn} onPress={() => router.push('/')} activeOpacity={0.8}>
              <Text style={styles.exploreBtnText}>Explore Services</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7FAF8' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7FAF8' },
  loadingText: { marginTop: 16, color: '#66736B', fontWeight: '600' },
  
  header: { paddingHorizontal: 20, paddingBottom: 20, backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 4, zIndex: 10 },
  backBtn: { marginRight: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: '#EAF8F0', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 26, fontWeight: '900', color: '#122018', letterSpacing: -0.5 },
  headerSubtitle: { color: '#66736B', fontSize: 13, fontWeight: '500', marginTop: 2 },
  
  scrollContent: { padding: 20, paddingBottom: 100 },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#122018', marginBottom: 16, letterSpacing: -0.3 },
  
  card: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 24, elevation: 6, borderWidth: 1, borderColor: '#EAF8F0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  serviceInfoRow: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 16 },
  serviceIconWrap: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center', marginRight: 14, borderWidth: 1, borderColor: '#EAF8F0' },
  serviceName: { fontSize: 17, fontWeight: '800', color: '#122018', marginBottom: 4, letterSpacing: -0.2 },
  providerName: { fontSize: 13, color: '#66736B', fontWeight: '600' },
  
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', marginLeft: 4, letterSpacing: 0.5 },
  
  addressBox: { backgroundColor: '#F7FAF8', padding: 12, borderRadius: 16, marginBottom: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#EAF8F0' },
  addressIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', marginRight: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },

  dateTimeBox: { backgroundColor: '#EAF8F0', borderRadius: 16, padding: 16, marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateCol: { flexDirection: 'row', alignItems: 'center' },
  dtIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  dtLabel: { fontSize: 11, color: '#66736B', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  dtValue: { fontSize: 14, color: '#122018', fontWeight: '800' },
  divider: { height: 40, width: 1, backgroundColor: '#CBD5E1', marginHorizontal: 8 },
  
  cancelBtn: { backgroundColor: '#FEF2F2', paddingVertical: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FEE2E2' },
  cancelBtnText: { color: '#DC2626', fontWeight: '800', marginLeft: 8, fontSize: 15 },
  
  pastCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#EAF8F0', marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
  pastInfoRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  pastIconWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#F7FAF8', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  pastServiceName: { fontWeight: '800', color: '#122018', fontSize: 15, letterSpacing: -0.2 },
  pastDateText: { color: '#66736B', fontSize: 12, marginTop: 4, fontWeight: '500' },
  pastPrice: { fontWeight: '900', color: '#122018', fontSize: 15 },
  pastStatus: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', marginTop: 4 },
  
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, marginTop: 20 },
  emptyIconWrap: { width: 100, height: 100, backgroundColor: '#F0FDF4', borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 24, fontWeight: '900', color: '#122018', letterSpacing: -0.5 },
  emptySubtitle: { color: '#66736B', textAlign: 'center', marginTop: 8, paddingHorizontal: 32, fontWeight: '500', lineHeight: 20, fontSize: 15 },
  exploreBtn: { marginTop: 32, backgroundColor: '#00B140', paddingHorizontal: 32, paddingVertical: 18, borderRadius: 30, shadowColor: '#00B140', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 8 },
  exploreBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16, letterSpacing: 0.3 }
});
