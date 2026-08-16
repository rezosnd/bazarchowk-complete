import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import api from '@/services/api';
import { Image } from 'expo-image';
import { socketService } from '@/services/socket';

const PRIMARY = '#00B140';

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();

    // Listen to real-time status updates
    socketService.on('order_status_update', (data) => {
      setOrders(prev => prev.map(order => 
        order.id === data.orderId ? { ...order, status: data.status } : order
      ));
    });

    return () => {
      socketService.off('order_status_update');
    };
  }, []);

  const fetchOrders = async () => {
    try {
      const { data } = await api.get('/orders/customer');
      setOrders(data);
    } catch (e) {
      console.warn('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DELIVERED': return '#008F3C';
      case 'CANCELLED': case 'REFUNDED': return '#DC2626';
      case 'PICKED_UP': return '#2563EB';
      default: return '#D97706';
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={PRIMARY} /></View>;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#122018" />
        </TouchableOpacity>
        <Text style={styles.title}>My Orders</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {orders.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyText}>No orders yet</Text>
            <Text style={styles.emptySub}>You haven't placed any orders.</Text>
          </View>
        ) : (
          orders.map((order: any) => {
            const firstItem = order.items?.[0];
            const image = firstItem?.productVariant?.product?.images?.[0]?.imageUrl;

            return (
              <TouchableOpacity 
                key={order.id} 
                style={styles.card} 
                activeOpacity={0.7}
                onPress={() => router.push(`/order/${order.id}` as any)}
              >
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.shopName}>{order.shop?.name}</Text>
                    <Text style={styles.date}>{new Date(order.createdAt).toLocaleString()}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '15' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>{order.status}</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.itemsRow}>
                  {image ? (
                    <Image source={{ uri: image }} style={styles.itemImg} />
                  ) : (
                    <View style={[styles.itemImg, { alignItems: 'center', justifyContent: 'center' }]}>
                      <Ionicons name="cube" size={20} color="#8B9690" />
                    </View>
                  )}
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemsText} numberOfLines={1}>
                      {firstItem?.productVariant?.product?.name} {order.items?.length > 1 ? `+ ${order.items.length - 1} more items` : ''}
                    </Text>
                    <Text style={styles.orderId}>Order #{order.orderNumber}</Text>
                  </View>
                  <Text style={styles.price}>₹{order.totalAmount}</Text>
                </View>
                
                {order.status === 'PICKED_UP' && (
                  <View style={styles.trackBanner}>
                    <Ionicons name="bicycle" size={20} color="#2563EB" />
                    <Text style={styles.trackText}>Rider is on the way. Tap to track live.</Text>
                    <Ionicons name="chevron-forward" size={16} color="#2563EB" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7FAF8' },
  container: { flex: 1, backgroundColor: '#F7FAF8' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E5EBE7',
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EAF8F0', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: '#122018' },
  scroll: { padding: 16, paddingBottom: 100 },
  
  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#122018', marginTop: 16 },
  emptySub: { fontSize: 14, color: '#66736B', marginTop: 8 },

  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E5EBE7' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  shopName: { fontSize: 16, fontWeight: '700', color: '#122018', marginBottom: 4 },
  date: { fontSize: 12, color: '#66736B' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '800' },
  
  divider: { height: 1, backgroundColor: '#EAF8F0', marginVertical: 12 },
  
  itemsRow: { flexDirection: 'row', alignItems: 'center' },
  itemImg: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#EAF8F0' },
  itemInfo: { flex: 1, marginLeft: 12 },
  itemsText: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 2 },
  orderId: { fontSize: 12, color: '#8B9690' },
  price: { fontSize: 16, fontWeight: '800', color: '#122018' },
  
  trackBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', padding: 12, borderRadius: 12, marginTop: 16, gap: 8 },
  trackText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#1D4ED8' }
});
