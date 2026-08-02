import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions, ScrollView, Animated, Platform, Linking } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '@/services/api';
import { Image } from 'expo-image';
import { socketService } from '@/services/socket';
import { WebView } from 'react-native-webview';

const { width, height } = Dimensions.get('window');
const PRIMARY = '#00B140';
const ACCENT = '#FF8A00';
const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || '';

const TIMELINE = [
  { id: 'PLACED', label: 'Order Confirmed', icon: 'checkmark-circle' },
  { id: 'ACCEPTED', label: 'Shop Accepted', icon: 'storefront' },
  { id: 'PREPARING', label: 'Preparing', icon: 'fast-food' },
  { id: 'READY', label: 'Rider Assigned', icon: 'person' },
  { id: 'PICKED_UP', label: 'Picked Up', icon: 'cube' },
  { id: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: 'bicycle' },
  { id: 'DELIVERED', label: 'Delivered', icon: 'home' },
];

export default function OrderTrackingScreen() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [riderLocation, setRiderLocation] = useState<{ lat: number; lng: number, heading: number } | null>(null);
  const riderAnimatedRegion = useRef(new AnimatedRegion({ latitude: 0, longitude: 0, latitudeDelta: 0, longitudeDelta: 0 })).current;
  const [routeCoords, setRouteCoords] = useState<{latitude: number, longitude: number}[]>([]);
  const [eta, setEta] = useState<string>('--');
  const [distance, setDistance] = useState<string>('--');
  const mapRef = useRef<any>(null);

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

  useEffect(() => {
    if (order?.status === 'OUT_FOR_DELIVERY' || order?.status === 'PICKED_UP') {
      socketService.emit('join_tracking', { orderId: id });
      socketService.on('rider_location', (data) => {
        setRiderLocation({ lat: data.latitude, lng: data.longitude, heading: data.heading || 0 });
        
        // Smoothly animate rider marker
        if (Platform.OS === 'android') {
          riderAnimatedRegion.timing({
            latitude: data.latitude,
            longitude: data.longitude,
            duration: 2000,
            useNativeDriver: false
          }).start();
        } else {
          riderAnimatedRegion.setValue({ latitude: data.latitude, longitude: data.longitude, latitudeDelta: 0, longitudeDelta: 0 });
        }

        // Make camera follow rider
        mapRef.current?.animateCamera({
          center: { latitude: data.latitude, longitude: data.longitude },
          heading: data.heading || 0,
          pitch: 45,
          zoom: 17,
        }, { duration: 2000 });
      });

      fetchRoute();
    }
  }, [order?.status, id]);

  const fetchOrder = async () => {
    try {
      const { data } = await api.get(`/orders/${id}`);
      setOrder(data);
    } catch (e) {
      alert('Failed to load order');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const fetchRoute = async () => {
    if (!order?.shop || !order?.deliveryAddress) return;
    try {
      const startLng = order.shop.longitude;
      const startLat = order.shop.latitude;
      const endLng = order.deliveryAddress.longitude;
      const endLat = order.deliveryAddress.latitude;
      
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${startLng},${startLat};${endLng},${endLat}?geometries=geojson&access_token=${MAPBOX_TOKEN}`;
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.routes && data.routes.length > 0) {
        const coords = data.routes[0].geometry.coordinates.map((c: any) => ({ latitude: c[1], longitude: c[0] }));
        setRouteCoords(coords);
        setDistance((data.routes[0].distance / 1000).toFixed(1) + ' km');
        setEta(Math.ceil(data.routes[0].duration / 60) + ' mins');
      }
    } catch (e) {
      console.error('Mapbox Route Error', e);
    }
  };

  if (loading || !order) {
    return <View style={styles.center}><ActivityIndicator size="large" color={PRIMARY} /></View>;
  }

  const isTrackingActive = order.status === 'OUT_FOR_DELIVERY' || order.status === 'PICKED_UP';
  const currentStepIndex = TIMELINE.findIndex(t => t.id === order.status);

  return (
    <View style={styles.container}>
      {/* FULL SCREEN MAP */}
      {isTrackingActive ? (
        Platform.OS === 'web' ? (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={{ color: '#6B7280' }}>Map unavailable on web</Text>
          </View>
        ) : (
          <WebView
            style={StyleSheet.absoluteFill}
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
                    
                    ${routeCoords.length > 0 ? `
                      var route = ${JSON.stringify(routeCoords.map((c: any) => [c.latitude, c.longitude]))};
                      L.polyline(route, {color: '#00B140', weight: 5}).addTo(map);
                      map.fitBounds(L.polyline(route).getBounds(), { padding: [50, 50] });
                    ` : ''}

                    ${riderLocation ? `
                      var riderIcon = L.icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/3209/3209800.png', iconSize: [40, 40] });
                      L.marker([${riderLocation.lat}, ${riderLocation.lng}], {icon: riderIcon}).addTo(map);
                    ` : ''}
                  </script>
                </body>
                </html>
              `
            }}
          />
        )
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#F8FAFC' }]} />
      )}

      {/* Floating Header */}
      <View style={[styles.headerOverlay, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtnFloat}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        {isTrackingActive && (
          <View style={styles.etaBadge}>
            <Text style={styles.etaLabel}>Arriving in</Text>
            <Text style={styles.etaTime}>{eta}</Text>
          </View>
        )}
        <View style={{ width: 48 }} />
      </View>

      {/* BOTTOM SHEET */}
      <View style={[styles.bottomSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        {isTrackingActive && order.rider && (
          <View style={styles.riderCard}>
            <View style={styles.riderAvatarWrap}>
              <Image source={{ uri: 'https://i.pravatar.cc/150?img=11' }} style={styles.riderAvatar} />
              <View style={styles.pulseDot} />
            </View>
            <View style={styles.riderInfo}>
              <Text style={styles.riderName}>{order.rider.user?.firstName || 'Delivery Partner'}</Text>
              <Text style={styles.riderVehicle}>{order.rider.vehicleType} • {distance} away</Text>
            </View>
            <View style={styles.riderActions}>
              <TouchableOpacity style={styles.iconBtn} onPress={() => Linking.openURL(`tel:${order.rider.user?.phone}`)}>
                <Ionicons name="call" size={20} color={PRIMARY} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => router.push({ pathname: `/chat/${order.id}`, params: { name: order.rider.user?.firstName || 'Delivery Partner', type: 'CUSTOMER_RIDER' } } as any)}>
                <Ionicons name="chatbubble" size={20} color={ACCENT} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <ScrollView style={styles.timelineScroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.sheetTitle}>Track Order #{order.orderNumber}</Text>
          <View style={styles.timeline}>
            {TIMELINE.map((step, index) => {
              const isActive = index <= currentStepIndex;
              const isCurrent = index === currentStepIndex;
              return (
                <View key={step.id} style={styles.timelineItem}>
                  <View style={styles.timelineIconLine}>
                    <View style={[styles.timelineDot, isActive && styles.timelineDotActive, isCurrent && styles.timelineDotCurrent]}>
                      <Ionicons name={step.icon as any} size={16} color={isActive ? '#FFF' : '#94A3B8'} />
                    </View>
                    {index < TIMELINE.length - 1 && (
                      <View style={[styles.timelineLine, isActive && styles.timelineLineActive]} />
                    )}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={[styles.timelineText, isActive && styles.timelineTextActive]}>{step.label}</Text>
                    {isCurrent && <Text style={styles.timelineSubText}>Your order is currently in this stage.</Text>}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  container: { flex: 1, backgroundColor: '#FFF' },
  
  headerOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 16, zIndex: 10,
  },
  backBtnFloat: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5,
  },
  etaBadge: {
    backgroundColor: '#FFF', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5,
  },
  etaLabel: { fontSize: 12, color: '#64748B', fontWeight: '600', textTransform: 'uppercase' },
  etaTime: { fontSize: 18, color: PRIMARY, fontWeight: '900' },

  shopMarker: { backgroundColor: '#1E40AF', padding: 8, borderRadius: 20, borderWidth: 3, borderColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 8 },
  homeMarker: { backgroundColor: '#DC2626', padding: 8, borderRadius: 20, borderWidth: 3, borderColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 8 },

  bottomSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFF', borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingTop: 8, paddingHorizontal: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 20,
    maxHeight: height * 0.55,
  },
  riderCard: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderColor: '#F1F5F9',
  },
  riderAvatarWrap: { position: 'relative', marginRight: 16 },
  riderAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#E2E8F0' },
  pulseDot: { position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: 7, backgroundColor: PRIMARY, borderWidth: 2, borderColor: '#FFF' },
  riderInfo: { flex: 1 },
  riderName: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  riderVehicle: { fontSize: 13, color: '#64748B', fontWeight: '500', marginTop: 2 },
  riderActions: { flexDirection: 'row', gap: 12 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' },
  
  timelineScroll: { paddingTop: 20 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 20 },
  
  timeline: { paddingLeft: 10 },
  timelineItem: { flexDirection: 'row', marginBottom: 24 },
  timelineIconLine: { alignItems: 'center', marginRight: 16 },
  timelineDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  timelineDotActive: { backgroundColor: PRIMARY },
  timelineDotCurrent: { backgroundColor: ACCENT, shadowColor: ACCENT, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  timelineLine: { width: 2, height: '100%', backgroundColor: '#F1F5F9', position: 'absolute', top: 32, zIndex: 1 },
  timelineLineActive: { backgroundColor: PRIMARY },
  
  timelineContent: { flex: 1, paddingTop: 4 },
  timelineText: { fontSize: 15, fontWeight: '600', color: '#94A3B8' },
  timelineTextActive: { color: '#0F172A', fontWeight: '800' },
  timelineSubText: { fontSize: 13, color: '#64748B', marginTop: 4, lineHeight: 18 },
});
