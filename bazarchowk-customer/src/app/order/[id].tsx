import { Text as AppText } from '@/components/TranslatedText';
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions, ScrollView, Platform, Linking } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '@/services/api';
import { Image } from 'expo-image';
import { socketService } from '@/services/socket';
import { WebView } from 'react-native-webview';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';

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
        
        if (mapRef.current) {
          const script = `
            if (typeof riderMarker !== 'undefined') {
              riderMarker.setLatLng([${data.latitude}, ${data.longitude}]);
              map.setView([${data.latitude}, ${data.longitude}]);
            } else {
              var riderSvg = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="17.5" r="3.5"></circle><circle cx="18.5" cy="17.5" r="3.5"></circle><path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h2"></path></svg>';
              var riderIcon = L.divIcon({ html: '<div style="background:#00B140;padding:6px;border-radius:20px;border:3px solid #FFF;display:flex;align-items:center;justify-content:center;width:20px;height:20px">' + riderSvg + '</div>', className: '' });
              window.riderMarker = L.marker([${data.latitude}, ${data.longitude}], {icon: riderIcon}).addTo(map);
              map.setView([${data.latitude}, ${data.longitude}]);
            }
            true;
          `;
          mapRef.current.injectJavaScript(script);
        }
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

  const handleChat = async (recipientId: string, name: string) => {
    try {
      const res = await api.post('/communication/conversations', {
        type: 'P2P',
        participantIds: [recipientId],
        orderId: order.id,
        title: `Order #${order.orderNumber}`
      });
      if (res.data && res.data.id) {
        router.push({ pathname: `/chat/${res.data.id}`, params: { name, type: 'CUSTOMER_RIDER' } } as any);
      }
    } catch (e) {
      alert('Failed to start chat');
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
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#F7FAF8', justifyContent: 'center', alignItems: 'center' }]}>
            <AppText style={{ color: '#6B7280' }}>Map unavailable on web</AppText>
          </View>
        ) : (
          <WebView
            ref={mapRef}
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
                    
                    var shopSvg = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>';
                    var homeSvg = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>';
                    var shopIcon = L.divIcon({ html: '<div style="background:#FF8A00;padding:6px;border-radius:20px;border:3px solid #FFF;display:flex;align-items:center;justify-content:center;width:20px;height:20px">' + shopSvg + '</div>', className: '' });
                    var homeIcon = L.divIcon({ html: '<div style="background:#122018;padding:6px;border-radius:20px;border:3px solid #FFF;display:flex;align-items:center;justify-content:center;width:20px;height:20px">' + homeSvg + '</div>', className: '' });
                    
                    L.marker([${order.shop.latitude}, ${order.shop.longitude}], {icon: shopIcon}).addTo(map);
                    L.marker([${order.deliveryAddress.latitude}, ${order.deliveryAddress.longitude}], {icon: homeIcon}).addTo(map);
                    
                    ${routeCoords.length > 0 ? `
                      var route = ${JSON.stringify(routeCoords.map((c: any) => [c.latitude, c.longitude]))};
                      L.polyline(route, {color: '#00B140', weight: 4}).addTo(map);
                      map.fitBounds(L.polyline(route).getBounds(), { padding: [50, 50] });
                    ` : ''}

                    ${riderLocation ? `
                      var riderSvg = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="17.5" r="3.5"></circle><circle cx="18.5" cy="17.5" r="3.5"></circle><path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h2"></path></svg>';
                      var riderIcon = L.divIcon({ html: '<div style="background:#00B140;padding:6px;border-radius:20px;border:3px solid #FFF;display:flex;align-items:center;justify-content:center;width:20px;height:20px">' + riderSvg + '</div>', className: '' });
                      window.riderMarker = L.marker([${riderLocation.lat}, ${riderLocation.lng}], {icon: riderIcon}).addTo(map);
                    ` : ''}
                  </script>
                </body>
                </html>
              `
            }}
          />
        )
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#F7FAF8' }]} />
      )}

      {/* Floating Header */}
      <Animated.View entering={FadeInUp.springify().damping(15)} style={[styles.headerOverlay, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtnFloat}>
          <Ionicons name="arrow-back" size={24} color="#122018" />
        </TouchableOpacity>
        {isTrackingActive && (
          <View style={styles.etaBadge}>
            <AppText style={styles.etaLabel}>Arriving in</AppText>
            <AppText style={styles.etaTime}>{eta}</AppText>
          </View>
        )}
        <View style={{ width: 48 }} />
      </Animated.View>

      {/* BOTTOM SHEET */}
      <Animated.View entering={FadeInDown.springify().damping(15)} style={[styles.bottomSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        {isTrackingActive && order.rider && (
          <View style={styles.riderCard}>
            <View style={styles.riderAvatarWrap}>
              {order.rider?.avatarUrl ? (
                <Image source={{ uri: order.rider.avatarUrl }} style={styles.riderAvatar} />
              ) : (
                <View style={[styles.riderAvatar, { alignItems: 'center', justifyContent: 'center' }]}>
                  <Ionicons name="person" size={28} color="#8B9690" />
                </View>
              )}
              <View style={styles.pulseDot} />
            </View>
            <View style={styles.riderInfo}>
              <AppText style={styles.riderName}>{order.rider?.firstName || 'Delivery Partner'}</AppText>
              <AppText style={styles.riderVehicle}>{order.rider?.deliveryPartner?.vehicleType || 'Bike'} • {distance} away</AppText>
              {order.rider?.phone && (
                <AppText style={{ fontSize: 13, color: '#334155', fontWeight: '600', marginTop: 4 }}>{order.rider.phone}</AppText>
              )}
            </View>
            <View style={styles.riderActions}>
              <TouchableOpacity style={styles.iconBtn} onPress={() => Linking.openURL(`tel:${order.rider?.phone}`)}>
                <Ionicons name="call" size={20} color={PRIMARY} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => handleChat(order.riderId, order.rider?.firstName || 'Delivery Partner')}>
                <Ionicons name="chatbubble" size={20} color={ACCENT} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {order.status === 'DELIVERED' && (
          <TouchableOpacity 
            style={styles.rateBanner}
            onPress={() => router.push(`/shop/${order.shopId}/reviews` as any)}
          >
            <View style={styles.rateIconWrap}>
              <Ionicons name="star" size={24} color="#F59E0B" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <AppText style={styles.rateTitle}>Rate {order.shop?.name}</AppText>
              <AppText style={styles.rateSub}>Share your experience with others</AppText>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8B9690" />
          </TouchableOpacity>
        )}

        <ScrollView style={styles.timelineScroll} showsVerticalScrollIndicator={false}>
          <AppText style={styles.sheetTitle}>Track Order #{order.orderNumber}</AppText>
          <View style={styles.timeline}>
            {TIMELINE.map((step, index) => {
              const isActive = index <= currentStepIndex;
              const isCurrent = index === currentStepIndex;
              return (
                <View key={step.id} style={styles.timelineItem}>
                  <View style={styles.timelineIconLine}>
                    <Animated.View style={[styles.timelineDot, isActive && styles.timelineDotActive, isCurrent && styles.timelineDotCurrent]}>
                      <Ionicons name={step.icon as any} size={16} color={isActive ? '#FFF' : '#8B9690'} />
                    </Animated.View>
                    {index < TIMELINE.length - 1 && (
                      <View style={[styles.timelineLine, isActive && styles.timelineLineActive]} />
                    )}
                  </View>
                  <View style={styles.timelineContent}>
                    <AppText style={[styles.timelineText, isActive && styles.timelineTextActive]}>{step.label}</AppText>
                    {isCurrent && <AppText style={styles.timelineSubText}>Your order is currently in this stage.</AppText>}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7FAF8' },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  
  headerOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 16, zIndex: 10,
  },
  backBtnFloat: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#00B140', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5,
  },
  etaBadge: {
    backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#00B140', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5,
  },
  etaLabel: { fontSize: 12, color: '#66736B', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  etaTime: { fontSize: 20, color: PRIMARY, fontWeight: '900', letterSpacing: -0.5 },

  bottomSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 36, borderTopRightRadius: 36,
    paddingTop: 8, paddingHorizontal: 24,
    shadowColor: '#00B140', shadowOffset: { width: 0, height: -12 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 20,
    maxHeight: height * 0.55,
  },
  riderCard: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 20, borderBottomWidth: 1, borderColor: '#F0F5F2',
  },
  riderAvatarWrap: { position: 'relative', marginRight: 16 },
  riderAvatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#F7FBF8', borderWidth: 2, borderColor: '#EAF8F0' },
  pulseDot: { position: 'absolute', bottom: 0, right: 0, width: 16, height: 16, borderRadius: 8, backgroundColor: PRIMARY, borderWidth: 3, borderColor: '#FFFFFF' },
  riderInfo: { flex: 1 },
  riderName: { fontSize: 18, fontWeight: '800', color: '#122018', letterSpacing: -0.2 },
  riderVehicle: { fontSize: 14, color: '#66736B', fontWeight: '600', marginTop: 2 },
  riderActions: { flexDirection: 'row', gap: 12 },
  iconBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F7FBF8', alignItems: 'center', justifyContent: 'center' },
  
  timelineScroll: { paddingTop: 20 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: '#122018', marginBottom: 24, letterSpacing: -0.5 },
  
  timeline: { paddingLeft: 10 },
  timelineItem: { flexDirection: 'row', marginBottom: 28 },
  timelineIconLine: { alignItems: 'center', marginRight: 16 },
  timelineDot: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F7FBF8', alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  timelineDotActive: { backgroundColor: PRIMARY, shadowColor: '#00B140', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  timelineDotCurrent: { backgroundColor: ACCENT, shadowColor: ACCENT, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  timelineLine: { width: 2, height: '100%', backgroundColor: '#F0F5F2', position: 'absolute', top: 36, zIndex: 1 },
  timelineLineActive: { backgroundColor: PRIMARY },
  
  timelineContent: { flex: 1, paddingTop: 6 },
  timelineText: { fontSize: 16, fontWeight: '600', color: '#8B9690' },
  timelineTextActive: { color: '#122018', fontWeight: '800' },
  timelineSubText: { fontSize: 14, color: '#66736B', marginTop: 4, lineHeight: 20, fontWeight: '500' },

  rateBanner: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF7ED',
    padding: 20, borderRadius: 24, marginTop: 16, borderWidth: 1, borderColor: '#FFEDD5'
  },
  rateIconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFEDD5', alignItems: 'center', justifyContent: 'center' },
  rateTitle: { fontSize: 16, fontWeight: '800', color: '#B45309' },
  rateSub: { fontSize: 13, color: '#92400E', marginTop: 2, fontWeight: '500' },
});
