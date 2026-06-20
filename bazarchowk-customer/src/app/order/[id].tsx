import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '@/services/api';
import { Image } from 'expo-image';
import { socketService } from '@/services/socket';

const PRIMARY = '#00B140';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [riderLocation, setRiderLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    fetchOrder();

    socketService.on('order_status_update', (data) => {
      if (data.orderId === id) {
        setOrder((prev: any) => ({ ...prev, status: data.status }));
      }
    });

    return () => {
      socketService.off('order_status_update');
      socketService.emit('leave_tracking', { orderId: id });
      socketService.off('rider_location');
    };
  }, [id]);

  // Setup tracking if status is PICKED_UP
  useEffect(() => {
    if (order?.status === 'PICKED_UP') {
      socketService.emit('join_tracking', { orderId: id });
      socketService.on('rider_location', (data) => {
        setRiderLocation({ lat: data.latitude, lng: data.longitude });
      });
    }
  }, [order?.status, id]);

  const fetchOrder = async () => {
    try {
      const { data } = await api.get(`/orders/\${id}`);
      setOrder(data);
    } catch (e) {
      alert('Failed to load order');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  if (loading || !order) {
    return <View style={styles.center}><ActivityIndicator size="large" color={PRIMARY} /></View>;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DELIVERED': return '#059669';
      case 'CANCELLED': case 'REFUNDED': return '#DC2626';
      case 'PICKED_UP': return '#2563EB';
      default: return '#D97706';
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.title}>Order #{order.orderNumber}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Live Tracking Map Placeholder */}
        {order.status === 'PICKED_UP' && (
          <View style={styles.mapContainer}>
            <View style={styles.mapMock}>
              <Ionicons name="map-outline" size={48} color="#94A3B8" />
              <Text style={styles.mapText}>Live GPS Tracking Active</Text>
              {riderLocation ? (
                <View style={styles.locationBubble}>
                  <Text style={styles.locationText}>
                    Lat: {riderLocation.lat.toFixed(4)}, Lng: {riderLocation.lng.toFixed(4)}
                  </Text>
                </View>
              ) : (
                <Text style={styles.waitingText}>Waiting for rider signal...</Text>
              )}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status</Text>
          <View style={[styles.statusBox, { borderColor: getStatusColor(order.status) }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(order.status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>{order.status}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items from {order.shop?.name}</Text>
          {order.items.map((item: any) => {
            const image = item.productVariant?.product?.images?.[0]?.imageUrl;
            return (
              <View key={item.id} style={styles.itemRow}>
                {image ? (
                  <Image source={{ uri: image }} style={styles.itemImg} />
                ) : (
                  <View style={[styles.itemImg, { alignItems: 'center', justifyContent: 'center' }]}>
                    <Ionicons name="cube" size={20} color="#94A3B8" />
                  </View>
                )}
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.productVariant?.product?.name}</Text>
                  <Text style={styles.itemVariant}>{item.productVariant?.name}</Text>
                </View>
                <View style={styles.itemPriceWrap}>
                  <Text style={styles.itemQty}>{item.quantity}x</Text>
                  <Text style={styles.itemPrice}>₹{item.priceAtTime}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Details</Text>
          <View style={styles.infoBox}>
            <Ionicons name="location" size={20} color="#64748B" />
            <View style={styles.infoTextWrap}>
              <Text style={styles.infoTitle}>Deliver to</Text>
              <Text style={styles.infoSub}>{order.deliveryAddress?.addressLine1}, {order.deliveryAddress?.city}</Text>
            </View>
          </View>
        </View>

        <View style={styles.billCard}>
          <Text style={styles.sectionTitle}>Bill Details</Text>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Item Total</Text>
            <Text style={styles.billValue}>₹{order.totalAmount - 40}</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Delivery Fee</Text>
            <Text style={styles.billValue}>₹40</Text>
          </View>
          <View style={[styles.billRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Grand Total</Text>
            <Text style={styles.totalValue}>₹{order.totalAmount}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E2E8F0',
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  scroll: { padding: 16, paddingBottom: 100, gap: 20 },
  
  mapContainer: { height: 200, borderRadius: 16, overflow: 'hidden', backgroundColor: '#E2E8F0', borderWidth: 1, borderColor: '#CBD5E1' },
  mapMock: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9' },
  mapText: { fontSize: 16, fontWeight: '700', color: '#334155', marginTop: 12 },
  waitingText: { fontSize: 14, color: '#64748B', marginTop: 4 },
  locationBubble: { backgroundColor: '#0F172A', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 12 },
  locationText: { color: '#FFF', fontSize: 12, fontWeight: '600' },

  section: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 16 },
  
  statusBox: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, backgroundColor: '#F8FAFC' },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  statusText: { fontSize: 15, fontWeight: '800' },
  
  itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  itemImg: { width: 48, height: 48, borderRadius: 8, backgroundColor: '#F1F5F9' },
  itemInfo: { flex: 1, marginLeft: 12 },
  itemName: { fontSize: 15, fontWeight: '600', color: '#0F172A' },
  itemVariant: { fontSize: 13, color: '#64748B', marginTop: 2 },
  itemPriceWrap: { alignItems: 'flex-end' },
  itemQty: { fontSize: 12, color: '#64748B', marginBottom: 2 },
  itemPrice: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  
  infoBox: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#F8FAFC', borderRadius: 12 },
  infoTextWrap: { marginLeft: 12, flex: 1 },
  infoTitle: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  infoSub: { fontSize: 14, color: '#0F172A', fontWeight: '600', marginTop: 2 },
  
  billCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  billLabel: { fontSize: 14, color: '#64748B', fontWeight: '500' },
  billValue: { fontSize: 14, color: '#0F172A', fontWeight: '600' },
  totalRow: { marginTop: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9', marginBottom: 0 },
  totalLabel: { fontSize: 16, color: '#0F172A', fontWeight: '800' },
  totalValue: { fontSize: 18, color: PRIMARY, fontWeight: '800' },
});
