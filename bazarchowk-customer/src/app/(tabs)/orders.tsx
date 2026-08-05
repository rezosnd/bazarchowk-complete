import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '@/services/api';
import { useAuthStore } from '@/store/auth.store';
import { router } from 'expo-router';

const PRIMARY = '#00B140';

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const fetchOrders = async () => {
    try {
      const { data } = await api.get('/orders/my-orders');
      setOrders(data);
    } catch (error) {
      console.warn('Failed to fetch orders', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.center}>
        <Ionicons name="receipt-outline" size={80} color="#CBD5E1" />
        <Text style={styles.emptyText}>You need to login first</Text>
      </View>
    );
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={PRIMARY} /></View>;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.headerTitle}>My Orders</Text>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {orders.length === 0 ? (
          <View style={styles.centerEmpty}>
            <View style={styles.emptyIconBg}>
              <Ionicons name="receipt-outline" size={64} color={PRIMARY} />
            </View>
            <Text style={styles.emptyText}>No orders yet</Text>
            <Text style={styles.emptySub}>You haven't placed any orders yet.</Text>
          </View>
        ) : (
          orders.map((order) => (
            <TouchableOpacity 
              key={order.id} 
              style={styles.orderCard} 
              activeOpacity={0.7}
              onPress={() => router.push(`/order/${order.id}` as any)}
            >
              <View style={styles.orderHeader}>
                <View>
                  <Text style={styles.shopName}>{order.shop?.name || 'Store'}</Text>
                  <Text style={styles.orderDate}>{new Date(order.createdAt).toLocaleDateString()}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <View style={[
                    styles.statusBadge, 
                    order.status === 'DELIVERED' ? styles.statusSuccess : styles.statusPending
                  ]}>
                    <Text style={[
                      styles.statusText,
                      order.status === 'DELIVERED' ? styles.statusTextSuccess : styles.statusTextPending
                    ]}>{order.status}</Text>
                  </View>
                  
                  {order.paymentMethod === 'RAZORPAY' && order.paymentStatus === 'FAILED' && (
                    <View style={[styles.statusBadge, { backgroundColor: '#FEE2E2' }]}>
                      <Text style={[styles.statusText, { color: '#DC2626' }]}>Payment Failed</Text>
                    </View>
                  )}
                  {order.paymentMethod === 'RAZORPAY' && order.paymentStatus === 'PENDING' && (
                    <View style={[styles.statusBadge, { backgroundColor: '#F3F4F6' }]}>
                      <Text style={[styles.statusText, { color: '#6B7280' }]}>Payment Pending</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.itemsRow}>
                <Text style={styles.itemsText}>
                  {order.items?.map((item: any) => `${item.quantity} x ${item.productVariant?.product?.name || 'Item'} (${item.productVariant?.name})`).join(', ')}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.orderFooter}>
                <Text style={styles.totalText}>₹{order.totalAmount.toFixed(2)}</Text>
                <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  centerEmpty: { alignItems: 'center', marginTop: 100 },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#0F172A', paddingHorizontal: 20, paddingVertical: 12 },
  emptyIconBg: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  emptyText: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#64748B' },
  
  scroll: { padding: 16, paddingBottom: 100 },
  
  orderCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  shopName: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  orderDate: { fontSize: 12, color: '#64748B', marginTop: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusSuccess: { backgroundColor: '#DCFCE7' },
  statusPending: { backgroundColor: '#FEF9C3' },
  statusText: { fontSize: 10, fontWeight: '800' },
  statusTextSuccess: { color: '#059669' },
  statusTextPending: { color: '#A16207' },
  
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },
  
  itemsRow: {},
  itemsText: { fontSize: 14, color: '#475569', lineHeight: 20 },
  
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalText: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
});
