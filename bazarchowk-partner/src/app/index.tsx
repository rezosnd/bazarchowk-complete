import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export default function PartnerDashboard() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [shopName, setShopName] = useState('Your Shop');

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const token = await SecureStore.getItemAsync('partner_token');
      if (!token) {
        router.replace('/(auth)/login');
        return;
      }
      const res = await fetch(`${API_BASE}/shops/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setShopName(data.name || 'Your Shop');
        await SecureStore.setItemAsync('bazar_shop_id', data.id);
      } else {
        // If they don't have a shop, force onboarding
        router.replace('/shop/onboarding');
        return;
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    { title: 'Products', icon: 'cube-outline', route: '/shop/products', color: '#3B82F6', bgColor: '#DBEAFE' },
    { title: 'Inventory', icon: 'list-circle-outline', route: '/shop/inventory', color: '#8B5CF6', bgColor: '#EDE9FE' },
    { title: 'Live Orders', icon: 'receipt-outline', route: '/shop/orders', color: '#F59E0B', bgColor: '#FEF3C7' },
    { title: 'Shop Profile', icon: 'storefront-outline', route: '/shop/profile', color: '#10B981', bgColor: '#D1FAE5' },
    { title: 'Timings', icon: 'time-outline', route: '/shop/timings', color: '#EC4899', bgColor: '#FCE7F3' },
    { title: 'Documents', icon: 'document-text-outline', route: '/shop/documents', color: '#6366F1', bgColor: '#E0E7FF' },
  ];

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: '#F8FAFC' }]}>
        <ActivityIndicator size="large" color="#00B140" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={20} color="#00B140" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.shopName} numberOfLines={1}>{shopName}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={async () => {
          await SecureStore.deleteItemAsync('partner_token');
          await SecureStore.deleteItemAsync('bazar_shop_id');
          router.replace('/(auth)/login');
        }}>
          <Ionicons name="log-out-outline" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Today's Overview</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Orders</Text>
              <Text style={styles.summaryVal}>0</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Revenue</Text>
              <Text style={[styles.summaryVal, { color: '#00B140' }]}>₹0</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Manage Store</Text>
        <View style={styles.grid}>
          {menuItems.map((item, idx) => (
            <TouchableOpacity 
              key={idx} 
              style={styles.gridItem} 
              activeOpacity={0.8}
              onPress={() => router.push(item.route as any)}
            >
              <View style={[styles.iconWrap, { backgroundColor: item.bgColor }]}>
                <Ionicons name={item.icon as any} size={28} color={item.color} />
              </View>
              <Text style={styles.gridItemText}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', padding: 20,
    backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E2E8F0',
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#DCFCE7',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  greeting: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  shopName: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  logoutBtn: { padding: 8, backgroundColor: '#FEF2F2', borderRadius: 12 },
  scroll: { padding: 20, paddingBottom: 100 },
  summaryCard: {
    backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 24,
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 8,
  },
  summaryTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 16 },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryBox: { flex: 1 },
  summaryLabel: { fontSize: 13, color: '#64748B', fontWeight: '500', marginBottom: 4 },
  summaryVal: { fontSize: 28, fontWeight: '800', color: '#0F172A' },
  divider: { width: 1, height: 40, backgroundColor: '#E2E8F0', marginHorizontal: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  gridItem: {
    width: '47%', backgroundColor: '#FFF', borderRadius: 20, padding: 20,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2,
  },
  iconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  gridItemText: { fontSize: 14, fontWeight: '700', color: '#334155' },
});
