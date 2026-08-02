import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://bazarchowk-complete.vercel.app';

export default function ShopOrdersScreen() {
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'LIVE' | 'PAST'>('LIVE');

  useEffect(() => {
    fetchOrders();

    import('../../services/socket').then(({ socketService }) => {
      socketService.on('new_order', (data) => {
        // Refresh orders immediately to get full details
        fetchOrders();
      });
    });

    return () => {
      import('../../services/socket').then(({ socketService }) => {
        socketService.off('new_order');
      });
    };
  }, []);

  const fetchOrders = async () => {
    try {
      const shopId = await SecureStore.getItemAsync('bazar_shop_id');
      const token = await SecureStore.getItemAsync('partner_token');
      if (!shopId || !token) throw new Error('Not authenticated');
      
      const res = await fetch(`${API_BASE}/orders/shop/${shopId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (error) {
      console.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId: string, newStatus: string) => {
    setProcessingId(orderId);
    try {
      const token = await SecureStore.getItemAsync('partner_token');
      const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ status: newStatus, notes: `Status updated to ${newStatus}` })
      });
      
      if (res.ok) {
        fetchOrders();
      } else {
        Alert.alert('Error', 'Failed to update order status');
      }
    } catch (e) {
      Alert.alert('Network Error', 'Could not reach server');
    } finally {
      setProcessingId(null);
    }
  };

  const getActionButtons = (order: any) => {
    if (order.status === 'PLACED') {
      return (
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={[styles.btn, styles.rejectBtn]} 
            onPress={() => updateStatus(order.id, 'CANCELLED')}
          >
            <Text style={styles.rejectText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.btn, styles.acceptBtn]} 
            onPress={() => updateStatus(order.id, 'ACCEPTED')}
          >
            <Text style={styles.acceptText}>Accept Order</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (order.status === 'ACCEPTED') {
      return (
        <TouchableOpacity style={[styles.btn, styles.primaryBtn]} onPress={() => updateStatus(order.id, 'PREPARING')}>
          <Text style={styles.primaryText}>Start Preparing</Text>
        </TouchableOpacity>
      );
    }
    if (order.status === 'PREPARING') {
      return (
        <TouchableOpacity style={[styles.btn, styles.primaryBtn]} onPress={() => updateStatus(order.id, 'READY')}>
          <Text style={styles.primaryText}>Mark as Ready</Text>
        </TouchableOpacity>
      );
    }
    if (order.status === 'READY') {
      return (
        <View style={styles.waitingRider}>
          <Ionicons name="bicycle" size={20} color="#F59E0B" />
          <Text style={styles.waitingText}>Waiting for Rider Pickup</Text>
        </View>
      );
    }
    return null;
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#00B140" /></View>;
  }

  const filteredOrders = orders.filter(o => {
    if (activeTab === 'LIVE') {
      return !['PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REFUNDED'].includes(o.status);
    } else {
      return ['PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REFUNDED'].includes(o.status);
    }
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.title}>Live Orders</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity style={[styles.tab, activeTab === 'LIVE' && styles.tabActive]} onPress={() => setActiveTab('LIVE')}>
            <Text style={[styles.tabText, activeTab === 'LIVE' && styles.tabTextActive]}>Live Orders</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'PAST' && styles.tabActive]} onPress={() => setActiveTab('PAST')}>
            <Text style={[styles.tabText, activeTab === 'PAST' && styles.tabTextActive]}>Past Orders</Text>
          </TouchableOpacity>
        </View>

        {filteredOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyText}>{activeTab === 'LIVE' ? 'No live orders' : 'No past orders'}</Text>
            <Text style={styles.emptySub}>{activeTab === 'LIVE' ? 'When customers order, they appear here.' : 'Completed orders will appear here.'}</Text>
          </View>
        ) : (
          filteredOrders.map((order) => (
            <View key={order.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.orderId}>{order.orderNumber}</Text>
                  <Text style={styles.customerName}>{order.customer?.name || 'Customer'}</Text>
                </View>
                <View style={styles.amountBox}>
                  <Text style={styles.amountText}>â‚¹{order.totalAmount}</Text>
                </View>
              </View>

              <View style={styles.itemsBox}>
                {order.items?.map((item: any) => (
                  <Text key={item.id} style={styles.itemText}>
                    {item.quantity} x {item.productVariant?.name}
                  </Text>
                ))}
              </View>

              {processingId === order.id ? (
                <View style={{ padding: 16, alignItems: 'center' }}>
                  <ActivityIndicator color="#00B140" />
                </View>
              ) : (
                <View style={styles.footer}>
                  {getActionButtons(order)}
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#FFF',
    borderBottomWidth: 1, borderColor: '#E2E8F0',
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginLeft: 8 },
  scroll: { padding: 16, paddingBottom: 100 },
  
  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginTop: 16 },
  emptySub: { fontSize: 14, color: '#64748B', marginTop: 8 },
  
  tabRow: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 12, padding: 4, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#F8FAFC' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  tabTextActive: { color: '#0F172A', fontWeight: '800' },
  
  card: { backgroundColor: '#FFF', borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 16, borderBottomWidth: 1, borderColor: '#F1F5F9' },
  orderId: { fontSize: 12, fontWeight: '700', color: '#00B140', marginBottom: 4 },
  customerName: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  amountBox: { backgroundColor: '#F8FAFC', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  amountText: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  
  itemsBox: { padding: 16, backgroundColor: '#F8FAFC' },
  itemText: { fontSize: 14, color: '#475569', marginBottom: 4, fontWeight: '500' },
  
  footer: { padding: 16 },
  actionRow: { flexDirection: 'row', gap: 12 },
  btn: { flex: 1, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rejectBtn: { backgroundColor: '#FEE2E2' },
  rejectText: { color: '#DC2626', fontWeight: '700' },
  acceptBtn: { backgroundColor: '#00B140', shadowColor: '#00B140', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  acceptText: { color: '#FFF', fontWeight: '700' },
  primaryBtn: { backgroundColor: '#0F172A' },
  primaryText: { color: '#FFF', fontWeight: '700' },
  
  waitingRider: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FEF3C7', padding: 12, borderRadius: 12 },
  waitingText: { color: '#D97706', fontWeight: '700' }
});
