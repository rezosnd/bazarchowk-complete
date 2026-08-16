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
        <View style={styles.emptyIconBg}>
          <Ionicons name="receipt-outline" size={56} color="#8B9690" />
        </View>
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
              <Ionicons name="receipt-outline" size={48} color={PRIMARY} />
            </View>
            <Text style={styles.emptyText}>No orders yet</Text>
            <Text style={styles.emptySub}>Your next local order will appear here.</Text>
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={styles.storeIconWrap}>
                    <Ionicons name="storefront-outline" size={20} color="#56625B" />
                  </View>
                  <View>
                    <Text style={styles.shopName}>{order.shop?.name || 'Store'}</Text>
                    <Text style={styles.orderDate}>{new Date(order.createdAt).toLocaleDateString()} • {order.items?.length || 1} item{order.items?.length > 1 ? 's' : ''}</Text>
                  </View>
                </View>
                <View style={[
                  styles.statusBadge, 
                  order.status === 'DELIVERED' ? styles.statusSuccess :
                  order.status === 'CANCELLED' ? styles.statusCancelled : styles.statusPending
                ]}>
                  <Text style={[
                    styles.statusText,
                    order.status === 'DELIVERED' ? styles.statusTextSuccess :
                    order.status === 'CANCELLED' ? styles.statusTextCancelled : styles.statusTextPending
                  ]}>{order.status}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.itemsRow}>
                <Text style={styles.itemsText} numberOfLines={2}>
                  {order.items?.map((item: any) => `${item.quantity} x ${item.productVariant?.product?.name || 'Item'} (${item.productVariant?.name})`).join(', ')}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.orderFooter}>
                <Text style={styles.totalText}>₹{order.totalAmount.toFixed(2)}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={styles.viewDetailsText}>View Details</Text>
                  <Ionicons name="chevron-forward" size={16} color="#00B140" />
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7FAF8' },
  centerEmpty: { alignItems: 'center', marginTop: 100 },
  container: { flex: 1, backgroundColor: '#F7FAF8' },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#122018', paddingHorizontal: 20, paddingVertical: 12 },
  emptyIconBg: { width: 80, height: 80, borderRadius: 24, backgroundColor: '#EAF8F0', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  emptyText: { fontSize: 20, fontWeight: '700', color: '#122018', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#66736B' },
  
  scroll: { padding: 16, paddingBottom: 130 },
  
  orderCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E5EBE7', shadowColor: '#00B140', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  storeIconWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#F7FAF8', alignItems: 'center', justifyContent: 'center' },
  shopName: { fontSize: 16, fontWeight: '700', color: '#122018' },
  orderDate: { fontSize: 13, color: '#66736B', marginTop: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  statusSuccess: { backgroundColor: '#EAF8F0' },
  statusPending: { backgroundColor: '#FFF1DF' },
  statusCancelled: { backgroundColor: '#FEE2E2' },
  statusText: { fontSize: 10, fontWeight: '800' },
  statusTextSuccess: { color: '#008F3C' },
  statusTextPending: { color: '#FF8A00' },
  statusTextCancelled: { color: '#DC2626' },
  
  divider: { height: 1, backgroundColor: '#E5EBE7', marginVertical: 14 },
  
  itemsRow: {},
  itemsText: { fontSize: 14, color: '#66736B', lineHeight: 22 },
  
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalText: { fontSize: 18, fontWeight: '700', color: '#122018' },
  viewDetailsText: { fontSize: 13, fontWeight: '600', color: '#00B140' }
});
