import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://bazarchowk-complete.vercel.app';

export default function PartnerDashboard() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [shopName, setShopName] = useState('Your Shop');
  const [hasProducts, setHasProducts] = useState(false);
  const [hasServices, setHasServices] = useState(false);
  const [isVerified, setIsVerified] = useState(true);
  const [todayOrders, setTodayOrders] = useState(0);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [isOpen, setIsOpen] = useState(true);

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
      
      // 1. Check if User Profile is completed
      const userRes = await fetch(`${API_BASE}/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (userRes.status === 401) {
        await SecureStore.deleteItemAsync('partner_token');
        router.replace('/(auth)/login');
        return;
      }

      if (userRes.ok) {
        const user = await userRes.json();
        if (!user.phone) {
          router.replace('/(auth)/register');
          return;
        }
      }

      // 2. Check if Shop is created
      const res = await fetch(`${API_BASE}/shops/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.status === 401) {
        await SecureStore.deleteItemAsync('partner_token');
        router.replace('/(auth)/login');
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setShopName(data.name || 'Your Shop');
        setHasProducts(data.hasProducts);
        setHasServices(data.hasServices);
        setIsVerified(data.isVerified ?? false);
        setIsOpen(data.isOpen ?? true);
        await SecureStore.setItemAsync('bazar_shop_id', data.id);

        // Fetch today's stats
        try {
          const ordersRes = await fetch(`${API_BASE}/orders/shop/${data.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (ordersRes.ok) {
            const allOrders = await ordersRes.json();
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todaysOrders = (Array.isArray(allOrders) ? allOrders : []).filter(
              (o: any) => new Date(o.createdAt) >= todayStart
            );
            setTodayOrders(todaysOrders.length);
            setTodayRevenue(
              todaysOrders.reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0)
            );
          }
        } catch (statsErr) {
          console.warn('Failed to fetch today stats', statsErr);
        }
      } else if (res.status === 404) {
        // Only force onboarding if we explicitly get a 404 Not Found
        router.replace('/shop/onboarding');
        return;
      } else {
        console.warn('Failed to fetch shop details', res.status);
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleShopStatus = async () => {
    const newVal = !isOpen;
    setIsOpen(newVal); // Optimistic update
    try {
      const token = await SecureStore.getItemAsync('partner_token');
      const shopId = await SecureStore.getItemAsync('bazar_shop_id');
      const res = await fetch(`${API_BASE}/shops/${shopId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isOpen: newVal })
      });
      if (!res.ok) throw new Error('Failed to update shop status');
    } catch (e) {
      setIsOpen(!newVal); // Revert on error
    }
  };

  const getMenuItems = () => {
    let items: any[] = [];
    
    if (hasProducts) {
      items.push(
        { title: 'Live Orders', icon: 'receipt-outline', route: '/shop/orders', color: '#ea580c', bgColor: '#ffedd5' },
        { title: 'Products', icon: 'cube-outline', route: '/shop/products', color: '#3B82F6', bgColor: '#DBEAFE' },
        { title: 'Inventory', icon: 'list-circle-outline', route: '/shop/inventory', color: '#8B5CF6', bgColor: '#EDE9FE' }
      );
    }
    
    if (hasServices) {
      items.push(
        { title: 'Appointments', icon: 'calendar-outline', route: '/services', color: '#0EA5E9', bgColor: '#E0F2FE' },
        { title: 'Customers', icon: 'people-outline', route: '/shop/customers', color: '#14b8a6', bgColor: '#ccfbf1' }
      );
    }
    
    // Common settings for all
    items.push(
      { title: 'Promote Ads', icon: 'megaphone-outline', route: '/shop/ads', color: '#00B140', bgColor: '#DCFCE7' },
      { title: 'Revenue', icon: 'cash-outline', route: '/revenue', color: '#10B981', bgColor: '#D1FAE5' },
      { title: 'Profile', icon: 'storefront-outline', route: '/shop/profile', color: '#F59E0B', bgColor: '#FEF3C7' },
      { title: 'Documents', icon: 'document-text-outline', route: '/shop/documents', color: '#6366F1', bgColor: '#E0E7FF' },
      { title: 'Reviews', icon: 'star-outline', route: '/shop/reviews', color: '#EAB308', bgColor: '#FEF08A' }
    );
    
    return items;
  };

  const menuItems = getMenuItems();

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: '#F8FAFC' }]}>
        <ActivityIndicator size="large" color="#00B140" />
      </View>
    );
  }

  if (!isVerified) {
    return (
      <View style={[styles.container, styles.center, { padding: 24, paddingTop: insets.top }]}>
        <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
          <Ionicons name="time" size={48} color="#D97706" />
        </View>
        <Text style={{ fontSize: 24, fontWeight: '900', color: '#0F172A', textAlign: 'center', marginBottom: 12 }}>Pending Verification</Text>
        <Text style={{ fontSize: 16, color: '#64748B', textAlign: 'center', lineHeight: 24, marginBottom: 32 }}>
          Your business profile has been submitted successfully! Please wait while the Market Admin verifies your details and documents. You will be notified once approved.
        </Text>
        <TouchableOpacity style={[styles.logoutBtn, { width: '100%', alignItems: 'center', backgroundColor: '#F1F5F9' }]} onPress={async () => {
          await SecureStore.deleteItemAsync('partner_token');
          await SecureStore.deleteItemAsync('bazar_shop_id');
          router.replace('/(auth)/login');
        }}>
          <Text style={{ color: '#64748B', fontWeight: 'bold' }}>Logout for now</Text>
        </TouchableOpacity>
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
        <TouchableOpacity style={[styles.logoutBtn, { marginRight: 8, backgroundColor: '#F1F5F9' }]} onPress={() => router.push('/notifications')}>
          <Ionicons name="notifications-outline" size={24} color="#64748B" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.logoutBtn} onPress={async () => {
          await SecureStore.deleteItemAsync('partner_token');
          await SecureStore.deleteItemAsync('bazar_shop_id');
          router.replace('/(auth)/login');
        }}>
          <Ionicons name="log-out-outline" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        
        {/* Status Toggle Card */}
        <View style={[styles.statusCard, { backgroundColor: isOpen ? '#DCFCE7' : '#FEF2F2' }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.statusTitle, { color: isOpen ? '#166534' : '#991B1B' }]}>
              {isOpen ? "Shop is Open" : "Shop is Closed"}
            </Text>
            <Text style={[styles.statusSub, { color: isOpen ? '#15803D' : '#B91C1C' }]}>
              {isOpen ? "Accepting orders right now." : "Customers cannot place orders."}
            </Text>
          </View>
          <Switch 
            value={isOpen}
            onValueChange={toggleShopStatus}
            trackColor={{ false: '#FECACA', true: '#86EFAC' }}
            thumbColor={isOpen ? '#22C55E' : '#EF4444'}
          />
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Today's Overview</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>{hasServices && !hasProducts ? 'Bookings' : 'Orders'}</Text>
              <Text style={styles.summaryVal}>{todayOrders}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Revenue</Text>
              <Text style={[styles.summaryVal, { color: '#00B140' }]}>₹{todayRevenue.toLocaleString('en-IN')}</Text>
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
  
  statusCard: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 20, padding: 20, marginBottom: 24,
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 4,
  },
  statusTitle: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  statusSub: { fontSize: 13, fontWeight: '500' },
});
