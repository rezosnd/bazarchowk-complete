import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

import api from '@/services/api';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://bazarchowkapi.veritasco.tech';

export default function RiderEarningsScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'TODAY' | 'WEEK' | 'MONTH'>('TODAY');

  const [data, setData] = useState({
    totalDeliveries: 0,
    deliveryEarnings: 0,
    tips: 0,
    totalEarnings: 0,
    cashInHand: 0,
    settlementStatus: 'PENDING'
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      // Connect to the actual backend API
      const response = await api.get(`/deliveries/rider/earnings?filter=${filter}`);
      
      if (response.data) {
        setData({
          totalDeliveries: response.data.totalDeliveries || 0,
          deliveryEarnings: response.data.deliveryEarnings || 0,
          tips: response.data.tips || 0,
          totalEarnings: response.data.totalEarnings || 0,
          cashInHand: response.data.cashInHand || 0,
          settlementStatus: response.data.settlementStatus || 'PENDING'
        });
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
          {['TODAY', 'WEEK', 'MONTH'].map((f) => (
            <TouchableOpacity 
              key={f} 
              style={[styles.tab, filter === f && styles.tabActive]} 
              onPress={() => setFilter(f as any)}
            >
              <Text style={[styles.tabText, filter === f && styles.tabTextActive]}>
                {f === 'TODAY' ? 'Today' : f === 'WEEK' ? 'Last 7 Days' : 'This Month'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
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
              <View style={styles.deliveryBadge}>
                <Ionicons name="bicycle" size={16} color="#00B140" />
                <Text style={styles.deliveryBadgeText}>{data.totalDeliveries} Trips</Text>
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
                <Text style={[styles.statusText, data.settlementStatus === 'SETTLED' ? styles.textGreen : styles.textOrange]}>
                  {data.settlementStatus === 'SETTLED' ? 'Admin Settled' : 'Pending Deposit'}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.historyBtn}>
            <Text style={styles.historyBtnText}>View Detailed Ledger</Text>
            <Ionicons name="chevron-forward" size={20} color="#0F172A" />
          </TouchableOpacity>

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
  tabTextActive: { color: '#00B140', fontWeight: '800' },
  
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
  historyBtnText: { fontSize: 15, fontWeight: '700', color: '#0F172A' }
});
