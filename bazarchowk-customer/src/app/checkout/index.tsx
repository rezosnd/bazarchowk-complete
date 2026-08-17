import { Text as AppText } from '@/components/TranslatedText';
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
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { Header } from '@/components/Header';
import { PressableScale } from '@/components/PressableScale';

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
      const taxAmount = 0; // Tax removed by admin request
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
      const taxAmount = 0; // Tax removed by admin request
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
      if (deliveryType === 'DELIVERY' && selectedAddressId) {
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
          try {
            await api.patch(`/orders/${orderId}/status`, { status: 'CANCELLED', notes: 'Payment cancelled or failed' });
          } catch (e) {}
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
    <View style={styles.root}>
      <Header title="Checkout" showBack={true} />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, 24) + 100 }]} showsVerticalScrollIndicator={false}>

        {/* ── DELIVERY TYPE TOGGLE ── */}
        <Animated.View entering={FadeInDown.springify().damping(15)} style={styles.section}>
          <AppText style={styles.sectionTitle}>How do you want to receive it?</AppText>
          <View style={styles.toggleRow}>
            <PressableScale
              style={[styles.toggleBtn, deliveryType === 'DELIVERY' && styles.toggleBtnActive]}
              onPress={() => setDeliveryType('DELIVERY')}
            >
              <Ionicons name="bicycle" size={24} color={deliveryType === 'DELIVERY' ? '#FFF' : '#66736B'} />
              <AppText style={[styles.toggleText, deliveryType === 'DELIVERY' && styles.toggleTextActive]}>Home Delivery</AppText>
              <AppText style={[styles.toggleSub, deliveryType === 'DELIVERY' && { color: 'rgba(255,255,255,0.85)' }]}>Rider brings to you</AppText>
            </PressableScale>
            <PressableScale
              style={[styles.toggleBtn, deliveryType === 'SELF_PICKUP' && styles.toggleBtnActive]}
              onPress={() => setDeliveryType('SELF_PICKUP')}
            >
              <Ionicons name="bag-handle" size={24} color={deliveryType === 'SELF_PICKUP' ? '#FFF' : '#66736B'} />
              <AppText style={[styles.toggleText, deliveryType === 'SELF_PICKUP' && styles.toggleTextActive]}>Self Pickup</AppText>
              <AppText style={[styles.toggleSub, deliveryType === 'SELF_PICKUP' && { color: 'rgba(255,255,255,0.85)' }]}>FREE · Pick from shop</AppText>
            </PressableScale>
          </View>
        </Animated.View>

        {/* ── SELF PICKUP INFO BANNER ── */}
        {isSelfPickup && (
          <Animated.View entering={FadeInUp.springify().damping(15)} style={styles.pickupBanner}>
            <View style={styles.pickupIconWrap}>
              <Ionicons name="storefront" size={24} color="#D97706" />
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <AppText style={styles.pickupTitle}>Pickup from: {shopInfo?.name || 'Shop'}</AppText>
              {shopInfo?.address && <AppText style={styles.pickupAddr}>{shopInfo.address}</AppText>}
              <AppText style={styles.pickupHint}>Bring your order ID to the counter.</AppText>
            </View>
          </Animated.View>
        )}

        {/* ── DELIVERY ADDRESS ── */}
        {!isSelfPickup && (
          <Animated.View entering={FadeInUp.springify().damping(15)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <AppText style={styles.sectionTitle}>Delivery Address</AppText>
              <PressableScale onPress={() => router.push('/addresses/new' as any)}>
                <AppText style={styles.addText}>+ Add New</AppText>
              </PressableScale>
            </View>
            {addresses.length === 0 ? (
              <View style={styles.emptyCard}>
                <AppText style={styles.emptyText}>No addresses found. Add one to continue.</AppText>
              </View>
            ) : addresses.map(addr => (
              <PressableScale
                key={addr.id}
                style={[styles.addressCard, selectedAddressId === addr.id && styles.addressCardActive]}
                onPress={() => setSelectedAddressId(addr.id)}
                scaleTo={0.98}
              >
                <View style={[styles.radio, selectedAddressId === addr.id && styles.radioActive]}>
                  {selectedAddressId === addr.id && <View style={styles.radioInner} />}
                </View>
                <View style={styles.addressInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name={addr.type === 'HOME' ? 'home' : 'briefcase'} size={14} color="#66736B" />
                    <AppText style={styles.addressType}>{addr.type}</AppText>
                  </View>
                  <AppText style={styles.addressFull} numberOfLines={2}>
                    {addr.houseFlat}, {addr.street}, {addr.city}
                  </AppText>
                </View>
              </PressableScale>
            ))}
          </Animated.View>
        )}

        {/* ── DELIVERY ERROR ── */}
        {deliveryError && !isSelfPickup && (
          <Animated.View entering={FadeInDown.springify()} style={styles.errorCard}>
            <Ionicons name="warning" size={24} color="#DC2626" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <AppText style={styles.errorTitle}>Out of Delivery Range</AppText>
              <AppText style={styles.errorDesc}>{deliveryError}</AppText>
              <PressableScale onPress={() => setDeliveryType('SELF_PICKUP')} style={styles.switchPickupBtn}>
                <AppText style={styles.switchPickupText}>Switch to Self Pickup →</AppText>
              </PressableScale>
            </View>
          </Animated.View>
        )}

        {/* ── PAYMENT METHOD ── */}
        <Animated.View entering={FadeInDown.delay(100).springify().damping(15)} style={styles.section}>
          <AppText style={styles.sectionTitle}>Payment Method</AppText>

          <PressableScale
            style={[styles.paymentCard, paymentMethod === 'COD' && styles.paymentCardActive]}
            onPress={() => setPaymentMethod('COD')}
            scaleTo={0.98}
          >
            <View style={[styles.payIcon, { backgroundColor: '#EAF8F0' }]}>
              <Ionicons name="cash" size={24} color={PRIMARY} />
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <AppText style={[styles.paymentText, paymentMethod === 'COD' && styles.paymentTextActive]}>
                {isSelfPickup ? 'Pay at Shop' : 'Cash on Delivery'}
              </AppText>
              <AppText style={styles.paymentSub}>Pay when you {isSelfPickup ? 'collect' : 'receive'} order</AppText>
            </View>
            <View style={[styles.radio, paymentMethod === 'COD' && styles.radioActive]}>
              {paymentMethod === 'COD' && <View style={styles.radioInner} />}
            </View>
          </PressableScale>

          <PressableScale
            style={[styles.paymentCard, paymentMethod === 'RAZORPAY' && styles.paymentCardActive]}
            onPress={() => setPaymentMethod('RAZORPAY')}
            scaleTo={0.98}
          >
            <View style={[styles.payIcon, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="card" size={24} color="#4F46E5" />
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <AppText style={[styles.paymentText, paymentMethod === 'RAZORPAY' && styles.paymentTextActive]}>Pay Online</AppText>
              <AppText style={styles.paymentSub}>Cards · UPI · Net Banking</AppText>
            </View>
            <View style={[styles.radio, paymentMethod === 'RAZORPAY' && styles.radioActive]}>
              {paymentMethod === 'RAZORPAY' && <View style={styles.radioInner} />}
            </View>
          </PressableScale>

          {billDetails?.walletBalance > 0 && (
            <PressableScale
              style={[styles.paymentCard, useWallet && styles.paymentCardActive]}
              onPress={() => setUseWallet(!useWallet)}
              scaleTo={0.98}
            >
              <View style={[styles.payIcon, { backgroundColor: '#FFF4E6' }]}>
                <Ionicons name="wallet" size={24} color="#FF8A00" />
              </View>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <AppText style={[styles.paymentText, useWallet && styles.paymentTextActive]}>BazarChowk Wallet</AppText>
                <AppText style={styles.paymentSub}>Balance: ₹{billDetails.walletBalance.toFixed(2)}</AppText>
              </View>
              <View style={[styles.checkbox, useWallet && styles.checkboxActive]}>
                {useWallet && <Ionicons name="checkmark" size={16} color="#FFF" />}
              </View>
            </PressableScale>
          )}
        </Animated.View>

        {/* ── BILL DETAILS ── */}
        {billDetails && (
          <Animated.View entering={FadeInDown.delay(200).springify().damping(15)} style={styles.section}>
            <AppText style={styles.sectionTitle}>Bill Details</AppText>
            <View style={styles.billCard}>
              <BillRow label="Item Total" value={`₹${(billDetails.itemTotal ?? 0).toFixed(2)}`} />
              {(billDetails.platformFee ?? 0) > 0 && (
                <BillRow label="Platform Fee" value={`₹${(billDetails.platformFee ?? 0).toFixed(2)}`} />
              )}
              <BillRow label="Taxes (GST)" value={`₹${(billDetails.taxAmount ?? 0).toFixed(2)}`} />
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
          </Animated.View>
        )}

      </ScrollView>

      {/* ── BOTTOM BAR ── */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={{ flex: 1 }}>
          <AppText style={styles.bottomLabel}>{isSelfPickup ? 'Self Pickup · FREE delivery' : 'Home Delivery'}</AppText>
          {fetchingBill ? (
            <ActivityIndicator size="small" color={PRIMARY} style={{ alignSelf: 'flex-start', marginTop: 4 }} />
          ) : (
            <AppText style={styles.bottomTotal}>₹{totalToPay.toFixed(2)}</AppText>
          )}
        </View>
        <PressableScale
          style={[styles.placeBtn, (!canPlaceOrder || placingOrder) && { opacity: 0.6 }]}
          disabled={!canPlaceOrder || placingOrder}
          onPress={handlePlaceOrder}
        >
          {placingOrder ? <ActivityIndicator color="#FFF" /> : <AppText style={styles.placeBtnText}>Place Order</AppText>}
        </PressableScale>
      </View>
    </View>
  );
}

function BillRow({ label, value, valueColor, isTotal }: { label: string; value: string; valueColor?: string; isTotal?: boolean }) {
  return (
    <View style={[styles.billRow, isTotal && { marginTop: 4 }]}>
      <AppText style={[styles.billLabel, isTotal && styles.billLabelTotal]}>{label}</AppText>
      <AppText style={[styles.billValue, isTotal && styles.billValueTotal, valueColor ? { color: valueColor } : {}]}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7FBF8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, paddingBottom: 130, gap: 24 },
  section: {},
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#122018', marginBottom: 12, letterSpacing: -0.2 },
  addText: { fontSize: 14, fontWeight: '800', color: PRIMARY },

  toggleRow: { flexDirection: 'row', gap: 12 },
  toggleBtn: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 16, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#E5EBE7', shadowColor: '#00B140', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 12, elevation: 2 },
  toggleBtnActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  toggleText: { fontSize: 15, fontWeight: '800', color: '#122018', textAlign: 'center' },
  toggleTextActive: { color: '#FFFFFF' },
  toggleSub: { fontSize: 12, color: '#66736B', textAlign: 'center', fontWeight: '600' },

  pickupBanner: { flexDirection: 'row', backgroundColor: '#FFF7ED', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#FFEDD5', alignItems: 'center' },
  pickupIconWrap: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#FFEDD5', alignItems: 'center', justifyContent: 'center' },
  pickupTitle: { fontSize: 16, fontWeight: '800', color: '#B45309', marginBottom: 4 },
  pickupAddr: { fontSize: 14, color: '#92400E', marginBottom: 6, fontWeight: '500' },
  pickupHint: { fontSize: 13, color: '#D97706', lineHeight: 20 },

  emptyCard: { backgroundColor: '#FFFFFF', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: '#E5EBE7', borderStyle: 'dashed' },
  emptyText: { color: '#66736B', textAlign: 'center', fontWeight: '500' },
  
  addressCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#E5EBE7', marginBottom: 12, shadowColor: '#00B140', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 12, elevation: 1 },
  addressCardActive: { borderColor: PRIMARY, backgroundColor: '#EAF8F0', borderWidth: 1.5 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#8B9690', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  radioActive: { borderColor: PRIMARY },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: PRIMARY },
  addressInfo: { flex: 1, marginLeft: 16 },
  addressType: { fontSize: 14, fontWeight: '800', color: '#66736B' },
  addressFull: { fontSize: 15, color: '#122018', marginTop: 6, lineHeight: 22, fontWeight: '500' },

  errorCard: { flexDirection: 'row', backgroundColor: '#FEF2F2', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#FEE2E2', alignItems: 'center' },
  errorTitle: { fontSize: 16, fontWeight: '800', color: '#991B1B', marginBottom: 4 },
  errorDesc: { fontSize: 14, color: '#B91C1C', lineHeight: 22, fontWeight: '500' },
  switchPickupBtn: { marginTop: 12, alignSelf: 'flex-start', backgroundColor: '#FEE2E2', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  switchPickupText: { color: '#DC2626', fontWeight: '800', fontSize: 14 },

  paymentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#E5EBE7', marginBottom: 12, shadowColor: '#00B140', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 12, elevation: 1 },
  paymentCardActive: { borderColor: PRIMARY, backgroundColor: '#EAF8F0', borderWidth: 1.5 },
  payIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  paymentText: { fontSize: 16, fontWeight: '800', color: '#122018' },
  paymentTextActive: { color: '#00B140' },
  paymentSub: { fontSize: 14, color: '#66736B', marginTop: 4, fontWeight: '500' },
  checkbox: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: '#8B9690', alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { borderColor: PRIMARY, backgroundColor: PRIMARY },

  billCard: { backgroundColor: '#FFFFFF', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: '#E5EBE7', shadowColor: '#00B140', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 12, elevation: 1 },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  billLabel: { fontSize: 15, color: '#66736B', fontWeight: '500' },
  billValue: { fontSize: 15, color: '#122018', fontWeight: '700' },
  billLabelTotal: { fontSize: 18, fontWeight: '800', color: '#122018' },
  billValueTotal: { fontSize: 20, fontWeight: '900', color: PRIMARY },
  totalDivider: { height: 1, backgroundColor: '#F0F5F2', marginVertical: 4, marginBottom: 16 },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5EBE7', paddingHorizontal: 20, paddingTop: 16, flexDirection: 'row', alignItems: 'center', gap: 16, shadowColor: '#00B140', shadowOffset: { width: 0, height: -12 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 12 },
  bottomLabel: { fontSize: 14, color: '#66736B', fontWeight: '600' },
  bottomTotal: { fontSize: 24, fontWeight: '900', color: '#122018', marginTop: 2, letterSpacing: -0.5 },
  placeBtn: { flex: 1, backgroundColor: PRIMARY, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  placeBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
