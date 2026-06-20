import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import api from '@/services/api';

const PRIMARY = '#00B140';

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [addAmount, setAddAmount] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    try {
      const { data } = await api.get('/wallet');
      setWallet(data);
    } catch (error) {
      console.warn('Failed to fetch wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMoney = async () => {
    const amount = parseFloat(addAmount);
    if (!amount || amount <= 0) return;

    setAdding(true);
    try {
      // Simulation: Directly credit wallet for demo purposes.
      // In production, this would open Razorpay, then call /wallet/credit on success.
      await api.post('/wallet/deposit', {
        amount,
      });
      setAddAmount('');
      Alert.alert('Success', `₹${amount} added to your wallet!`);
      fetchWallet();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add money');
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={PRIMARY} /></View>;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>BazarChowk Wallet</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceBg} />
          <View style={styles.balanceContent}>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balanceAmount}>₹{wallet?.balance?.toFixed(2) || '0.00'}</Text>
          </View>
          <Ionicons name="wallet" size={80} color="rgba(255,255,255,0.15)" style={styles.bgIcon} />
        </View>

        {/* Add Money Section */}
        <View style={styles.addMoneySection}>
          <Text style={styles.sectionTitle}>Add Money</Text>
          <View style={styles.inputRow}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              keyboardType="decimal-pad"
              value={addAmount}
              onChangeText={setAddAmount}
            />
            <TouchableOpacity 
              style={[styles.addBtn, (!addAmount || adding) && { opacity: 0.5 }]} 
              disabled={!addAmount || adding}
              onPress={handleAddMoney}
            >
              {adding ? <ActivityIndicator color="#FFF" /> : <Text style={styles.addText}>Add</Text>}
            </TouchableOpacity>
          </View>
          <View style={styles.quickAmounts}>
            {[100, 500, 1000].map(amt => (
              <TouchableOpacity key={amt} style={styles.quickChip} onPress={() => setAddAmount(amt.toString())}>
                <Text style={styles.quickText}>+₹{amt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Transactions */}
        <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Recent Transactions</Text>
        
        {wallet?.transactions?.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyText}>No transactions yet</Text>
          </View>
        ) : (
          wallet?.transactions?.map((tx: any) => (
            <View key={tx.id} style={styles.txCard}>
              <View style={[styles.txIconBox, tx.type === 'CREDIT' ? styles.bgGreen : styles.bgRed]}>
                <Ionicons 
                  name={tx.type === 'CREDIT' ? 'arrow-down' : 'arrow-up'} 
                  size={20} 
                  color={tx.type === 'CREDIT' ? '#16A34A' : '#DC2626'} 
                />
              </View>
              <View style={styles.txInfo}>
                <Text style={styles.txReason}>{tx.reason}</Text>
                <Text style={styles.txDate}>{new Date(tx.createdAt).toLocaleString()}</Text>
              </View>
              <View style={styles.txAmountBox}>
                <Text style={[styles.txAmount, tx.type === 'CREDIT' ? styles.textGreen : styles.textRed]}>
                  {tx.type === 'CREDIT' ? '+' : '-'}₹{tx.amount.toFixed(2)}
                </Text>
                <Text style={styles.txBal}>Bal: ₹{tx.balanceAfter.toFixed(2)}</Text>
              </View>
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
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16,
    backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E2E8F0',
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#0F172A', marginLeft: 8 },
  
  scroll: { padding: 20, gap: 24, paddingBottom: 100 },
  
  balanceCard: { height: 160, borderRadius: 24, overflow: 'hidden', backgroundColor: PRIMARY, shadowColor: PRIMARY, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 12 },
  balanceBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.1)' },
  balanceContent: { flex: 1, justifyContent: 'center', padding: 24 },
  balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 16, fontWeight: '600', marginBottom: 8 },
  balanceAmount: { color: '#FFF', fontSize: 40, fontWeight: '800' },
  bgIcon: { position: 'absolute', right: -10, bottom: -10 },
  
  addMoneySection: { backgroundColor: '#FFF', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 16 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 8 },
  currencySymbol: { fontSize: 24, fontWeight: '700', color: '#64748B', marginRight: 8 },
  input: { flex: 1, fontSize: 24, fontWeight: '800', color: '#0F172A', height: 48 },
  addBtn: { backgroundColor: PRIMARY, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  addText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  quickAmounts: { flexDirection: 'row', gap: 12, marginTop: 16 },
  quickChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#FFF' },
  quickText: { color: '#475569', fontWeight: '700' },
  
  txCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  txIconBox: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  bgGreen: { backgroundColor: '#DCFCE7' },
  bgRed: { backgroundColor: '#FEE2E2' },
  txInfo: { flex: 1, marginLeft: 16 },
  txReason: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  txDate: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  txAmountBox: { alignItems: 'flex-end' },
  txAmount: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  textGreen: { color: '#16A34A' },
  textRed: { color: '#DC2626' },
  txBal: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  
  emptyState: { alignItems: 'center', marginTop: 24 },
  emptyText: { color: '#64748B', marginTop: 12, fontWeight: '600' }
});
