import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Linking, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

import * as Location from 'expo-location';
import { socketService } from '../../services/socket';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export default function ActiveDeliveryScreen() {
  const { id } = useLocalSearchParams(); // This is the order ID
  const insets = useSafeAreaInsets();
  
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null);

  useEffect(() => {
    fetchOrderDetails();
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [id]);

  useEffect(() => {
    if (order?.status === 'PICKED_UP') {
      startLiveTracking();
    } else {
      stopLiveTracking();
    }
  }, [order?.status]);

  const startLiveTracking = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Location permission is required for live tracking.');
      return;
    }

    const sub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 10,
      },
      (location) => {
        socketService.emit('update_location', {
          orderId: id,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          heading: location.coords.heading,
        });
      }
    );
    setLocationSubscription(sub);
  };

  const stopLiveTracking = () => {
    if (locationSubscription) {
      locationSubscription.remove();
      setLocationSubscription(null);
    }
  };

  const fetchOrderDetails = async () => {
    try {
      const token = await SecureStore.getItemAsync('bazar_access_token');
      const res = await fetch(`${API_BASE}/orders/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
      }
    } catch (e) {
      console.warn('Failed to fetch order details');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (newStatus: string) => {
    setProcessing(true);
    try {
      const token = await SecureStore.getItemAsync('bazar_access_token');
      const res = await fetch(`${API_BASE}/orders/${id}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ status: newStatus, notes: `Rider updated status to ${newStatus}` })
      });
      
      if (res.ok) {
        if (newStatus === 'DELIVERED') {
          Alert.alert('Success', 'Order delivered successfully!');
          router.replace('/(tabs)/orders');
        } else {
          fetchOrderDetails();
        }
      } else {
        Alert.alert('Error', 'Failed to update order status');
      }
    } catch (e) {
      Alert.alert('Network Error', 'Could not reach server');
    } finally {
      setProcessing(false);
    }
  };

  const openMaps = (lat: number, lng: number, label: string) => {
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${lat},${lng}`;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`
    });
    Linking.openURL(url as string);
  };

  if (loading || !order) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00B140" />
      </View>
    );
  }

  const isPickedUp = order.status === 'PICKED_UP' || order.status === 'DELIVERED';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.title}>Active Delivery</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Current Status</Text>
          <Text style={styles.statusValue}>{order.status}</Text>
        </View>

        {/* Pickup Details */}
        <View style={[styles.card, isPickedUp && { opacity: 0.6 }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="storefront" size={20} color="#00B140" />
            <Text style={styles.cardTitle}>Pickup: {order.shop?.name}</Text>
          </View>
          <Text style={styles.addressText}>{order.shop?.address}, {order.shop?.city}</Text>
          
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => Linking.openURL(`tel:${order.shop?.phone || '0000000000'}`)}>
              <Ionicons name="call" size={20} color="#3B82F6" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => openMaps(order.shop?.lat || 0, order.shop?.lng || 0, order.shop?.name)}>
              <Ionicons name="navigate" size={20} color="#10B981" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Dropoff Details */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="home" size={20} color="#DC2626" />
            <Text style={styles.cardTitle}>Dropoff: {order.customer?.name}</Text>
          </View>
          <Text style={styles.addressText}>
            {order.deliveryAddress?.houseFlat}, {order.deliveryAddress?.street}, {order.deliveryAddress?.city}
          </Text>
          <Text style={styles.addressText}>Landmark: {order.deliveryAddress?.landmark}</Text>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => Linking.openURL(`tel:${order.customer?.phone || '0000000000'}`)}>
              <Ionicons name="call" size={20} color="#3B82F6" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => openMaps(order.deliveryAddress?.lat || 0, order.deliveryAddress?.lng || 0, 'Customer')}>
              <Ionicons name="navigate" size={20} color="#10B981" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Order Details */}
        <View style={styles.card}>
           <Text style={styles.cardTitle}>Order Details</Text>
           <View style={styles.divider} />
           {order.items?.map((item: any) => (
             <Text key={item.id} style={styles.itemText}>{item.quantity} x {item.productVariant?.name}</Text>
           ))}
           <View style={styles.divider} />
           <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
             <Text style={styles.totalLabel}>Collect Cash</Text>
             <Text style={styles.totalValue}>₹{order.totalAmount}</Text>
           </View>
        </View>
      </ScrollView>

      {/* Action Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom || 24 }]}>
        {order.status === 'READY' && (
          <TouchableOpacity 
            style={[styles.primaryBtn, { backgroundColor: '#F59E0B' }]} 
            disabled={processing}
            onPress={() => updateOrderStatus('PICKED_UP')}
          >
            {processing ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryText}>Mark as Picked Up</Text>}
          </TouchableOpacity>
        )}
        
        {order.status === 'PICKED_UP' && (
          <TouchableOpacity 
            style={[styles.primaryBtn, { backgroundColor: '#00B140' }]} 
            disabled={processing}
            onPress={() => updateOrderStatus('DELIVERED')}
          >
            {processing ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryText}>Mark as Delivered</Text>}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E2E8F0' },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginLeft: 8 },
  scroll: { padding: 16, gap: 16 },
  
  statusCard: { backgroundColor: '#1E293B', padding: 16, borderRadius: 16, alignItems: 'center' },
  statusLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  statusValue: { color: '#FFF', fontSize: 24, fontWeight: '900' },
  
  card: { backgroundColor: '#FFF', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  addressText: { fontSize: 14, color: '#475569', lineHeight: 22, marginBottom: 12 },
  
  actionRow: { flexDirection: 'row', gap: 12 },
  iconBtn: { flex: 1, height: 44, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },
  itemText: { fontSize: 14, color: '#475569', marginBottom: 4 },
  totalLabel: { fontSize: 16, color: '#64748B', fontWeight: '600' },
  totalValue: { fontSize: 20, color: '#00B140', fontWeight: '800' },

  footer: { backgroundColor: '#FFF', padding: 20, borderTopWidth: 1, borderColor: '#E2E8F0' },
  primaryBtn: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
});
