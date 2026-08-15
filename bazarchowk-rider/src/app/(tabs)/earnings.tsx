import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '@/services/api';

export default function RiderEarningsScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<'TODAY' | 'WEEK' | 'MONTH'>('TODAY');

  const [data, setData] = useState({
    totalDeliveries: 0,
    deliveriesCompleted: 0,
    deliveryEarnings: 0,
    cashInHand: 0,
    pendingCollections: [] as any[],
  });

  const [ledgerHistory, setLedgerHistory] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [deliveriesRes, cashRes] = await Promise.all([
        api.get('/deliveries/rider'),
        api.get('/settlement/cash/my-summary').catch(() => ({ data: { pendingCollections: [], totalOutstanding: 0 } })),
      ]);

      const allDeliveries = Array.isArray(deliveriesRes.data) ? deliveriesRes.data : [];
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 7);
      const monthStart = new Date(); monthStart.setDate(1);

      const inRange = (d: any) => {
        const date = new Date(d.updatedAt || d.createdAt);
        if (filter === 'TODAY') return date >= todayStart;
        if (filter === 'WEEK') return date >= weekStart;
        return date >= monthStart;
      };

      const filtered = allDeliveries.filter(inRange);
      const completed = filtered.filter((d: any) => d.status === 'DELIVERED');
      const deliveryEarnings = completed.reduce((sum: number, d: any) => sum + (d.order?.deliveryFee || 0), 0);

      const pending = cashRes.data?.pendingCollections || [];
      const cashInHand = cashRes.data?.totalOutstanding || 0;

      setData({
        totalDeliveries: filtered.length,
        deliveriesCompleted: completed.length,
        deliveryEarnings,
        cashInHand,
        pendingCollections: pending,
      });

      setLedgerHistory(
        filtered.sort((a: any, b: any) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
      );
    } catch (e) {
      console.warn('Failed to fetch rider earnings', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDepositAll = async () => {
    if (data.pendingCollections.length === 0) {
      Alert.alert('No Cash to Deposit', 'You have no collected COD orders pending deposit.');
      return;
    }
    Alert.alert(
      'Submit Cash Deposit',
      `Submit ₹${data.cashInHand.toFixed(2)} from ${data.pendingCollections.length} COD order(s) to your admin?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            setSubmitting(true);
            try {
              await api.post('/settlement/deposits/submit', {
                collectionIds: data.pendingCollections.map((c: any) => c.id),
                totalAmount: data.cashInHand,
              });
              Alert.alert('Submitted!', 'Your cash deposit has been submitted to your admin for verification.');
              fetchData();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to submit deposit.');
            } finally {
              setSubmitting(false);
            }
          }
        }
      ]
    );
  };

  useEffect(() => { fetchData(); }, [filter]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Earnings</Text>
      </View>

      <View style={styles.tabContainer}>
        <View style={styles.tabRow}>
          {(['TODAY', 'WEEK', 'MONTH'] as const).map((f) => (
            <TouchableOpacity key={f} style={[styles.tab, filter === f && styles.tabActive]} onPress={() => setFilter(f)}>
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
            <Text style={styles.heroLabel}>Delivery Earnings</Text>
            <Text style={styles.heroAmount}>₹{data.deliveryEarnings}</Text>
            <View style={styles.heroDivider} />
            <View style={styles.heroBottom}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatLabel}>Deliveries Done</Text>
                <Text style={styles.heroStatVal}>{data.deliveriesCompleted}</Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatLabel}>Rate per Trip</Text>
                <Text style={styles.heroStatVal}>₹{completed.length ? (deliveryEarnings / completed.length).toFixed(1) : 0}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Cash in Hand (COD)</Text>
          <View style={[styles.cashCard, data.cashInHand > 0 && styles.cashCardAlert]}>
            <View style={styles.cashRow}>
              <View style={[styles.cashIconBox, data.cashInHand > 0 && { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="cash-outline" size={24} color={data.cashInHand > 0 ? '#DC2626' : '#64748B'} />
              </View>
              <View style={styles.cashInfo}>
                <Text style={styles.cashLabel}>
                  {data.cashInHand > 0 ? `₹${data.cashInHand.toFixed(2)} to deposit` : 'No cash pending'}
                </Text>
                <Text style={styles.cashSub}>
                  {data.cashInHand > 0
                    ? `${data.pendingCollections.length} COD order(s) — deposit to admin`
                    : 'All collected cash has been submitted'}
                </Text>
              </View>
            </View>

            {data.pendingCollections.length > 0 && (
              <View style={{ marginTop: 14 }}>
                {data.pendingCollections.map((c: any) => (
                  <View key={c.id} style={styles.collectionRow}>
                    <Text style={styles.collectionOrder}>Order #{c.order?.orderNumber || c.orderId?.substring(0, 8)}</Text>
                    <Text style={styles.collectionAmt}>₹{Number(c.amountCollected).toFixed(2)}</Text>
                  </View>
                ))}
                <TouchableOpacity
                  style={[styles.depositBtn, submitting && { opacity: 0.6 }]}
                  onPress={handleDepositAll}
                  disabled={submitting}
                >
                  {submitting
                    ? <ActivityIndicator color="#FFF" size="small" />
                    : <Text style={styles.depositBtnText}>Submit ₹{data.cashInHand.toFixed(2)} to Admin</Text>
                  }
                </TouchableOpacity>
              </View>
            )}
          </View>

          <Text style={styles.sectionTitle}>Trip History</Text>
          {ledgerHistory.length === 0 ? (
            <View style={styles.emptyLedger}>
              <Ionicons name="document-text-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyLedgerText}>No trips found for this period.</Text>
            </View>
          ) : (
            ledgerHistory.map((item, index) => (
              <View key={item.id || index} style={styles.ledgerCard}>
                <View style={styles.ledgerHeader}>
                  <Text style={styles.ledgerId}>Trip #{item.id?.substring(0, 8)}</Text>
                  <Text style={styles.ledgerDate}>{new Date(item.createdAt).toLocaleDateString('en-IN')}</Text>
                </View>
                <View style={styles.ledgerRow}>
                  <View style={[styles.statusBadge, item.status === 'DELIVERED' ? styles.bgGreen : styles.bgGray]}>
                    <Text style={item.status === 'DELIVERED' ? styles.textGreen : styles.textGray}>{item.status || 'COMPLETED'}</Text>
                  </View>
                  <Text style={styles.ledgerAmount}>+ ₹{item.order?.deliveryFee || 0}</Text>
                </View>
                {item.order?.paymentMethod === 'COD' && (
                  <Text style={styles.codTag}>COD — ₹{Number(item.order?.totalAmount).toFixed(2)} collected</Text>
                )}
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
  header: { padding: 20, backgroundColor: '#FFF' },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#0F172A' },

  tabContainer: { backgroundColor: '#FFF', paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, borderColor: '#E2E8F0' },
  tabRow: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  tabTextActive: { color: '#0F172A', fontWeight: '800' },

  scroll: { padding: 20, paddingBottom: 100 },

  heroCard: { backgroundColor: '#0F172A', borderRadius: 20, padding: 22, marginBottom: 24 },
  heroLabel: { color: '#94A3B8', fontSize: 13, fontWeight: '600', marginBottom: 6 },
  heroAmount: { color: '#FFF', fontSize: 42, fontWeight: '800' },
  heroDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 18 },
  heroBottom: { flexDirection: 'row' },
  heroStat: { flex: 1 },
  heroStatLabel: { color: '#64748B', fontSize: 12, marginBottom: 4 },
  heroStatVal: { color: '#FFF', fontSize: 18, fontWeight: '700' },

  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 12 },

  cashCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 24 },
  cashCardAlert: { borderColor: '#FECACA', backgroundColor: '#FFF5F5' },
  cashRow: { flexDirection: 'row', alignItems: 'center' },
  cashIconBox: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  cashInfo: { flex: 1, marginLeft: 14 },
  cashLabel: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  cashSub: { fontSize: 12, color: '#64748B', marginTop: 2 },

  collectionRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderColor: '#F1F5F9' },
  collectionOrder: { fontSize: 13, color: '#334155', fontWeight: '600' },
  collectionAmt: { fontSize: 13, color: '#DC2626', fontWeight: '700' },

  depositBtn: { backgroundColor: '#DC2626', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 12 },
  depositBtnText: { color: '#FFF', fontWeight: '800', fontSize: 15 },

  emptyLedger: { alignItems: 'center', padding: 24, backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  emptyLedgerText: { marginTop: 12, color: '#64748B', fontWeight: '500' },

  ledgerCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  ledgerHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  ledgerId: { fontSize: 13, fontWeight: '700', color: '#334155' },
  ledgerDate: { fontSize: 12, color: '#94A3B8' },
  ledgerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  bgGreen: { backgroundColor: '#DCFCE7' }, textGreen: { color: '#16A34A', fontWeight: '700', fontSize: 12 },
  bgGray: { backgroundColor: '#F1F5F9' }, textGray: { color: '#64748B', fontWeight: '700', fontSize: 12 },
  ledgerAmount: { fontSize: 16, fontWeight: '800', color: '#00B140' },
  codTag: { marginTop: 8, fontSize: 12, color: '#DC2626', fontWeight: '600' },
});
