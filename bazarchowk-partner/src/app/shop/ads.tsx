import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
// @ts-ignore
import RazorpayCheckout from 'react-native-razorpay';
import api from '../../services/api';

export default function AdsDashboardScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<any[]>([]);
  const [myAds, setMyAds] = useState<any[]>([]);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const fetchAdsData = async () => {
    setLoading(true);
    try {
      const shopId = await SecureStore.getItemAsync('bazar_shop_id');
      const [plansRes, myAdsRes] = await Promise.all([
        api.get('/ads/plans'),
        api.get(`/shops/${shopId}/ads`)
      ]);
      setPlans(plansRes.data);
      setMyAds(myAdsRes.data);
    } catch (e) {
      console.warn('Failed to fetch ads', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdsData();
  }, []);

  const purchasePlan = async (planId: string) => {
    Alert.alert(
      'Purchase Advertisement',
      'This will deduct the ad amount from your Wallet balance. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Purchase', 
          onPress: async () => {
            setPurchasing(planId);
            try {
              const shopId = await SecureStore.getItemAsync('bazar_shop_id');
              await api.post('/ads/purchase', {
                shopId,
                planId,
                title: 'Promotional Ad',
              });
              Alert.alert('Success', 'Ad campaign purchased! It will be active once approved by Market Admin.');
              fetchAdsData();
            } catch (error: any) {
              const msg = error?.response?.data?.message || 'Failed to purchase plan. Check wallet balance.';
              Alert.alert('Purchase Failed', typeof msg === 'string' ? msg : 'Error occurred');
            } finally {
              setPurchasing(null);
            }
          }
        }
      ]
    );
  };

  const purchaseOnline = async (plan: any) => {
    try {
      setPurchasing(`online-${plan.id}`);
      const shopId = await SecureStore.getItemAsync('bazar_shop_id');
      
      const orderRes = await api.post('/ads/purchase/online', { shopId, planId: plan.id });
      const { razorpayOrderId, amount } = orderRes.data;

      const data = await RazorpayCheckout.open({
        key: 'rzp_live_Sr05Li4YOC8ZQo',
        amount: amount,
        name: 'BazarChowk Ads',
        description: plan.name,
        image: 'https://bazarchowk.com/logo.png',
        order_id: razorpayOrderId,
        theme: { color: '#0F172A' }
      });

      await api.post('/ads/purchase/verify', {
        shopId,
        planId: plan.id,
        title: 'Promotional Ad',
        razorpayOrderId: data.razorpay_order_id,
        razorpayPaymentId: data.razorpay_payment_id,
        razorpaySignature: data.razorpay_signature
      });

      Alert.alert('Success', 'Payment successful! Ad campaign is now pending approval.');
      fetchAdsData();
    } catch (error: any) {
      const msg = error?.description || error?.response?.data?.message || 'Payment cancelled or failed';
      Alert.alert('Payment Failed', typeof msg === 'string' ? msg : 'Error');
    } finally {
      setPurchasing(null);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Promote Business</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#00B140" /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          
          <View style={styles.heroCard}>
            <Ionicons name="megaphone" size={32} color="#FFF" />
            <Text style={styles.heroTitle}>Grow Your Sales</Text>
            <Text style={styles.heroSub}>Purchase top spots in the customer app to get more orders instantly.</Text>
          </View>

          <Text style={styles.sectionTitle}>Available Ad Plans</Text>
          {plans.map((plan) => (
            <View key={plan.id} style={styles.planCard}>
              <View style={styles.planHeader}>
                <View style={styles.planIconBox}>
                  <Ionicons name={plan.type === 'FEATURED_SHOP' ? 'star' : 'image'} size={24} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.planDuration}>{plan.durationDays} Days Duration</Text>
                </View>
                <Text style={styles.planPrice}>₹{plan.price}</Text>
              </View>
              
              <View style={styles.btnRow}>
                <TouchableOpacity 
                  style={[styles.purchaseBtn, { flex: 1 }]} 
                  onPress={() => purchasePlan(plan.id)}
                  disabled={purchasing !== null}
                >
                  {purchasing === plan.id ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.purchaseBtnText}>Pay via Wallet</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.purchaseBtnOutline, { flex: 1 }]} 
                  onPress={() => purchaseOnline(plan)}
                  disabled={purchasing !== null}
                >
                  {purchasing === `online-${plan.id}` ? (
                    <ActivityIndicator color="#0F172A" size="small" />
                  ) : (
                    <Text style={styles.purchaseBtnTextOutline}>Pay Online</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ))}

          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>My Campaigns</Text>
          {myAds.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="sad-outline" size={32} color="#94A3B8" />
              <Text style={styles.emptyText}>You have no active ad campaigns.</Text>
            </View>
          ) : (
            myAds.map((ad) => (
              <View key={ad.id} style={styles.myAdCard}>
                <View style={styles.myAdRow}>
                  <Text style={styles.myAdTitle}>{ad.title || ad.type}</Text>
                  <View style={[styles.statusBadge, ad.status === 'ACTIVE' ? styles.bgGreen : ad.status === 'PENDING' ? styles.bgOrange : styles.bgGray]}>
                    <Text style={[styles.statusText, ad.status === 'ACTIVE' ? styles.textGreen : ad.status === 'PENDING' ? styles.textOrange : styles.textGray]}>{ad.status}</Text>
                  </View>
                </View>
                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <Ionicons name="eye-outline" size={16} color="#64748B" />
                    <Text style={styles.statText}>{ad.impressions} Views</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Ionicons name="hand-right-outline" size={16} color="#64748B" />
                    <Text style={styles.statText}>{ad.clicks} Clicks</Text>
                  </View>
                </View>
              </View>
            ))
          )}

        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E2E8F0' },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#0F172A' },
  scroll: { padding: 20, paddingBottom: 100 },
  
  heroCard: { backgroundColor: '#00B140', borderRadius: 20, padding: 24, marginBottom: 24, alignItems: 'center' },
  heroTitle: { color: '#FFF', fontSize: 24, fontWeight: '800', marginTop: 12, marginBottom: 4 },
  heroSub: { color: '#DCFCE7', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 16 },
  
  planCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  planHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  planIconBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' },
  planName: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  planDuration: { fontSize: 13, color: '#64748B', marginTop: 2 },
  planPrice: { fontSize: 20, fontWeight: '800', color: '#00B140' },
  
  btnRow: { flexDirection: 'row', gap: 12 },
  purchaseBtn: { backgroundColor: '#00B140', height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  purchaseBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  purchaseBtnOutline: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  purchaseBtnTextOutline: { color: '#0F172A', fontSize: 14, fontWeight: '700' },
  
  emptyCard: { backgroundColor: '#FFF', padding: 32, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed' },
  emptyText: { color: '#64748B', fontSize: 14, marginTop: 12, fontWeight: '500' },
  
  myAdCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  myAdRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  myAdTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  bgGreen: { backgroundColor: '#DCFCE7' }, textGreen: { color: '#16A34A', fontSize: 12, fontWeight: '700' },
  bgOrange: { backgroundColor: '#FFEDD5' }, textOrange: { color: '#EA580C', fontSize: 12, fontWeight: '700' },
  bgGray: { backgroundColor: '#F1F5F9' }, textGray: { color: '#64748B', fontSize: 12, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 16, paddingTop: 12, borderTopWidth: 1, borderColor: '#F1F5F9' },
  statBox: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statText: { fontSize: 13, color: '#475569', fontWeight: '600' }
});
