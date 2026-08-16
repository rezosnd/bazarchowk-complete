import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import api from '@/services/api';
import { LinearGradient } from 'expo-linear-gradient';
import { Header } from '@/components/Header';
import { PressableScale } from '@/components/PressableScale';
import Animated, { FadeInUp, FadeInDown, useAnimatedStyle, withTiming, useSharedValue } from 'react-native-reanimated';

// @ts-ignore
let RazorpayCheckout: any = null;
try {
  RazorpayCheckout = require('react-native-razorpay').default;
} catch (e) {
  console.log('Razorpay not available in Expo Go');
}

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
      const { data: linkData } = await api.post('/wallet/deposit/create-link', {
        amount,
        redirectUri: 'ignored'
      });

      if (!RazorpayCheckout) {
        throw new Error('Razorpay is not available on web or in this environment.');
      }
      const data = await RazorpayCheckout.open({
        key: 'rzp_live_Sr05Li4YOC8ZQo',
        amount: linkData.amount,
        name: 'BazarChowk Wallet',
        description: 'Add money to wallet',
        order_id: linkData.razorpayOrderId,
        theme: { color: PRIMARY }
      });

      await api.post('/wallet/deposit/verify', {
        razorpay_order_id: data.razorpay_order_id,
        razorpay_payment_id: data.razorpay_payment_id,
        razorpay_signature: data.razorpay_signature
      });
      
      setAddAmount('');
      Alert.alert('Success', `₹${amount} added to your wallet!`);
      fetchWallet();
    } catch (error: any) {
      const errorMsg = error?.description || error?.response?.data?.message || error?.message || 'Failed to add money';
      Alert.alert('Error', typeof errorMsg === 'string' ? errorMsg : 'Payment failed or cancelled');
    } finally {
      setAdding(false);
    }
  };

  const isValidAmount = parseFloat(addAmount) > 0;

  return (
    <View style={styles.root}>
      <Header title="BazarChowk Wallet" />

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={PRIMARY} /></View>
      ) : (
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, 16) + 40 }]} showsVerticalScrollIndicator={false}>
          
          {/* Balance Card */}
          <Animated.View entering={FadeInUp.springify().damping(18)} style={styles.balanceCardWrapper}>
            <LinearGradient colors={['#008F3C', '#00B140']} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={styles.balanceCard}>
              <View style={styles.balanceContent}>
                <Text style={styles.balanceLabel}>Available Balance</Text>
                <Text style={styles.balanceAmount}>₹{wallet?.balance?.toFixed(2) || '0.00'}</Text>
              </View>
              <Ionicons name="wallet" size={100} color="rgba(255,255,255,0.15)" style={styles.bgIcon} />
            </LinearGradient>
          </Animated.View>

          {/* Add Money Section */}
          <Animated.View entering={FadeInUp.delay(100).springify().damping(18)} style={styles.addMoneySection}>
            <Text style={styles.sectionTitle}>Add Money</Text>
            <View style={styles.inputRow}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                keyboardType="decimal-pad"
                value={addAmount}
                onChangeText={setAddAmount}
                placeholderTextColor="#8B9690"
              />
              <PressableScale 
                style={[styles.addBtn, !isValidAmount && styles.addBtnDisabled]} 
                disabled={!isValidAmount || adding}
                onPress={handleAddMoney}
              >
                {adding ? <ActivityIndicator color="#FFF" /> : <Text style={styles.addText}>Add</Text>}
              </PressableScale>
            </View>
            <View style={styles.quickAmounts}>
              {[100, 500, 1000].map(amt => (
                <PressableScale 
                  key={amt} 
                  style={[styles.quickChip, addAmount === amt.toString() && styles.quickChipActive]} 
                  onPress={() => setAddAmount(amt.toString())}
                >
                  <Text style={[styles.quickText, addAmount === amt.toString() && styles.quickTextActive]}>+₹{amt}</Text>
                </PressableScale>
              ))}
            </View>
          </Animated.View>

          {/* Recent Transactions */}
          <Text style={[styles.sectionTitle, { marginTop: 12, paddingHorizontal: 4 }]}>Recent Transactions</Text>
          
          {wallet?.transactions?.length === 0 ? (
            <Animated.View entering={FadeInDown.springify()} style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="receipt-outline" size={40} color="#00B140" />
              </View>
              <Text style={styles.emptyText}>No transactions yet</Text>
            </Animated.View>
          ) : (
            wallet?.transactions?.map((tx: any, index: number) => (
              <Animated.View key={tx.id} entering={FadeInDown.delay(index * 40).springify().damping(15)} style={styles.txCard}>
                <View style={[styles.txIconBox, tx.type === 'CREDIT' ? styles.bgGreen : styles.bgRed]}>
                  <Ionicons 
                    name={tx.type === 'CREDIT' ? 'arrow-down' : 'arrow-up'} 
                    size={22} 
                    color={tx.type === 'CREDIT' ? '#00B140' : '#DC2626'} 
                  />
                </View>
                <View style={styles.txInfo}>
                  <Text style={styles.txReason}>{tx.type === 'CREDIT' ? 'DEPOSIT' : 'PURCHASE'}</Text>
                  <Text style={styles.txDate}>{new Date(tx.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
                <View style={styles.txAmountBox}>
                  <Text style={[styles.txAmount, tx.type === 'CREDIT' ? styles.textGreen : styles.textRed]}>
                    {tx.type === 'CREDIT' ? '+' : '-'}₹{tx.amount?.toFixed(2)}
                  </Text>
                  <Text style={styles.txBal}>Bal: ₹{tx.balanceAfter?.toFixed(2)}</Text>
                </View>
              </Animated.View>
            ))
          )}

        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7FBF8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, gap: 20 },
  
  balanceCardWrapper: {
    shadowColor: '#00B140', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.25, shadowRadius: 24, elevation: 12,
    borderRadius: 24, overflow: 'hidden'
  },
  balanceCard: { height: 170, padding: 24, justifyContent: 'center' },
  balanceContent: { zIndex: 2 },
  balanceLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 16, fontWeight: '600', marginBottom: 8, letterSpacing: 0.5 },
  balanceAmount: { color: '#FFF', fontSize: 44, fontWeight: '900', letterSpacing: -1 },
  bgIcon: { position: 'absolute', right: -20, bottom: -20, transform: [{ rotate: '-15deg' }] },
  
  addMoneySection: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#E5EBE7', shadowColor: '#00B140', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#122018', marginBottom: 16, letterSpacing: -0.2 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7FBF8', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: '#EAF8F0' },
  currencySymbol: { fontSize: 28, fontWeight: '700', color: '#66736B', marginRight: 12 },
  input: { flex: 1, fontSize: 28, fontWeight: '800', color: '#122018', height: 56 },
  addBtn: { backgroundColor: PRIMARY, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  addBtnDisabled: { backgroundColor: '#CBD5E1' },
  addText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  quickAmounts: { flexDirection: 'row', gap: 12, marginTop: 16 },
  quickChip: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#E5EBE7', backgroundColor: '#FFFFFF' },
  quickChipActive: { backgroundColor: '#EAF8F0', borderColor: '#00B140' },
  quickText: { color: '#66736B', fontWeight: '700', fontSize: 15 },
  quickTextActive: { color: '#008F3C' },
  
  txCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 20, marginBottom: 4, borderWidth: 1, borderColor: '#E5EBE7', shadowColor: '#00B140', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 1 },
  txIconBox: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  bgGreen: { backgroundColor: '#EAF8F0' },
  bgRed: { backgroundColor: '#FEF2F2' },
  txInfo: { flex: 1, marginLeft: 16 },
  txReason: { fontSize: 16, fontWeight: '800', color: '#122018', marginBottom: 4, letterSpacing: -0.2 },
  txDate: { fontSize: 13, color: '#8B9690', fontWeight: '600' },
  txAmountBox: { alignItems: 'flex-end' },
  txAmount: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  textGreen: { color: '#00B140' },
  textRed: { color: '#DC2626' },
  txBal: { fontSize: 12, color: '#8B9690', fontWeight: '600' },
  
  emptyState: { alignItems: 'center', marginTop: 32 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 24, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5EBE7', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyText: { color: '#122018', fontSize: 18, fontWeight: '700' }
});
