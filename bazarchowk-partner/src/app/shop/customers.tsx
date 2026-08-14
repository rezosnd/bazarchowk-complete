import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import api from '@/services/api';

const PRIMARY = '#00B140';

export default function CustomersScreen() {
  const insets = useSafeAreaInsets();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const shopId = await SecureStore.getItemAsync('bazar_shop_id');
        if (!shopId) return;
        const res = await api.get(`/orders/shop/${shopId}?status=DELIVERED`);
        const cMap = new Map();
        if (Array.isArray(res.data)) {
          res.data.forEach((o: any) => {
            if (o.customer && !cMap.has(o.customerId)) {
              cMap.set(o.customerId, { ...o.customer, ordersCount: 1, lastOrderAt: o.createdAt });
            } else if (o.customer) {
              const existing = cMap.get(o.customerId);
              existing.ordersCount += 1;
              cMap.set(o.customerId, existing);
            }
          });
        }
        setCustomers(Array.from(cMap.values()));
      } catch (e) {
        console.warn('Failed to fetch customers', e);
      } finally {
        setLoading(false);
      }
    };
    fetchCustomers();
  }, []);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Customers</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {loading ? (
          <ActivityIndicator size="large" color={PRIMARY} style={{ marginTop: 40 }} />
        ) : customers.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Customers Yet</Text>
            <Text style={styles.emptySub}>When customers order from your shop, they will appear here.</Text>
          </View>
        ) : (
          customers.map(c => (
            <View key={c.id} style={styles.card}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={24} color="#FFF" />
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{c.firstName} {c.lastName}</Text>
                <Text style={styles.phone}>{c.phone || 'No phone number'}</Text>
                <Text style={styles.meta}>{c.ordersCount} Total Orders</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9'
  },
  backBtn: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  scroll: { padding: 16, paddingBottom: 100 },
  
  empty: { alignItems: 'center', marginTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginTop: 16 },
  emptySub: { fontSize: 14, color: '#64748B', textAlign: 'center', marginTop: 8, paddingHorizontal: 32 },

  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
    padding: 16, borderRadius: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: PRIMARY,
    alignItems: 'center', justifyContent: 'center', marginRight: 16
  },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 2 },
  phone: { fontSize: 14, color: '#64748B', fontWeight: '500', marginBottom: 4 },
  meta: { fontSize: 12, color: '#00B140', fontWeight: '700' }
});
