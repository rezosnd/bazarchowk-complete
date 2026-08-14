import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

import api from '../../services/api';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://bazarchowk-complete.vercel.app';

export default function RevenueDashboardScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM'>('TODAY');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const [data, setData] = useState({
    grossSales: 0,
    onlinePaid: 0,
    codCollected: 0,
    platformFees: 0,
    netEarnings: 0,
    pendingSettlement: 0
  });
  
  const [ledgerHistory, setLedgerHistory] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = `/settlement/shop/dashboard`;
      if (filter === 'CUSTOM' && customStart && customEnd) {
        url += `?startDate=${customStart}&endDate=${customEnd}`;
      }
      const response = await api.get(url);
      
      if (response.data) {
        // Map the correct timeframe based on filter
        let currentPeriodData = response.data.today;
        if (filter === 'WEEK') currentPeriodData = response.data.last7Days;
        if (filter === 'MONTH') currentPeriodData = response.data.thisMonth;
        if (filter === 'CUSTOM') currentPeriodData = response.data.custom || response.data.today;
        
        setData({
          grossSales: currentPeriodData?.grossSales || 0,
          onlinePaid: currentPeriodData?.onlinePaid || 0,
          codCollected: currentPeriodData?.codCollected || 0,
          platformFees: 0, // Set by admin at settlement time — default 0
          netEarnings: currentPeriodData?.netSettled || currentPeriodData?.grossSales || 0,
          pendingSettlement: response.data.pendingSettlement || 0
        });
      }

      // Fetch actual orders for ledger history
      const shopId = await SecureStore.getItemAsync('bazar_shop_id');
      if (shopId) {
        const ordersRes = await api.get(`/orders/shop/${shopId}`);
        if (ordersRes.data) {
          const orders = Array.isArray(ordersRes.data) ? ordersRes.data : [];
          // Filter by timeframe
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - 7);
          const monthStart = new Date();
          monthStart.setDate(1);

          const filteredOrders = orders.filter((o: any) => {
            const orderDate = new Date(o.createdAt);
            if (filter === 'TODAY') return orderDate >= todayStart;
            if (filter === 'WEEK') return orderDate >= weekStart;
            if (filter === 'MONTH') return orderDate >= monthStart;
            if (filter === 'CUSTOM' && customStart && customEnd) {
              const start = new Date(customStart);
              start.setHours(0, 0, 0, 0);
              const end = new Date(customEnd);
              end.setHours(23, 59, 59, 999);
              return orderDate >= start && orderDate <= end;
            }
            return true;
          });
          
          setLedgerHistory(filteredOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        }
      }
    } catch (e) {
      console.warn('Failed to fetch real shop revenue', e);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchData();
  }, [filter]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.title}>Revenue & Settlements</Text>
      </View>

      {/* Date Filter Tabs */}
      <View style={styles.tabContainer}>
        <View style={styles.tabRow}>
          {['TODAY', 'WEEK', 'MONTH', 'CUSTOM'].map((f) => (
            <TouchableOpacity 
              key={f} 
              style={[styles.tab, filter === f && styles.tabActive]} 
              onPress={() => setFilter(f as any)}
            >
              <Text style={[styles.tabText, filter === f && styles.tabTextActive]}>
                {f === 'TODAY' ? 'Today' : f === 'WEEK' ? 'Last 7 Days' : f === 'MONTH' ? 'This Month' : 'Custom'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {filter === 'CUSTOM' && (
          <View style={{ flexDirection: 'row', marginTop: 12, gap: 8, alignItems: 'center' }}>
            <TextInput 
              style={styles.dateInput} 
              placeholder="YYYY-MM-DD" 
              value={customStart} 
              onChangeText={setCustomStart} 
              maxLength={10} 
            />
            <Text style={{ color: '#64748B', fontWeight: 'bold' }}>TO</Text>
            <TextInput 
              style={styles.dateInput} 
              placeholder="YYYY-MM-DD" 
              value={customEnd} 
              onChangeText={setCustomEnd} 
              maxLength={10} 
            />
            <TouchableOpacity 
              style={{ backgroundColor: '#00B140', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}
              onPress={() => {
                if (!customStart || !customEnd) return Alert.alert('Enter both start and end dates');
                fetchData();
              }}
            >
              <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Apply</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#00B140" /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          
          {/* Net Earnings Hero Card */}
          <View style={[styles.heroCard, data.netEarnings < 0 && { backgroundColor: '#7F1D1D' }]}>
            <Text style={styles.heroLabel}>{data.netEarnings < 0 ? 'Outstanding Platform Dues' : 'Net Settlement Earnings'}</Text>
            <Text style={styles.heroAmount}>
              {data.netEarnings < 0 ? `- ₹${Math.abs(data.netEarnings).toLocaleString()}` : `₹${data.netEarnings.toLocaleString()}`}
            </Text>
            <View style={styles.heroBadgeRow}>
              <View style={styles.heroBadge}>
                <Ionicons name="trending-up" size={16} color="#00B140" />
                <Text style={styles.heroBadgeText}>+12% vs last {filter.toLowerCase()}</Text>
              </View>
              <View style={styles.heroBadgePending}>
                <Ionicons name="time-outline" size={16} color="#F59E0B" />
                <Text style={styles.heroBadgeTextPending}>₹{data.pendingSettlement.toLocaleString()} Pending</Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Detailed Breakdown</Text>
          
          <View style={styles.breakdownCard}>
            
            <View style={styles.bdRow}>
              <Text style={styles.bdLabel}>Gross Sales</Text>
              <Text style={styles.bdValue}>₹{data.grossSales.toLocaleString()}</Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.bdRowNested}>
              <View style={styles.nestedLabelRow}>
                <View style={[styles.dot, { backgroundColor: '#3B82F6' }]} />
                <Text style={styles.bdLabelNested}>Online Payments (Razorpay)</Text>
              </View>
              <Text style={styles.bdValueNested}>₹{data.onlinePaid.toLocaleString()}</Text>
            </View>
            
            <View style={styles.bdRowNested}>
              <View style={styles.nestedLabelRow}>
                <View style={[styles.dot, { backgroundColor: '#F59E0B' }]} />
                <Text style={styles.bdLabelNested}>Cash on Delivery (COD)</Text>
              </View>
              <Text style={styles.bdValueNested}>₹{data.codCollected.toLocaleString()}</Text>
            </View>

            <View style={styles.divider} />

            {data.platformFees > 0 && (
              <View style={styles.bdRow}>
                <Text style={styles.bdLabelRed}>Platform Commission</Text>
                <Text style={styles.bdValueRed}>- ₹{data.platformFees.toLocaleString()}</Text>
              </View>
            )}

            {data.platformFees === 0 && (
              <View style={[styles.bdRow, { paddingVertical: 6 }]}>
                <Text style={[styles.bdLabelNested, { marginLeft: 0 }]}>Platform Commission</Text>
                <Text style={{ fontSize: 13, color: '#00B140', fontWeight: '700' }}>No fee (set by admin)</Text>
              </View>
            )}

            <View style={styles.dividerTotal} />

            <View style={styles.bdRow}>
              <Text style={[styles.bdTotalLabel, data.netEarnings < 0 && { color: '#EF4444' }]}>
                {data.netEarnings < 0 ? 'Total Owed to Platform' : (data.pendingSettlement > 0 ? 'Total Settlement Due' : 'Total Settled Earnings')}
              </Text>
              <Text style={[styles.bdTotalValue, data.netEarnings < 0 && { color: '#EF4444' }]}>
                {data.netEarnings < 0 ? `- ₹${Math.abs(data.netEarnings).toLocaleString()}` : `₹${data.netEarnings.toLocaleString()}`}
              </Text>
            </View>

          </View>
          
          <TouchableOpacity 
            style={styles.downloadBtn}
            onPress={() => Alert.alert('Invoice Sent to Email', 'Detailed PDF tax invoices are automatically generated and sent to your registered email address every time a settlement is completed by the admin.')}
          >
            <Ionicons name="mail-outline" size={20} color="#0F172A" />
            <Text style={styles.downloadText}>Email Tax Invoice</Text>
          </TouchableOpacity>

          <View style={{ marginTop: 32 }}>
            <Text style={styles.sectionTitle}>Ledger History</Text>
            {ledgerHistory.length === 0 ? (
              <View style={styles.emptyLedger}>
                <Ionicons name="document-text-outline" size={48} color="#CBD5E1" />
                <Text style={styles.emptyLedgerText}>No transactions found for {filter.toLowerCase()}.</Text>
              </View>
            ) : (
              ledgerHistory.map((item, index) => (
                <View key={item.id || index} style={styles.ledgerCard}>
                  <View style={styles.ledgerHeader}>
                    <Text style={styles.ledgerId}>Order #{item.orderNumber || item.id?.substring(0, 8)}</Text>
                    <Text style={styles.ledgerDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                  </View>
                  <View style={styles.ledgerRow}>
                    <View>
                      <Text style={styles.ledgerMethod}>{item.paymentMethod || 'ONLINE'}</Text>
                      <Text style={styles.ledgerStatus}>Gross Order Amount</Text>
                    </View>
                    <Text style={styles.ledgerAmount}>+ ₹{item.totalAmount || 0}</Text>
                  </View>
                </View>
              ))
            )}
          </View>

        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#FFF' },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginLeft: 8 },
  
  tabContainer: { backgroundColor: '#FFF', paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderColor: '#E2E8F0' },
  tabRow: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  tabTextActive: { color: '#0F172A', fontWeight: '800' },
  
  dateInput: { flex: 1, backgroundColor: '#F1F5F9', padding: 8, borderRadius: 8, fontSize: 14, textAlign: 'center', fontWeight: '600', color: '#0F172A' },
  
  scroll: { padding: 16, paddingBottom: 100 },
  
  heroCard: { backgroundColor: '#0F172A', padding: 24, borderRadius: 24, marginBottom: 24, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 10 },
  heroLabel: { color: '#94A3B8', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  heroAmount: { color: '#FFF', fontSize: 40, fontWeight: '800', marginBottom: 16 },
  heroBadgeRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  heroBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,177,64,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  heroBadgeText: { color: '#10B981', fontSize: 12, fontWeight: '700', marginLeft: 4 },
  heroBadgePending: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245,158,11,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  heroBadgeTextPending: { color: '#F59E0B', fontSize: 12, fontWeight: '700', marginLeft: 4 },
  
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 16 },
  
  breakdownCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 24 },
  bdRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  bdLabel: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  bdValue: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },
  dividerTotal: { height: 2, backgroundColor: '#E2E8F0', marginVertical: 12 },
  
  bdRowNested: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, paddingLeft: 12 },
  nestedLabelRow: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  bdLabelNested: { fontSize: 14, fontWeight: '500', color: '#64748B' },
  bdValueNested: { fontSize: 14, fontWeight: '600', color: '#475569' },
  
  bdLabelRed: { fontSize: 14, fontWeight: '600', color: '#EF4444' },
  bdValueRed: { fontSize: 14, fontWeight: '700', color: '#EF4444' },
  
  bdTotalLabel: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  bdTotalValue: { fontSize: 20, fontWeight: '900', color: '#00B140' },
  
  downloadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9', padding: 16, borderRadius: 16, gap: 8 },
  downloadText: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  
  emptyLedger: { alignItems: 'center', padding: 24, backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  emptyLedgerText: { marginTop: 12, color: '#64748B', fontWeight: '500' },
  
  ledgerCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  ledgerHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  ledgerId: { fontSize: 14, fontWeight: '700', color: '#334155' },
  ledgerDate: { fontSize: 12, color: '#94A3B8' },
  ledgerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ledgerMethod: { fontSize: 12, color: '#00B140', fontWeight: '600', backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 4 },
  ledgerStatus: { fontSize: 12, color: '#64748B' },
  ledgerAmount: { fontSize: 18, fontWeight: '800', color: '#0F172A' }
});
