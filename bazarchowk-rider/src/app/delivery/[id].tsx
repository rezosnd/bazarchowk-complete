import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Linking, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as Location from 'expo-location';
import { socketService } from '../../services/socket';
import { WebView } from 'react-native-webview';
import api from '../../services/api';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://bazarchowk-complete.vercel.app';

export default function ActiveDeliveryScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [riderLocation, setRiderLocation] = useState<{ latitude: number, longitude: number } | null>(null);

  useEffect(() => {
    fetchOrderDetails();
  }, [id]);

  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;

    const startTracking = async () => {
      if (order?.delivery?.status === 'IN_TRANSIT') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Location tracking is required for live updates.');
          return;
        }

        locationSubscription = await Location.watchPositionAsync(
          { 
            accuracy: Location.Accuracy.High, 
            timeInterval: 3000, 
            distanceInterval: 2 
          },
          (loc) => {
            const currentLoc = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
            setRiderLocation(currentLoc);
            socketService.emit('update_location', {
              orderId: order.id,
              ...currentLoc,
              heading: loc.coords.heading
            });
          }
        );
      }
    };

    startTracking();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [order?.delivery?.status, order?.id]);

  const fetchOrderDetails = async () => {
    try {
      const token = await SecureStore.getItemAsync('rider_token');
      const res = await fetch(`${API_BASE}/orders/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
      }
    } catch (error) {
      console.error('Failed to fetch order');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!order?.delivery?.id) return;
    
    setUpdating(true);
    try {
      const token = await SecureStore.getItemAsync('rider_token');
      const res = await fetch(`${API_BASE}/delivery/${order.delivery.id}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        Alert.alert('Status Updated', `Delivery marked as ${newStatus}`);
        if (newStatus === 'DELIVERED') {
          router.replace('/(tabs)/orders' as any);
        } else {
          fetchOrderDetails();
        }
      } else {
        Alert.alert('Error', 'Failed to update status');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to connect');
    } finally {
      setUpdating(false);
    }
  };

  const openMap = (lat: number, lng: number, label: string) => {
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${lat},${lng}`;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`
    });
    if (url) Linking.openURL(url);
  };

    const handleGeneratePayment = async () => {
    try {
      setUpdating(true);
      // Mock sending a payment link to the customer
      await new Promise(resolve => setTimeout(resolve, 1000));
      Alert.alert('Payment Link Sent!', 'A secure Razorpay payment link has been sent to the customer via SMS/WhatsApp. Waiting for them to complete the payment...');
      // In a real flow, you would listen via websocket for payment success
      // and then call fetchOrderDetails() to see the updated payment status.
    } catch (error: any) {
      Alert.alert('Failed', 'Could not send payment link.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#00B140" /></View>;
  }

  if (!order) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.emptyText}>Order not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: '#00B140', fontWeight: 'bold' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const deliveryStatus = order?.delivery?.status || 'ASSIGNED';
  const customerName = order.customer?.firstName ? `${order.customer.firstName} ${order.customer.lastName || ''}` : 'Customer';
  const customerPhone = order.customer?.phone || 'Unknown';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.title}>Delivery #{order.orderNumber}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        
        {/* Status Badge */}
        <View style={styles.statusBadge}>
          <Ionicons name="time" size={20} color="#00B140" />
          <Text style={styles.statusText}>{deliveryStatus.replace('_', ' ')}</Text>
        </View>

        {/* Live Map Tracking */}
        {order?.shop && order?.deliveryAddress && (
          <View style={[styles.card, { padding: 0, overflow: 'hidden', height: 250 }]}>
            {Platform.OS === 'web' ? (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: '#6B7280' }}>Map unavailable on web</Text>
              </View>
            ) : (
              <WebView
                style={{ flex: 1 }}
                scrollEnabled={false}
                source={{
                  html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                      <style>
                        body { padding: 0; margin: 0; }
                        html, body, #map { height: 100%; width: 100%; }
                      </style>
                    </head>
                    <body>
                      <div id="map"></div>
                      <script>
                        var map = L.map('map', { zoomControl: false }).setView([${(order.shop.latitude + order.deliveryAddress.latitude) / 2}, ${(order.shop.longitude + order.deliveryAddress.longitude) / 2}], 13);
                        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
                        
                        var shopIcon = L.divIcon({ html: '<div style="background:#1E40AF;padding:8px;border-radius:20px;border:3px solid #FFF;display:flex;align-items:center;justify-content:center;width:20px;height:20px"><span style="color:#FFF;font-size:14px">🏬</span></div>', className: '' });
                        var homeIcon = L.divIcon({ html: '<div style="background:#DC2626;padding:8px;border-radius:20px;border:3px solid #FFF;display:flex;align-items:center;justify-content:center;width:20px;height:20px"><span style="color:#FFF;font-size:14px">🏠</span></div>', className: '' });
                        
                        L.marker([${order.shop.latitude}, ${order.shop.longitude}], {icon: shopIcon}).addTo(map);
                        L.marker([${order.deliveryAddress.latitude}, ${order.deliveryAddress.longitude}], {icon: homeIcon}).addTo(map);
                        
                        ${riderLocation ? `
                          var riderIcon = L.divIcon({ html: '<div style="background:#00B140;padding:8px;border-radius:20px;border:3px solid #FFF;display:flex;align-items:center;justify-content:center;width:20px;height:20px"><span style="color:#FFF;font-size:14px">🚲</span></div>', className: '' });
                          L.marker([${riderLocation.latitude}, ${riderLocation.longitude}], {icon: riderIcon}).addTo(map);
                          
                          var route = [[${riderLocation.latitude}, ${riderLocation.longitude}], [${order.deliveryAddress.latitude}, ${order.deliveryAddress.longitude}]];
                          L.polyline(route, {color: '#00B140', weight: 5, dashArray: '10, 10'}).addTo(map);
                        ` : ''}
                      </script>
                    </body>
                    </html>
                  `
                }}
              />
            )}
          </View>
        )}

        {/* Pickup Details */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconBoxGreen}>
              <Ionicons name="storefront" size={20} color="#00B140" />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>Pickup From Shop</Text>
              <Text style={styles.cardSub}>{order.shop?.name}</Text>
              <Text style={styles.cardAddress}>{order.shop?.address}</Text>
            </View>
          </View>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtnOutline} onPress={() => Linking.openURL(`tel:${order.shop?.phone || ''}`)}>
              <Ionicons name="call" size={18} color="#00B140" />
              <Text style={styles.actionTextGreen}>Call Shop</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtnOutline} onPress={() => openMap(order.shop?.latitude, order.shop?.longitude, order.shop?.name)}>
              <Ionicons name="navigate" size={18} color="#00B140" />
              <Text style={styles.actionTextGreen}>Navigate</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Dropoff Details */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconBoxRed}>
              <Ionicons name="home" size={20} color="#DC2626" />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>Deliver To Customer</Text>
              <Text style={styles.cardSub}>{customerName}</Text>
              <Text style={styles.cardAddress}>{order.deliveryAddress?.houseFlat}, {order.deliveryAddress?.street}, {order.deliveryAddress?.city}</Text>
            </View>
          </View>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtnOutline} onPress={() => Linking.openURL(`tel:${customerPhone}`)}>
              <Ionicons name="call" size={18} color="#DC2626" />
              <Text style={styles.actionTextRed}>Call Customer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtnOutline} onPress={() => openMap(order.deliveryAddress?.latitude, order.deliveryAddress?.longitude, 'Customer Location')}>
              <Ionicons name="navigate" size={18} color="#DC2626" />
              <Text style={styles.actionTextRed}>Navigate</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Order Amount */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Collect Cash from Customer?</Text>
          <Text style={[styles.amountValue, order.paymentMethod === 'COD' ? {color: '#DC2626'} : {color: '#00B140'}]}>
            {order.paymentMethod === 'COD' ? `YES: ₹${order.totalAmount}` : 'NO (Prepaid Online)'}
          </Text>
          
          {order.paymentMethod === 'COD' && deliveryStatus === 'IN_TRANSIT' && (
            <TouchableOpacity 
              style={styles.qrBtn} 
              onPress={handleGeneratePayment}
              disabled={updating}
            >
              <Ionicons name="qr-code" size={20} color="#FFF" />
              <Text style={styles.qrBtnText}>Customer wants to Pay Online</Text>
            </TouchableOpacity>
          )}
        </View>

      </ScrollView>

      {/* Footer Action */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        {deliveryStatus === 'ASSIGNED' && (
          <TouchableOpacity style={styles.primaryBtn} disabled={updating} onPress={() => handleUpdateStatus('IN_TRANSIT')}>
            {updating ? <ActivityIndicator color="#FFF"/> : <Text style={styles.primaryBtnText}>Start Delivery</Text>}
          </TouchableOpacity>
        )}
        
        {deliveryStatus === 'IN_TRANSIT' && (
          <TouchableOpacity style={styles.primaryBtn} disabled={updating} onPress={() => handleUpdateStatus('DELIVERED')}>
            {updating ? <ActivityIndicator color="#FFF"/> : <Text style={styles.primaryBtnText}>Mark as Delivered</Text>}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E2E8F0',
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  scroll: { padding: 16, paddingBottom: 100, gap: 16 },
  
  statusBadge: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#DCFCE7', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginBottom: 8 },
  statusText: { fontSize: 14, fontWeight: '800', color: '#00B140' },
  
  emptyText: { fontSize: 18, color: '#64748B', fontWeight: '600' },
  
  card: { backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderColor: '#F1F5F9', gap: 12 },
  iconBoxGreen: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' },
  iconBoxRed: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  cardSub: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 2 },
  cardAddress: { fontSize: 14, color: '#475569', lineHeight: 20 },
  
  actionRow: { flexDirection: 'row', padding: 12, gap: 12, backgroundColor: '#F8FAFC' },
  actionBtnOutline: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 40, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFF' },
  actionTextGreen: { fontSize: 14, fontWeight: '700', color: '#00B140' },
  actionTextRed: { fontSize: 14, fontWeight: '700', color: '#DC2626' },
  
  amountCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
  amountLabel: { fontSize: 14, fontWeight: '600', color: '#64748B', marginBottom: 4 },
  amountValue: { fontSize: 20, fontWeight: '900' },
  
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 10 },
  primaryBtn: { backgroundColor: '#00B140', height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#00B140', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  
  qrBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0F172A', marginTop: 16, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, width: '100%', justifyContent: 'center' },
  qrBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 }
});
