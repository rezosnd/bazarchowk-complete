import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '@/services/api';
import { useAuthStore } from '@/store/auth.store';
import { router } from 'expo-router';
import { HomeHeader } from './index';
import { PressableScale } from '@/components/PressableScale';
import Animated, { FadeInDown } from 'react-native-reanimated';

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

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'DELIVERED': return { bg: '#EAF8F0', text: '#008F3C' };
      case 'CANCELLED': return { bg: '#FEE2E2', text: '#DC2626' };
      case 'PLACED': return { bg: '#FFF1DF', text: '#FF8A00' };
      case 'CONFIRMED': return { bg: '#E0F2FE', text: '#0284C7' };
      case 'IN TRANSIT': return { bg: '#F3E8FF', text: '#9333EA' };
      default: return { bg: '#FFF1DF', text: '#FF8A00' };
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.root}>
        <View style={{ paddingTop: insets.top, backgroundColor: '#FFFFFF', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#E5EBE7' }}>
          <HomeHeader />
        </View>
        <View style={styles.center}>
          <View style={styles.emptyIconBg}>
            <Ionicons name="receipt-outline" size={56} color="#8B9690" />
          </View>
          <Text style={styles.emptyText}>You need to login first</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={{ paddingTop: insets.top, backgroundColor: '#FFFFFF', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#E5EBE7' }}>
        <HomeHeader />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={PRIMARY} /></View>
      ) : (
        <ScrollView 
          contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, 16) + 80 }]} 
          showsVerticalScrollIndicator={false}
        >
          {orders.length === 0 ? (
            <Animated.View entering={FadeInDown.springify().damping(18)} style={styles.centerEmpty}>
              <View style={styles.emptyIconBg}>
                <Ionicons name="bag-handle-outline" size={48} color={PRIMARY} />
              </View>
              <Text style={styles.emptyText}>No orders yet</Text>
              <Text style={styles.emptySub}>Your next local order will appear here.</Text>
            </Animated.View>
          ) : (
            orders.map((order, index) => {
              const statusStyle = getStatusStyles(order.status);
              return (
                <Animated.View key={order.id} entering={FadeInDown.delay(index * 50).springify().damping(15)}>
                  <PressableScale 
                    style={styles.orderCard} 
                    onPress={() => router.push(`/order/${order.id}` as any)}
                  >
                    <View style={styles.orderHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={styles.storeIconWrap}>
                          <Ionicons name="storefront" size={20} color="#122018" />
                        </View>
                        <View>
                          <Text style={styles.shopName}>{order.shop?.name || 'Store'}</Text>
                          <Text style={styles.orderDate}>{new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} • {order.items?.length || 1} item{order.items?.length > 1 ? 's' : ''}</Text>
                        </View>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                        <Text style={[styles.statusText, { color: statusStyle.text }]}>{order.status}</Text>
                      </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.itemsRow}>
                      <Text style={styles.itemsText} numberOfLines={2}>
                        {order.items?.map((item: any) => `${item.quantity} x ${item.productVariant?.product?.name || 'Item'}`).join(', ')}
                      </Text>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.orderFooter}>
                      <Text style={styles.totalText}>₹{order.totalAmount?.toFixed(2)}</Text>
                      <View style={styles.viewDetailsWrap}>
                        <Text style={styles.viewDetailsText}>View Details</Text>
                        <Ionicons name="arrow-forward" size={16} color="#00B140" />
                      </View>
                    </View>
                  </PressableScale>
                </Animated.View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7FBF8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  centerEmpty: { alignItems: 'center', marginTop: '40%' },
  
  emptyIconBg: { width: 88, height: 88, borderRadius: 32, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5EBE7', shadowColor: '#00B140', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  emptyText: { fontSize: 20, fontWeight: '800', color: '#122018', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#66736B' },
  
  scroll: { padding: 16 },
  
  orderCard: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 24, 
    padding: 20, 
    marginBottom: 16, 
    borderWidth: 1, 
    borderColor: '#E5EBE7', 
    shadowColor: '#00B140', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 
  },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  storeIconWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#F7FBF8', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#EAF8F0' },
  shopName: { fontSize: 16, fontWeight: '800', color: '#122018', letterSpacing: -0.2 },
  orderDate: { fontSize: 13, color: '#66736B', marginTop: 4, fontWeight: '500' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  
  divider: { height: 1, backgroundColor: '#F0F5F2', marginVertical: 16 },
  
  itemsRow: {},
  itemsText: { fontSize: 14, color: '#4B5563', lineHeight: 22, fontWeight: '500' },
  
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalText: { fontSize: 20, fontWeight: '800', color: '#122018' },
  viewDetailsWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewDetailsText: { fontSize: 14, fontWeight: '700', color: '#00B140' }
});
