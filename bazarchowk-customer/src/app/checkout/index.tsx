import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
let RazorpayCheckout: any = null;
try {
  RazorpayCheckout = require('react-native-razorpay').default;
} catch (e) {
  console.log('Razorpay not available in Expo Go');
}
import api from '@/services/api';
import { useCartStore } from '@/store/cart.store';

const PRIMARY = '#00B140';

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const { shopId } = useLocalSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'UPI' | 'RAZORPAY' | 'WALLET'>('COD');
  const [useWallet, setUseWallet] = useState(false);
  const [billDetails, setBillDetails] = useState<any>(null);
  const [fetchingBill, setFetchingBill] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Load cart and addresses in parallel
      const [addrRes] = await Promise.all([
        api.get('/addresses'),
        fetchCart(), // ensure cart is populated for fallback
      ]);
      setAddresses(addrRes.data);
      
      const defAddr = addrRes.data.find((a: any) => a.isDefault);
      if (defAddr) {
        setSelectedAddressId(defAddr.id);
      } else if (addrRes.data.length > 0) {
        setSelectedAddressId(addrRes.data[0].id);
      }
    } catch (error) {
      console.warn('Failed to fetch checkout data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedAddressId && shopId) {
      fetchBillDetails();
    }
  }, [selectedAddressId, useWallet, shopId]);

  const { cart, fetchCart } = useCartStore();

  const fetchBillDetails = async () => {
    try {
      setFetchingBill(true);
      const res = await api.post('/orders/checkout-preview', {
        shopId,
        deliveryAddressId: selectedAddressId,
        useWallet
      });
      setBillDetails(res.data);
      if (res.data.walletBalance > 0 && !useWallet) {
        setUseWallet(true); // Auto-apply wallet if balance exists
      }
      if (res.data.payableAmount === 0 && (useWallet || res.data.walletBalance > 0)) {
        setPaymentMethod('WALLET');
      } else if (paymentMethod === 'WALLET') {
        setPaymentMethod('COD'); // Fallback if wallet doesn't cover full amount
      }
    } catch (e: any) {
      const status = e?.response?.status;
      console.warn('Failed to fetch bill details', e);
      // Graceful fallback: compute total from local cart store (correct field path: item.productVariant.price)
      const shopItems = (cart?.items || []);
      const itemTotal = shopItems.reduce((sum: number, item: any) => {
        // Backend cart item shape: { productVariant: { price: number }, quantity: number }
        const price = item.productVariant?.price 
          ?? item.price 
          ?? item.variant?.price 
          ?? 0;
        return sum + price * (item.quantity || 1);
      }, 0);
      setBillDetails({
        itemTotal,
        taxAmount: Math.round(itemTotal * 0.05 * 100) / 100, // 5% tax estimate
        deliveryFee: 20, // default delivery fee
        walletAmountUsed: 0,
        payableAmount: itemTotal + Math.round(itemTotal * 0.05 * 100) / 100 + 20,
        walletBalance: 0,
      });
    } finally {
      setFetchingBill(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      Alert.alert('Error', 'Please select a delivery address');
      return;
    }
    if (!shopId) {
      Alert.alert('Error', 'Missing shop ID');
      return;
    }
    setPlacingOrder(true);
    try {
      const res = await api.post('/orders', {
        shopId,
        deliveryAddressId: selectedAddressId,
        paymentMethod,
        useWallet
      });

      const orderId = res.data.id;

      if (paymentMethod === 'RAZORPAY') {
        // 1. Generate Razorpay Order
        const paymentRes = await api.post('/payments/create', { orderId });
        const { razorpayOrderId, amount } = paymentRes.data;

        // 2. Open Native Razorpay Checkout
        try {
          if (!RazorpayCheckout) {
            throw new Error('Razorpay is not available on web or in this environment.');
          }
          const data = await RazorpayCheckout.open({
            key: 'rzp_live_Sr05Li4YOC8ZQo', // Use your public key
            amount: amount,
            name: 'BazarChowk',
            description: 'Order Payment',
            image: 'https://bazarchowk.com/logo.png', // Add your hosted logo
            order_id: razorpayOrderId,
            theme: { color: '#00B140' }
          });
          
          // Verify on backend
          await api.post('/payments/verify', {
            razorpayOrderId: data.razorpay_order_id,
            razorpayPaymentId: data.razorpay_payment_id,
            razorpaySignature: data.razorpay_signature
          });
        } catch (error: any) {
          const errorMsg = error?.description || error?.response?.data?.message || error?.message || 'Payment cancelled or failed';
          Alert.alert('Payment Failed', typeof errorMsg === 'string' ? errorMsg : 'Payment failed or cancelled.');
          // You could redirect them to orders here so they can retry later.
          router.replace('/(tabs)/orders' as any);
          return;
        }
      }

      // Clear the local cart
      await useCartStore.getState().fetchCart();
      Alert.alert('Success', paymentMethod === 'RAZORPAY' ? 'Checkout completed. Check orders for status.' : `Order Placed Successfully! ID: ${res.data.orderNumber}`);
      router.replace('/(tabs)/orders' as any); // Assume orders tab exists
    } catch (error: any) {
      const globalErrorMsg = error?.response?.data?.message || error?.message || 'Failed to place order';
      Alert.alert('Error', typeof globalErrorMsg === 'string' ? globalErrorMsg : 'Failed to place order');
    } finally {
      setPlacingOrder(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        
        {/* Delivery Address */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Delivery Address</Text>
            <TouchableOpacity onPress={() => router.push('/addresses/new' as any)}>
              <Text style={styles.addText}>+ Add New</Text>
            </TouchableOpacity>
          </View>
          
          {addresses.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No addresses found. Add one to continue.</Text>
            </View>
          ) : (
            addresses.map(addr => (
              <TouchableOpacity 
                key={addr.id} 
                style={[styles.addressCard, selectedAddressId === addr.id && styles.addressCardActive]}
                onPress={() => setSelectedAddressId(addr.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.radio, selectedAddressId === addr.id && styles.radioActive]}>
                  {selectedAddressId === addr.id && <View style={styles.radioInner} />}
                </View>
                <View style={styles.addressInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name={addr.type === 'HOME' ? 'home' : 'briefcase'} size={14} color="#64748B" />
                    <Text style={styles.addressType}>{addr.type}</Text>
                  </View>
                  <Text style={styles.addressFull} numberOfLines={2}>
                    {addr.houseFlat}, {addr.street}, {addr.city}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          
          <TouchableOpacity 
            style={[styles.paymentCard, paymentMethod === 'COD' && styles.paymentCardActive]}
            onPress={() => setPaymentMethod('COD')}
          >
            <Ionicons name="cash-outline" size={24} color={paymentMethod === 'COD' ? PRIMARY : '#64748B'} />
            <Text style={[styles.paymentText, paymentMethod === 'COD' && styles.paymentTextActive]}>Cash on Delivery</Text>
            <View style={[styles.radio, paymentMethod === 'COD' && styles.radioActive]}>
              {paymentMethod === 'COD' && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>

          {billDetails?.walletBalance > 0 && (
            <TouchableOpacity 
              style={[styles.paymentCard, useWallet && styles.paymentCardActive]}
              onPress={() => setUseWallet(!useWallet)}
            >
              <Ionicons name="wallet-outline" size={24} color={useWallet ? PRIMARY : '#64748B'} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.paymentText, useWallet && styles.paymentTextActive, { marginLeft: 0 }]}>Use BazarChowk Wallet</Text>
                <Text style={{ fontSize: 12, color: PRIMARY, fontWeight: '600' }}>Balance: ₹{billDetails.walletBalance.toFixed(2)}</Text>
              </View>
              <View style={[styles.checkbox, useWallet && styles.checkboxActive]}>
                {useWallet && <Ionicons name="checkmark" size={14} color="#FFF" />}
              </View>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={[styles.paymentCard, paymentMethod === 'RAZORPAY' && styles.paymentCardActive]}
            onPress={() => setPaymentMethod('RAZORPAY')}
          >
            <Ionicons name="card-outline" size={24} color={paymentMethod === 'RAZORPAY' ? PRIMARY : '#64748B'} />
            <Text style={[styles.paymentText, paymentMethod === 'RAZORPAY' && styles.paymentTextActive]}>Pay Online (Cards/UPI/NetBanking)</Text>
            <View style={[styles.radio, paymentMethod === 'RAZORPAY' && styles.radioActive]}>
              {paymentMethod === 'RAZORPAY' && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>
        </View>

        {/* Bill Details */}
        {billDetails && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bill Details</Text>
            <View style={styles.billCard}>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Item Total</Text>
                <Text style={styles.billValue}>₹{(billDetails.itemTotal ?? 0).toFixed(2)}</Text>
              </View>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Taxes & Charges</Text>
                <Text style={styles.billValue}>₹{(billDetails.taxAmount ?? 0).toFixed(2)}</Text>
              </View>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Delivery Fee</Text>
                <Text style={styles.billValue}>₹{(billDetails.deliveryFee ?? 0).toFixed(2)}</Text>
              </View>
              {(billDetails.walletAmountUsed ?? 0) > 0 && (
                <View style={styles.billRow}>
                  <Text style={[styles.billLabel, { color: PRIMARY }]}>Wallet Applied</Text>
                  <Text style={[styles.billValue, { color: PRIMARY }]}>-₹{(billDetails.walletAmountUsed ?? 0).toFixed(2)}</Text>
                </View>
              )}
              <View style={[styles.billRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>To Pay</Text>
                <Text style={styles.totalValue}>₹{(billDetails.payableAmount ?? 0).toFixed(2)}</Text>
              </View>
            </View>
          </View>
        )}

      </ScrollView>

      {/* Action Bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom || 24 }]}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600' }}>{paymentMethod}</Text>
          {fetchingBill ? (
            <ActivityIndicator size="small" color={PRIMARY} style={{ alignSelf: 'flex-start' }} />
          ) : (
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#0F172A' }}>
              ₹{billDetails ? (billDetails.payableAmount ?? 0).toFixed(2) : '--'}
            </Text>
          )}
        </View>
        <TouchableOpacity 
          style={[styles.placeOrderBtn, (!selectedAddressId || placingOrder) && { opacity: 0.5 }]} 
          disabled={!selectedAddressId || placingOrder}
          onPress={handlePlaceOrder}
        >
          {placingOrder ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.placeOrderText}>Place Order</Text>
          )}
        </TouchableOpacity>
      </View>
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
  
  section: {},
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  addText: { fontSize: 14, fontWeight: '700', color: PRIMARY },
  
  emptyCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed' },
  emptyText: { color: '#64748B', textAlign: 'center' },

  addressCard: { flexDirection: 'row', backgroundColor: '#FFF', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 12 },
  addressCardActive: { borderColor: PRIMARY, backgroundColor: '#F3FAF5' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  radioActive: { borderColor: PRIMARY },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: PRIMARY },
  addressInfo: { flex: 1, marginLeft: 12 },
  addressType: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  addressFull: { fontSize: 14, color: '#0F172A', marginTop: 4, lineHeight: 20 },

  paymentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 12 },
  paymentCardActive: { borderColor: PRIMARY, backgroundColor: '#F3FAF5' },
  paymentText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#64748B', marginLeft: 12 },
  paymentTextActive: { color: '#0F172A', fontWeight: '700' },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F1F5F9',
    paddingHorizontal: 20, paddingTop: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 10,
  },
  placeOrderBtn: { flex: 1, backgroundColor: PRIMARY, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  placeOrderText: { color: '#FFF', fontSize: 16, fontWeight: '800' },

  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { borderColor: PRIMARY, backgroundColor: PRIMARY },

  billCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9', marginTop: 8 },
  billTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 16 },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  billLabel: { fontSize: 14, color: '#64748B', fontWeight: '500' },
  billValue: { fontSize: 14, color: '#0F172A', fontWeight: '600' },
  totalRow: { marginTop: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9', marginBottom: 0 },
  totalLabel: { fontSize: 16, color: '#0F172A', fontWeight: '800' },
  totalValue: { fontSize: 18, color: PRIMARY, fontWeight: '800' },
});
