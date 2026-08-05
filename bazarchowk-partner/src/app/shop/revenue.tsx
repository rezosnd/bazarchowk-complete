import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

import api from '../../services/api';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://bazarchowk-complete.vercel.app';

export default function RevenueDashboardScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'TODAY' | 'WEEK' | 'MONTH'>('TODAY');

  const [data, setData] = useState({
    grossSales: 0,
    onlinePaid: 0,
    codCollected: 0,
    platformFees: 0,
    netEarnings: 0,
    pendingSettlement: 0
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/settlement/shop/dashboard`);
      
      if (response.data) {
        // Map the correct timeframe based on filter
        let currentPeriodData = response.data.today;
        if (filter === 'WEEK') currentPeriodData = response.data.last7Days;
        if (filter === 'MONTH') currentPeriodData = response.data.thisMonth;
        
        setData({
          grossSales: currentPeriodData?.grossSales || 0,
          onlinePaid: currentPeriodData?.onlinePaid || 0,
          codCollected: currentPeriodData?.codCollected || 0, 
          platformFees: ((currentPeriodData?.grossSales || 0) * 0.1) || 0,
          netEarnings: currentPeriodData?.netSettled || 0,
          pendingSettlement: response.data.pendingSettlement || 0
        });
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
          
          {/* Net Earnings Hero Card */}
          <View style={styles.heroCard}>
            <Text style={styles.heroLabel}>Net Settlement Earnings</Text>
            <Text style={styles.heroAmount}>₹{data.netEarnings.toLocaleString()}</Text>
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

            <View style={styles.bdRow}>
              <Text style={styles.bdLabelRed}>BazarChowk Platform Fee (-10%)</Text>
              <Text style={styles.bdValueRed}>- ₹{data.platformFees.toLocaleString()}</Text>
            </View>

            <View style={styles.dividerTotal} />

            <View style={styles.bdRow}>
              <Text style={styles.bdTotalLabel}>Total Settlement Due</Text>
              <Text style={styles.bdTotalValue}>₹{data.netEarnings.toLocaleString()}</Text>
            </View>

          </View>
          
          <TouchableOpacity style={styles.downloadBtn}>
            <Ionicons name="download-outline" size={20} color="#0F172A" />
            <Text style={styles.downloadText}>Download Tax Invoice</Text>
          </TouchableOpacity>

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
  downloadText: { fontSize: 15, fontWeight: '700', color: '#0F172A' }
});
