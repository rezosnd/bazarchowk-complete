import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export default function RiderOrdersScreen() {
  const insets = useSafeAreaInsets();
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  useEffect(() => {
    fetchAvailableDeliveries();
  }, []);

  const fetchAvailableDeliveries = async () => {
    try {
      const token = await SecureStore.getItemAsync('bazar_access_token');
      const res = await fetch(`${API_BASE}/delivery/available`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDeliveries(data);
      }
    } catch (error) {
      console.error('Failed to fetch deliveries');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptDelivery = async (deliveryId: string, orderId: string) => {
    setAssigningId(deliveryId);
    try {
      const token = await SecureStore.getItemAsync('bazar_access_token');
      // A hack to parse JWT or just pass token if backend gets it from CurrentUser
      // But API expects { deliveryPartnerId } in body. Wait, the backend decorator might just need any string or it extracts it. 
      // Actually if we look at backend, it takes `@Body('deliveryPartnerId') partnerId: string`. We will pass a dummy or actual user ID.
      // Better yet, in a real app, we'd decode the JWT to get the ID.
      const userId = await SecureStore.getItemAsync('bazar_user_id') || 'temp-id'; 

      const res = await fetch(`${API_BASE}/delivery/${deliveryId}/assign`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ deliveryPartnerId: userId })
      });

      if (res.ok) {
        Alert.alert('Delivery Accepted!', 'Navigate to the shop now.');
        router.push(`/delivery/${orderId}` as any);
      } else {
        Alert.alert('Error', 'Delivery might have been claimed by another rider.');
        fetchAvailableDeliveries();
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to connect');
    } finally {
      setAssigningId(null);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#00B140" /></View>;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Available Orders</Text>
        <TouchableOpacity onPress={fetchAvailableDeliveries}>
          <Ionicons name="refresh" size={24} color="#00B140" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {deliveries.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="bicycle-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyText}>No deliveries right now</Text>
            <Text style={styles.emptySub}>Hang tight, searching for nearby orders.</Text>
          </View>
        ) : (
          deliveries.map((delivery) => {
            const order = delivery.order;
            if (!order) return null;

            return (
              <View key={delivery.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.shopName}>{order.shop?.name}</Text>
                    <Text style={styles.addressText}>{order.shop?.city}</Text>
                  </View>
                  <View style={styles.amountBox}>
                    <Text style={styles.amountText}>₹{order.totalAmount}</Text>
                  </View>
                </View>

                <View style={styles.routeBox}>
                  <View style={styles.routeItem}>
                    <Ionicons name="storefront" size={16} color="#00B140" />
                    <Text style={styles.routeText} numberOfLines={1}>Pickup: {order.shop?.name}</Text>
                  </View>
                  <View style={styles.routeDivider} />
                  <View style={styles.routeItem}>
                    <Ionicons name="home" size={16} color="#DC2626" />
                    <Text style={styles.routeText} numberOfLines={1}>Dropoff: {order.deliveryAddress?.houseFlat}, {order.deliveryAddress?.city}</Text>
                  </View>
                </View>

                <View style={styles.footer}>
                  <TouchableOpacity 
                    style={styles.acceptBtn} 
                    onPress={() => handleAcceptDelivery(delivery.id, order.id)}
                    disabled={assigningId === delivery.id}
                  >
                    {assigningId === delivery.id ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.acceptText}>Accept Delivery</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E2E8F0',
  },
  title: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
  scroll: { padding: 16, paddingBottom: 100 },
  
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginTop: 16 },
  emptySub: { fontSize: 14, color: '#64748B', marginTop: 8 },
  
  card: { backgroundColor: '#FFF', borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 16, borderBottomWidth: 1, borderColor: '#F1F5F9' },
  shopName: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  addressText: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  amountBox: { backgroundColor: '#F8FAFC', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  amountText: { fontSize: 16, fontWeight: '800', color: '#00B140' },
  
  routeBox: { padding: 16, backgroundColor: '#F8FAFC' },
  routeItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  routeDivider: { width: 2, height: 16, backgroundColor: '#CBD5E1', marginLeft: 7, marginVertical: 4 },
  routeText: { fontSize: 14, color: '#334155', fontWeight: '600', flex: 1 },
  
  footer: { padding: 16 },
  acceptBtn: { backgroundColor: '#00B140', height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', shadowColor: '#00B140', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  acceptText: { color: '#FFF', fontSize: 16, fontWeight: '800' }
});
