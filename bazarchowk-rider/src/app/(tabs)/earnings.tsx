import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

import api from '@/services/api';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://bazarchowk-complete.vercel.app';

export default function RiderEarningsScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM'>('TODAY');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const [data, setData] = useState({
    totalDeliveries: 0,
    deliveriesCompleted: 0,
    deliveriesReturned: 0,
    deliveryEarnings: 0,
    tips: 0,
    totalEarnings: 0,
    cashInHand: 0,
    settlementStatus: 'PENDING'
  });
  
  const [ledgerHistory, setLedgerHistory] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Connect to the actual backend API
      let url = `/deliveries/rider/earnings?filter=${filter}`;
      if (filter === 'CUSTOM' && customStart && customEnd) {
        url += `&startDate=${customStart}&endDate=${customEnd}`;
      }
      const response = await api.get(url);
      
      if (response.data) {
        setData({
          totalDeliveries: response.data.totalDeliveries || 0,
          deliveriesCompleted: response.data.deliveriesCompleted || 0,
          deliveriesReturned: response.data.deliveriesReturned || 0,
          deliveryEarnings: response.data.deliveryEarnings || 0,
          tips: response.data.tips || 0,
          totalEarnings: response.data.totalEarnings || 0,
          cashInHand: response.data.cashInHand || 0,
          settlementStatus: response.data.settlementStatus || 'PENDING'
        });
      }

      // Fetch deliveries for ledger history
      const deliveriesRes = await api.get(`/deliveries/rider`);
      if (deliveriesRes.data) {
        const deliveries = Array.isArray(deliveriesRes.data) ? deliveriesRes.data : [];
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);
        const monthStart = new Date();
        monthStart.setDate(1);

        const filtered = deliveries.filter((d: any) => {
          const date = new Date(d.createdAt);
          if (filter === 'TODAY') return date >= todayStart;
          if (filter === 'WEEK') return date >= weekStart;
          if (filter === 'MONTH') return date >= monthStart;
          if (filter === 'CUSTOM' && customStart && customEnd) {
            const start = new Date(customStart);
            start.setHours(0, 0, 0, 0);
            const end = new Date(customEnd);
            end.setHours(23, 59, 59, 999);
            return date >= start && date <= end;
          }
          return true;
        });

        setLedgerHistory(filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      }
    } catch (e) {
      console.warn('Failed to fetch real rider earnings');
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
        <Text style={styles.headerTitle}>My Earnings</Text>
      </View>

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
          
          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              <View>
                <Text style={styles.heroLabel}>Total Earnings</Text>
                <Text style={styles.heroAmount}>₹{data.totalEarnings}</Text>
              </View>
              <View style={{ gap: 8, alignItems: 'flex-end' }}>
                <View style={[styles.deliveryBadge, { backgroundColor: '#DCFCE7' }]}>
                  <Ionicons name="checkmark-done" size={16} color="#00B140" />
                  <Text style={[styles.deliveryBadgeText, { color: '#00B140' }]}>{data.deliveriesCompleted} Done</Text>
                </View>
                {data.deliveriesReturned > 0 && (
                  <View style={[styles.deliveryBadge, { backgroundColor: '#FEE2E2' }]}>
                    <Ionicons name="return-down-back" size={16} color="#DC2626" />
                    <Text style={[styles.deliveryBadgeText, { color: '#DC2626' }]}>{data.deliveriesReturned} Returns</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.heroDivider} />
            
            <View style={styles.heroBottom}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatLabel}>Delivery Pay</Text>
                <Text style={styles.heroStatVal}>₹{data.deliveryEarnings}</Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatLabel}>Customer Tips</Text>
                <Text style={styles.heroStatVal}>₹{data.tips}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Cash Collection & Settlement</Text>

          <View style={styles.cashCard}>
            <View style={styles.cashRow}>
              <View style={styles.cashIconBox}>
                <Ionicons name="wallet-outline" size={24} color="#F59E0B" />
              </View>
              <View style={styles.cashInfo}>
                <Text style={styles.cashLabel}>Cash in Hand (COD)</Text>
                <Text style={styles.cashSub}>Amount to deposit to Admin</Text>
              </View>
              <Text style={styles.cashAmount}>₹{data.cashInHand}</Text>
            </View>

            <View style={styles.cashDivider} />

            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Settlement Status:</Text>
              <View style={[styles.statusBadge, data.settlementStatus === 'SETTLED' ? styles.bgGreen : styles.bgOrange]}>
                <Text style={[data.settlementStatus === 'SETTLED' ? styles.textGreen : styles.textOrange]}>
                  {data.settlementStatus === 'SETTLED' ? 'Admin Settled' : 'Pending Deposit'}
                </Text>
              </View>
            </View>
          </View>

          <View style={{ marginTop: 16 }}>
            <Text style={styles.sectionTitle}>Ledger History</Text>
            {ledgerHistory.length === 0 ? (
              <View style={styles.emptyLedger}>
                <Ionicons name="document-text-outline" size={48} color="#CBD5E1" />
                <Text style={styles.emptyLedgerText}>No trips found for {filter.toLowerCase()}.</Text>
              </View>
            ) : (
              ledgerHistory.map((item, index) => (
                <View key={item.id || index} style={styles.ledgerCard}>
                  <View style={styles.ledgerHeader}>
                    <Text style={styles.ledgerId}>Trip #{item.id?.substring(0, 8)}</Text>
                    <Text style={styles.ledgerDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                  </View>
                  <View style={styles.ledgerRow}>
                    <View>
                      <Text style={styles.ledgerMethod}>{item.status || 'COMPLETED'}</Text>
                    </View>
                    <Text style={styles.ledgerAmount}>+ ₹{item.distanceKm ? (item.distanceKm * 10).toFixed(2) : 25}</Text>
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
  header: { padding: 20, backgroundColor: '#FFF' },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#0F172A' },
  
  tabContainer: { backgroundColor: '#FFF', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderColor: '#E2E8F0' },
  tabRow: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  tabTextActive: { color: '#0F172A', fontWeight: '800' },
  
  dateInput: { flex: 1, backgroundColor: '#F1F5F9', padding: 8, borderRadius: 8, fontSize: 14, textAlign: 'center', fontWeight: '600', color: '#0F172A' },
  
  scroll: { padding: 20, paddingBottom: 100 },
  
  heroCard: { backgroundColor: '#0F172A', borderRadius: 24, padding: 24, marginBottom: 24, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 10 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroLabel: { color: '#94A3B8', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  heroAmount: { color: '#FFF', fontSize: 44, fontWeight: '800' },
  deliveryBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,177,64,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  deliveryBadgeText: { color: '#10B981', fontSize: 13, fontWeight: '700', marginLeft: 6 },
  heroDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 20 },
  heroBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  heroStat: { flex: 1 },
  heroStatLabel: { color: '#64748B', fontSize: 13, fontWeight: '500', marginBottom: 4 },
  heroStatVal: { color: '#FFF', fontSize: 18, fontWeight: '700' },

  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 16 },
  
  cashCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 24 },
  cashRow: { flexDirection: 'row', alignItems: 'center' },
  cashIconBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' },
  cashInfo: { flex: 1, marginLeft: 16 },
  cashLabel: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  cashSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  cashAmount: { fontSize: 22, fontWeight: '800', color: '#F59E0B' },
  cashDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 16 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusLabel: { fontSize: 14, fontWeight: '600', color: '#475569' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  bgGreen: { backgroundColor: '#DCFCE7' }, textGreen: { color: '#16A34A', fontWeight: '700' },
  bgOrange: { backgroundColor: '#FFEDD5' }, textOrange: { color: '#EA580C', fontWeight: '700' },

  historyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9', padding: 16, borderRadius: 16, gap: 8 },
  historyBtnText: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  
  emptyLedger: { alignItems: 'center', padding: 24, backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  emptyLedgerText: { marginTop: 12, color: '#64748B', fontWeight: '500' },
  
  ledgerCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  ledgerHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  ledgerId: { fontSize: 14, fontWeight: '700', color: '#334155' },
  ledgerDate: { fontSize: 12, color: '#94A3B8' },
  ledgerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ledgerMethod: { fontSize: 12, color: '#00B140', fontWeight: '600', backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 4 },
  ledgerAmount: { fontSize: 18, fontWeight: '800', color: '#0F172A' }
});
