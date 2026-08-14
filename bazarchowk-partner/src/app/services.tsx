import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet,
  Modal, TextInput, ActivityIndicator, FlatList
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '@/services/api';
import { socketService } from '@/services/socket';
import * as SecureStore from 'expo-secure-store';

const PRIMARY = '#00B140';

// ---------- Add Service Modal ----------
function AddServiceModal({ visible, onClose, onSuccess }: { visible: boolean; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !price.trim() || !duration.trim()) {
      Alert.alert('Error', 'Please fill all fields.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/appointments/services', {
        name: name.trim(),
        price: parseFloat(price),
        durationMin: parseInt(duration),
      });
      setName(''); setPrice(''); setDuration('');
      onSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to add service');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Add New Service</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close-circle" size={26} color="#94A3B8" /></TouchableOpacity>
          </View>
          <TextInput style={styles.input} placeholder="Service Name (e.g. Haircut)" value={name} onChangeText={setName} />
          <TextInput style={styles.input} placeholder="Price (₹)" value={price} onChangeText={setPrice} keyboardType="numeric" />
          <TextInput style={styles.input} placeholder="Duration in minutes (e.g. 30)" value={duration} onChangeText={setDuration} keyboardType="numeric" />
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Add Service</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ---------- Add Staff Modal ----------
function AddStaffModal({ visible, onClose, onSuccess }: { visible: boolean; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter staff name.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/appointments/providers', {
        name: name.trim(),
        specialty: specialty.trim() || 'General',
      });
      setName(''); setSpecialty('');
      onSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to add staff');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Add Staff Member</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close-circle" size={26} color="#94A3B8" /></TouchableOpacity>
          </View>
          <TextInput style={styles.input} placeholder="Staff Name (e.g. Rahul)" value={name} onChangeText={setName} />
          <TextInput style={styles.input} placeholder="Specialty (e.g. Barber, Plumber)" value={specialty} onChangeText={setSpecialty} />
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Add Staff</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ---------- Main Screen ----------
export default function PartnerServicesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'BOOKINGS' | 'SERVICES' | 'STAFF'>('BOOKINGS');
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);

  const getShopId = async () => {
    const shopId = await SecureStore.getItemAsync('bazar_shop_id');
    if (shopId) return shopId;
    const res = await api.get('/shops/me');
    return res.data.id;
  };

  const { data: services, refetch: refetchServices } = useQuery({
    queryKey: ['partner-services'],
    queryFn: async () => {
      const id = await getShopId();
      return (await api.get(`/appointments/services/${id}`)).data;
    },
  });

  const { data: providers, refetch: refetchProviders } = useQuery({
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
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      api.patch(`/appointments/shop/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['partner-bookings'] }),
    onError: (err: any) => Alert.alert('Error', err.response?.data?.message || 'Failed to update status'),
  });

  useEffect(() => {
    socketService.on('new_appointment', () => queryClient.invalidateQueries({ queryKey: ['partner-bookings'] }));
    socketService.on('appointment_cancelled', () => queryClient.invalidateQueries({ queryKey: ['partner-bookings'] }));
    return () => {
      socketService.off('new_appointment');
      socketService.off('appointment_cancelled');
    };
  }, []);

  const getStatusColor = (status: string) => {
    if (status === 'PENDING') return { bg: '#FEF3C7', text: '#B45309' };
    if (status === 'CONFIRMED') return { bg: '#DCFCE7', text: '#15803D' };
    if (status === 'CANCELLED') return { bg: '#FEE2E2', text: '#B91C1C' };
    return { bg: '#F3F4F6', text: '#374151' };
  };

  const TABS = ['BOOKINGS', 'SERVICES', 'STAFF'];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Appointments Engine</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab as any)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        {/* ---- BOOKINGS ---- */}
        {activeTab === 'BOOKINGS' && (
          <>
            <Text style={styles.sectionTitle}>Live Appointments</Text>
            {!bookings || bookings.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={{ fontSize: 40 }}>📅</Text>
                <Text style={styles.emptyTitle}>No appointments yet</Text>
                <Text style={styles.emptySub}>When customers book, they'll appear here.</Text>
              </View>
            ) : bookings.map((b: any) => {
              const sc = getStatusColor(b.status);
              return (
                <View key={b.id} style={styles.bookingCard}>
                  <View style={styles.bookingTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.bookingService}>{b.serviceOffering?.name}</Text>
                      <Text style={styles.bookingCustomer}>👤 {b.customer?.firstName} {b.customer?.lastName}</Text>
                      {b.customer?.phone && <Text style={styles.bookingMeta}>📞 {b.customer.phone}</Text>}
                      <Text style={styles.bookingMeta}>👷 {b.provider?.name}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                        <Text style={[styles.statusText, { color: sc.text }]}>{b.status}</Text>
                      </View>
                      <Text style={styles.bookingPrice}>₹{b.totalAmount || b.serviceOffering?.price}</Text>
                      <Text style={[styles.payBadge, { color: b.paymentStatus === 'PAID' ? '#16A34A' : '#D97706' }]}>
                        {b.paymentStatus === 'PAID' ? 'PAID' : 'COD'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.timeRow}>
                    <Feather name="calendar" size={14} color="#64748B" />
                    <Text style={styles.timeText}>{new Date(b.timeSlot?.startTime).toLocaleDateString()}</Text>
                    <Feather name="clock" size={14} color="#64748B" style={{ marginLeft: 12 }} />
                    <Text style={styles.timeText}>{new Date(b.timeSlot?.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                  </View>

                  {b.status === 'PENDING' && (
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={styles.confirmBtn}
                        onPress={() => statusMutation.mutate({ id: b.id, status: 'CONFIRMED' })}
                        disabled={statusMutation.isPending}
                      >
                        <Ionicons name="checkmark-circle" size={16} color="#FFF" />
                        <Text style={styles.confirmText}>Accept</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.rejectBtn}
                        onPress={() => statusMutation.mutate({ id: b.id, status: 'CANCELLED' })}
                        disabled={statusMutation.isPending}
                      >
                        <Ionicons name="close-circle" size={16} color="#DC2626" />
                        <Text style={styles.rejectText}>Decline</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </>
        )}

        {/* ---- SERVICES ---- */}
        {activeTab === 'SERVICES' && (
          <>
            <Text style={styles.sectionTitle}>Your Service Menu</Text>
            {!services || services.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={{ fontSize: 40 }}>✂️</Text>
                <Text style={styles.emptyTitle}>No services added yet</Text>
                <Text style={styles.emptySub}>Add your services so customers can book appointments.</Text>
              </View>
            ) : services.map((s: any) => (
              <View key={s.id} style={styles.serviceCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.serviceName}>{s.name}</Text>
                  <Text style={styles.serviceDuration}>⏱ {s.durationMin} minutes</Text>
                </View>
                <Text style={styles.servicePrice}>₹{s.price}</Text>
              </View>
            ))}
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowServiceModal(true)}>
              <Ionicons name="add-circle" size={20} color={PRIMARY} />
              <Text style={styles.addBtnText}>Add New Service</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ---- STAFF ---- */}
        {activeTab === 'STAFF' && (
          <>
            <Text style={styles.sectionTitle}>Professionals & Staff</Text>
            {!providers || providers.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={{ fontSize: 40 }}>👤</Text>
                <Text style={styles.emptyTitle}>No staff added yet</Text>
                <Text style={styles.emptySub}>Add staff members so customers can choose who serves them.</Text>
              </View>
            ) : providers.map((p: any) => (
              <View key={p.id} style={styles.staffCard}>
                <View style={styles.staffAvatar}>
                  <Ionicons name="person" size={22} color={PRIMARY} />
                </View>
                <View>
                  <Text style={styles.staffName}>{p.name}</Text>
                  <Text style={styles.staffSpecialty}>{p.specialty || 'Professional'}</Text>
                </View>
              </View>
            ))}
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowStaffModal(true)}>
              <Ionicons name="add-circle" size={20} color={PRIMARY} />
              <Text style={styles.addBtnText}>Add Staff Member</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <AddServiceModal
        visible={showServiceModal}
        onClose={() => setShowServiceModal(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['partner-services'] });
          Alert.alert('✅ Service Added', 'Customers can now book this service!');
        }}
      />
      <AddStaffModal
        visible={showStaffModal}
        onClose={() => setShowStaffModal(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['partner-providers'] });
          Alert.alert('✅ Staff Added', 'Staff member is now visible to customers!');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E2E8F0' },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800', color: '#0F172A' },
  tabBar: { flexDirection: 'row', backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E2E8F0' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 3, borderColor: 'transparent' },
  tabActive: { borderColor: PRIMARY },
  tabText: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
  tabTextActive: { color: PRIMARY, fontWeight: '800' },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A', marginBottom: 16 },
  emptyBox: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginTop: 12 },
  emptySub: { fontSize: 14, color: '#64748B', textAlign: 'center', marginTop: 4, paddingHorizontal: 24, lineHeight: 20 },

  bookingCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  bookingTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  bookingService: { fontSize: 17, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  bookingCustomer: { fontSize: 14, fontWeight: '700', color: '#334155', marginBottom: 2 },
  bookingMeta: { fontSize: 13, color: '#64748B', marginBottom: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginBottom: 6 },
  statusText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  bookingPrice: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  payBadge: { fontSize: 11, fontWeight: '800' },
  timeRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 10, marginBottom: 12 },
  timeText: { fontSize: 13, color: '#334155', fontWeight: '600', marginLeft: 6 },
  actionRow: { flexDirection: 'row', gap: 10 },
  confirmBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: PRIMARY, paddingVertical: 12, borderRadius: 14, gap: 6 },
  confirmText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEE2E2', paddingVertical: 12, borderRadius: 14, gap: 6 },
  rejectText: { color: '#DC2626', fontWeight: '800', fontSize: 14 },

  serviceCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#F1F5F9' },
  serviceName: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  serviceDuration: { fontSize: 13, color: '#64748B', marginTop: 2 },
  servicePrice: { fontSize: 18, fontWeight: '900', color: PRIMARY },

  staffCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#F1F5F9', gap: 14 },
  staffAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' },
  staffName: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  staffSpecialty: { fontSize: 13, color: '#64748B', marginTop: 2 },

  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0FDF4', borderRadius: 16, paddingVertical: 16, marginTop: 8, borderWidth: 2, borderColor: '#BBF7D0', gap: 8, borderStyle: 'dashed' },
  addBtnText: { fontSize: 15, fontWeight: '800', color: PRIMARY },

  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  sheetTitle: { fontSize: 20, fontWeight: '900', color: '#0F172A' },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: '#0F172A', marginBottom: 14 },
  saveBtn: { backgroundColor: PRIMARY, borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
});
