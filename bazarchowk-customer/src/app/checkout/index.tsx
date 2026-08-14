import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
let RazorpayCheckout: any = null;
try { RazorpayCheckout = require('react-native-razorpay').default; } catch (e) {}
import api from '@/services/api';
import { useCartStore } from '@/store/cart.store';
import { useAuthStore } from '@/store/auth.store';

const PRIMARY = '#00B140';

type DeliveryType = 'DELIVERY' | 'SELF_PICKUP';
type PaymentMethodType = 'COD' | 'RAZORPAY' | 'WALLET';

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const { shopId } = useLocalSearchParams();
  const user = useAuthStore(state => state.user);

  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('COD');
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('DELIVERY');
  const [useWallet, setUseWallet] = useState(false);
  const [billDetails, setBillDetails] = useState<any>(null);
  const [fetchingBill, setFetchingBill] = useState(false);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const [shopInfo, setShopInfo] = useState<any>(null);

  const { cart, fetchCart } = useCartStore();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [addrRes, shopRes] = await Promise.all([
        api.get('/addresses'),
        shopId ? api.get(`/shops/${shopId}`) : Promise.resolve({ data: null }),
        fetchCart(),
      ]);
      setAddresses(addrRes.data);
      setShopInfo(shopRes.data);
      const defAddr = addrRes.data.find((a: any) => a.isDefault) || addrRes.data[0];
      if (defAddr) setSelectedAddressId(defAddr.id);
    } catch { console.warn('Failed to fetch checkout data'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (deliveryType === 'SELF_PICKUP') {
      // Self-pickup: no address needed, compute local bill
      const items = cart?.items || [];
      const itemTotal = items.reduce((sum: number, item: any) => sum + (item.productVariant?.price ?? 0) * (item.quantity || 1), 0);
      const taxAmount = Math.round(itemTotal * 0.05 * 100) / 100;
      setBillDetails({ itemTotal, taxAmount, deliveryFee: 0, walletAmountUsed: 0, payableAmount: itemTotal + taxAmount, walletBalance: 0 });
    } else if (selectedAddressId && shopId) {
      fetchBillDetails();
    }
  }, [selectedAddressId, useWallet, shopId, deliveryType]);

  const fetchBillDetails = async () => {
    try {
      setFetchingBill(true);
      setDeliveryError(null);
      const res = await api.post('/orders/checkout-preview', { shopId, deliveryAddressId: selectedAddressId, useWallet });
      setBillDetails(res.data);
      if (res.data.walletBalance > 0 && !useWallet) setUseWallet(true);
      if (res.data.payableAmount === 0 && (useWallet || res.data.walletBalance > 0)) setPaymentMethod('WALLET');
      else if (paymentMethod === 'WALLET') setPaymentMethod('COD');
    } catch (e: any) {
      const msg = e?.response?.data?.message || '';
      if (e?.response?.status === 400 && (msg.includes('out of range') || msg.includes('not available') || msg.includes('not deliver'))) {
        setDeliveryError("This shop doesn't deliver to your selected address. Try Self-Pickup instead.");
      }
      // fallback
      const items = cart?.items || [];
      const itemTotal = items.reduce((sum: number, item: any) => sum + (item.productVariant?.price ?? 0) * (item.quantity || 1), 0);
      const taxAmount = Math.round(itemTotal * 0.05 * 100) / 100;
      setBillDetails({ itemTotal, taxAmount, deliveryFee: 0, walletAmountUsed: 0, payableAmount: itemTotal + taxAmount, walletBalance: 0 });
    } finally { setFetchingBill(false); }
  };

  const handlePlaceOrder = async () => {
    if (deliveryType === 'DELIVERY' && !selectedAddressId) {
      Alert.alert('Error', 'Please select a delivery address'); return;
    }
    if (!shopId) { Alert.alert('Error', 'Missing shop ID'); return; }

    setPlacingOrder(true);
    try {
      const payload: any = {
        shopId,
        paymentMethod,
        useWallet,
        deliveryType,
      };
      if (deliveryType === 'DELIVERY') {
        payload.deliveryAddressId = selectedAddressId;
      }

      const res = await api.post('/orders', payload);
      const orderId = res.data.id;

      if (paymentMethod === 'RAZORPAY') {
        const paymentRes = await api.post('/payments/create', { orderId });
        const { razorpayOrderId, amount } = paymentRes.data;
        try {
          if (!RazorpayCheckout) throw new Error('Razorpay not available');
          const data = await RazorpayCheckout.open({
            key: 'rzp_live_Sr05Li4YOC8ZQo',
            amount,
            name: 'BazarChowk',
            description: 'Order Payment',
            order_id: razorpayOrderId,
            theme: { color: PRIMARY },
            prefill: {
              name: user?.firstName || '',
              email: user?.email || '',
              contact: user?.phone || '',
            }
          });
          await api.post('/payments/verify', {
            razorpayOrderId: data.razorpay_order_id,
            razorpayPaymentId: data.razorpay_payment_id,
            razorpaySignature: data.razorpay_signature
          });
        } catch (error: any) {
          Alert.alert('Payment Failed', error?.description || 'Payment cancelled.');
          router.replace('/(tabs)/orders' as any); return;
        }
      }

      await useCartStore.getState().fetchCart();
      // Navigate to branded receipt
      router.replace(`/receipt/${orderId}` as any);
    } catch (error: any) {
      let msg = error?.response?.data?.message || error?.message || 'Failed to place order';
      if (Array.isArray(msg)) msg = msg.join(', ');
      else if (typeof msg === 'object') msg = JSON.stringify(msg);
      
      Alert.alert('Error', msg);
    } finally { setPlacingOrder(false); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={PRIMARY} /></View>;

  const isSelfPickup = deliveryType === 'SELF_PICKUP';
  const totalToPay = billDetails?.payableAmount ?? 0;
  const canPlaceOrder = isSelfPickup ? true : (!!selectedAddressId && !deliveryError);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── DELIVERY TYPE TOGGLE ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How do you want to receive it?</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, deliveryType === 'DELIVERY' && styles.toggleBtnActive]}
              onPress={() => setDeliveryType('DELIVERY')}
              activeOpacity={0.8}
            >
              <Ionicons name="bicycle" size={22} color={deliveryType === 'DELIVERY' ? '#FFF' : '#64748B'} />
              <Text style={[styles.toggleText, deliveryType === 'DELIVERY' && styles.toggleTextActive]}>Home Delivery</Text>
              <Text style={[styles.toggleSub, deliveryType === 'DELIVERY' && { color: 'rgba(255,255,255,0.8)' }]}>Rider brings to you</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, deliveryType === 'SELF_PICKUP' && styles.toggleBtnActive]}
              onPress={() => setDeliveryType('SELF_PICKUP')}
              activeOpacity={0.8}
            >
              <Ionicons name="bag-handle" size={22} color={deliveryType === 'SELF_PICKUP' ? '#FFF' : '#64748B'} />
              <Text style={[styles.toggleText, deliveryType === 'SELF_PICKUP' && styles.toggleTextActive]}>Self Pickup</Text>
              <Text style={[styles.toggleSub, deliveryType === 'SELF_PICKUP' && { color: 'rgba(255,255,255,0.8)' }]}>FREE · Pick from shop</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── SELF PICKUP INFO BANNER ── */}
        {isSelfPickup && (
          <View style={styles.pickupBanner}>
            <Ionicons name="storefront" size={22} color="#7C3AED" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.pickupTitle}>Pickup from: {shopInfo?.name || 'Shop'}</Text>
              {shopInfo?.address && <Text style={styles.pickupAddr}>{shopInfo.address}</Text>}
              <Text style={styles.pickupHint}>Bring this order ID to the shop counter. The shop will prepare your order.</Text>
            </View>
          </View>
        )}

        {/* ── DELIVERY ADDRESS (only for home delivery) ── */}
        {!isSelfPickup && (
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
            ) : addresses.map(addr => (
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
            ))}
          </View>
        )}

        {/* ── DELIVERY ERROR ── */}
        {deliveryError && !isSelfPickup && (
          <View style={styles.errorCard}>
            <Ionicons name="warning" size={22} color="#EF4444" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.errorTitle}>Out of Delivery Range</Text>
              <Text style={styles.errorDesc}>{deliveryError}</Text>
              <TouchableOpacity onPress={() => setDeliveryType('SELF_PICKUP')} style={styles.switchPickupBtn}>
                <Text style={styles.switchPickupText}>Switch to Self Pickup →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── PAYMENT METHOD ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>

          {/* COD */}
          <TouchableOpacity
            style={[styles.paymentCard, paymentMethod === 'COD' && styles.paymentCardActive]}
            onPress={() => setPaymentMethod('COD')}
          >
            <View style={[styles.payIcon, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="cash" size={20} color={PRIMARY} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.paymentText, paymentMethod === 'COD' && styles.paymentTextActive]}>
                {isSelfPickup ? 'Pay at Shop (Cash)' : 'Cash on Delivery'}
              </Text>
              <Text style={styles.paymentSub}>Pay when you {isSelfPickup ? 'collect' : 'receive'} your order</Text>
            </View>
            <View style={[styles.radio, paymentMethod === 'COD' && styles.radioActive]}>
              {paymentMethod === 'COD' && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>

          {/* Pay Online */}
          <TouchableOpacity
            style={[styles.paymentCard, paymentMethod === 'RAZORPAY' && styles.paymentCardActive]}
            onPress={() => setPaymentMethod('RAZORPAY')}
          >
            <View style={[styles.payIcon, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="card" size={20} color="#3B82F6" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.paymentText, paymentMethod === 'RAZORPAY' && styles.paymentTextActive]}>Pay Online</Text>
              <Text style={styles.paymentSub}>Cards · UPI · Net Banking · EMI</Text>
            </View>
            <View style={[styles.radio, paymentMethod === 'RAZORPAY' && styles.radioActive]}>
              {paymentMethod === 'RAZORPAY' && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>

          {/* Wallet */}
          {billDetails?.walletBalance > 0 && (
            <TouchableOpacity
              style={[styles.paymentCard, useWallet && styles.paymentCardActive]}
              onPress={() => setUseWallet(!useWallet)}
            >
              <View style={[styles.payIcon, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="wallet" size={20} color="#D97706" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.paymentText, useWallet && styles.paymentTextActive]}>BazarChowk Wallet</Text>
                <Text style={styles.paymentSub}>Balance: ₹{billDetails.walletBalance.toFixed(2)}</Text>
              </View>
              <View style={[styles.checkbox, useWallet && styles.checkboxActive]}>
                {useWallet && <Ionicons name="checkmark" size={14} color="#FFF" />}
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* ── BILL DETAILS ── */}
        {billDetails && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bill Details</Text>
            <View style={styles.billCard}>
              <BillRow label="Item Total" value={`₹${(billDetails.itemTotal ?? 0).toFixed(2)}`} />
              <BillRow label="Taxes & Charges" value={`₹${(billDetails.taxAmount ?? 0).toFixed(2)}`} />
              <BillRow
                label={isSelfPickup ? 'Delivery Fee' : 'Delivery Fee'}
                value={isSelfPickup ? '₹0.00 FREE 🎉' : `₹${(billDetails.deliveryFee ?? 0).toFixed(2)}`}
                valueColor={isSelfPickup ? PRIMARY : undefined}
              />
              {(billDetails.walletAmountUsed ?? 0) > 0 && (
                <BillRow label="Wallet Applied" value={`-₹${billDetails.walletAmountUsed.toFixed(2)}`} valueColor={PRIMARY} />
              )}
              <View style={styles.totalDivider} />
              <BillRow label="Total to Pay" value={`₹${totalToPay.toFixed(2)}`} isTotal />
            </View>
          </View>
        )}

      </ScrollView>

      {/* ── BOTTOM BAR ── */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom || 24 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bottomLabel}>{isSelfPickup ? '🏪 Self Pickup · FREE delivery' : '🛵 Home Delivery'}</Text>
          {fetchingBill ? (
            <ActivityIndicator size="small" color={PRIMARY} style={{ alignSelf: 'flex-start' }} />
          ) : (
            <Text style={styles.bottomTotal}>₹{totalToPay.toFixed(2)}</Text>
          )}
        </View>
        <TouchableOpacity
          style={[styles.placeBtn, (!canPlaceOrder || placingOrder) && { opacity: 0.6 }]}
          disabled={!canPlaceOrder || placingOrder}
          onPress={handlePlaceOrder}
        >
          {placingOrder ? <ActivityIndicator color="#FFF" /> : <Text style={styles.placeBtnText}>Place Order</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function BillRow({ label, value, valueColor, isTotal }: { label: string; value: string; valueColor?: string; isTotal?: boolean }) {
  return (
    <View style={[styles.billRow, isTotal && { marginTop: 4 }]}>
      <Text style={[styles.billLabel, isTotal && styles.billLabelTotal]}>{label}</Text>
      <Text style={[styles.billValue, isTotal && styles.billValueTotal, valueColor ? { color: valueColor } : {}]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E2E8F0' },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800', color: '#0F172A' },
  scroll: { padding: 20, paddingBottom: 120, gap: 20 },
  section: {},
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
  addText: { fontSize: 14, fontWeight: '700', color: PRIMARY },

  // Delivery type toggle
  toggleRow: { flexDirection: 'row', gap: 12 },
  toggleBtn: { flex: 1, backgroundColor: '#FFF', borderRadius: 18, padding: 16, alignItems: 'center', gap: 6, borderWidth: 2, borderColor: '#E2E8F0' },
  toggleBtnActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  toggleText: { fontSize: 14, fontWeight: '800', color: '#334155', textAlign: 'center' },
  toggleTextActive: { color: '#FFF' },
  toggleSub: { fontSize: 11, color: '#94A3B8', textAlign: 'center', fontWeight: '500' },

  // Self pickup banner
  pickupBanner: { flexDirection: 'row', backgroundColor: '#F5F3FF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#DDD6FE' },
  pickupTitle: { fontSize: 15, fontWeight: '800', color: '#5B21B6', marginBottom: 4 },
  pickupAddr: { fontSize: 13, color: '#6D28D9', marginBottom: 4 },
  pickupHint: { fontSize: 12, color: '#7C3AED', lineHeight: 18 },

  // Address
  emptyCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed' },
  emptyText: { color: '#64748B', textAlign: 'center' },
  addressCard: { flexDirection: 'row', backgroundColor: '#FFF', padding: 16, borderRadius: 16, borderWidth: 1.5, borderColor: '#E2E8F0', marginBottom: 10 },
  addressCardActive: { borderColor: PRIMARY, backgroundColor: '#F0FDF4' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  radioActive: { borderColor: PRIMARY },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: PRIMARY },
  addressInfo: { flex: 1, marginLeft: 12 },
  addressType: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  addressFull: { fontSize: 14, color: '#0F172A', marginTop: 4, lineHeight: 20 },

  // Error
  errorCard: { flexDirection: 'row', backgroundColor: '#FEF2F2', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#FECACA' },
  errorTitle: { fontSize: 14, fontWeight: '800', color: '#991B1B', marginBottom: 4 },
  errorDesc: { fontSize: 13, color: '#B91C1C', lineHeight: 18 },
  switchPickupBtn: { marginTop: 8, alignSelf: 'flex-start', backgroundColor: '#FEE2E2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  switchPickupText: { color: '#DC2626', fontWeight: '700', fontSize: 13 },

  // Payment
  paymentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 16, borderWidth: 1.5, borderColor: '#E2E8F0', marginBottom: 10 },
  paymentCardActive: { borderColor: PRIMARY, backgroundColor: '#F0FDF4' },
  payIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  paymentText: { fontSize: 15, fontWeight: '700', color: '#334155' },
  paymentTextActive: { color: '#0F172A', fontWeight: '800' },
  paymentSub: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { borderColor: PRIMARY, backgroundColor: PRIMARY },

  // Bill
  billCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  billLabel: { fontSize: 14, color: '#64748B', fontWeight: '500' },
  billValue: { fontSize: 14, color: '#0F172A', fontWeight: '600' },
  billLabelTotal: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  billValueTotal: { fontSize: 18, fontWeight: '900', color: PRIMARY },
  totalDivider: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 12 },

  // Bottom bar
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingHorizontal: 20, paddingTop: 16, flexDirection: 'row', alignItems: 'center', gap: 16, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 10 },
  bottomLabel: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  bottomTotal: { fontSize: 20, fontWeight: '900', color: '#0F172A' },
  placeBtn: { flex: 1, backgroundColor: PRIMARY, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 },
  placeBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
});
