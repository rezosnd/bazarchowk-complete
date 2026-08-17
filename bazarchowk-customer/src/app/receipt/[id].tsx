import { Text as AppText } from '@/components/TranslatedText';
import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Share, Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import api from '@/services/api';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { PressableScale } from '@/components/PressableScale';
import { Header } from '@/components/Header';

const PRIMARY = '#00B140';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  PLACED:           { label: 'Order Placed',       color: '#00B140', bg: '#EAF8F0', icon: 'checkmark-circle' },
  ACCEPTED:         { label: 'Accepted by Shop',   color: '#00B140', bg: '#EAF8F0', icon: 'storefront'       },
  PREPARING:        { label: 'Preparing',          color: '#FF8A00', bg: '#FFF4E6', icon: 'fast-food'        },
  READY:            { label: 'Ready',              color: '#00B140', bg: '#EAF8F0', icon: 'bag-check'        },
  READY_FOR_PICKUP: { label: 'Ready for Pickup',  color: '#00B140', bg: '#EAF8F0', icon: 'bag-handle'       },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery',  color: '#008F3C', bg: '#EAF8F0', icon: 'bicycle'          },
  DELIVERED:        { label: 'Delivered ✓',        color: '#00B140', bg: '#EAF8F0', icon: 'checkmark-circle' },
  CANCELLED:        { label: 'Cancelled',          color: '#DC2626', bg: '#FEE2E2', icon: 'close-circle'    },
};

export default function ReceiptScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchOrder(); }, [id]);

  const fetchOrder = async () => {
    try {
      const { data } = await api.get(`/orders/${id}`);
      setOrder(data);
    } catch { Alert.alert('Error', 'Could not load receipt'); router.back(); }
    finally { setLoading(false); }
  };

  const handleShare = async () => {
    if (!order) return;
    const lines = [
      `🧾 BazarChowk Receipt`,
      `Order: #${order.orderNumber}`,
      `Shop: ${order.shop?.name}`,
      ``,
      ...(order.items || []).map((item: any) =>
        `• ${item.productVariant?.product?.name || item.productVariant?.name} x${item.quantity}  ₹${(item.priceAtTime * item.quantity).toFixed(2)}`
      ),
      ``,
      `Item Total:   ₹${(order.subtotal ?? 0).toFixed(2)}`,
      `Tax:          ₹${(order.taxAmount ?? 0).toFixed(2)}`,
      `Delivery:     ₹${(order.deliveryFee ?? 0).toFixed(2)}`,
      `Total Paid:   ₹${(order.totalAmount ?? 0).toFixed(2)}`,
      ``,
      `Payment: ${order.paymentMethod}  |  Status: ${order.paymentStatus}`,
      `Placed on: ${new Date(order.createdAt).toLocaleString()}`,
    ];
    await Share.share({ message: lines.join('\n'), title: `Receipt #${order.orderNumber}` });
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={PRIMARY} /></View>;
  if (!order)  return <View style={s.center}><AppText style={s.errText}>Order not found</AppText></View>;

  const isSelfPickup = !order.deliveryAddressId;
  const statusInfo = STATUS_MAP[order.status] || { label: order.status, color: '#66736B', bg: '#EAF8F0', icon: 'information-circle' };
  const date = new Date(order.createdAt);

  return (
    <View style={[s.container]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 14 }]}>
        <PressableScale onPress={() => router.replace('/(tabs)/orders' as any)} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#122018" />
        </PressableScale>
        <AppText style={s.headerTitle}>Receipt</AppText>
        <PressableScale onPress={handleShare} style={s.shareBtn}>
          <Ionicons name="share-outline" size={24} color={PRIMARY} />
        </PressableScale>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── SUCCESS BANNER ── */}
        <Animated.View entering={FadeInDown.springify().damping(15)} style={[s.successBanner, { backgroundColor: statusInfo.bg }]}>
          <View style={[s.successIcon, { backgroundColor: statusInfo.color }]}>
            <Ionicons name={statusInfo.icon as any} size={32} color="#FFF" />
          </View>
          <AppText style={[s.successStatus, { color: statusInfo.color }]}>{statusInfo.label}</AppText>
          <AppText style={s.successOrderNum}>#{order.orderNumber}</AppText>
          <AppText style={s.successDate}>{date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}  ·  {date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</AppText>
        </Animated.View>

        {/* ── DELIVERY TYPE BADGE ── */}
        <Animated.View entering={FadeInDown.delay(50).springify().damping(15)} style={[s.deliveryBadge, { backgroundColor: isSelfPickup ? '#F5F3FF' : '#F0FDF4', borderColor: isSelfPickup ? '#DDD6FE' : '#BBF7D0' }]}>
          <Ionicons name={isSelfPickup ? 'bag-handle' : 'bicycle'} size={20} color={isSelfPickup ? '#7C3AED' : PRIMARY} />
          <AppText style={[s.deliveryBadgeText, { color: isSelfPickup ? '#7C3AED' : PRIMARY }]}>
            {isSelfPickup ? 'Self Pickup · Collect from shop' : `Home Delivery · ${order.deliveryAddress?.city || 'Your address'}`}
          </AppText>
        </Animated.View>

        {/* ── SHOP CARD ── */}
        <Animated.View entering={FadeInDown.delay(100).springify().damping(15)} style={s.card}>
          <View style={s.shopRow}>
            <View style={s.shopIconWrap}>
              <Ionicons name="storefront" size={24} color={PRIMARY} />
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <AppText style={s.shopName}>{order.shop?.name}</AppText>
              {order.shop?.address && <AppText style={s.shopAddr} numberOfLines={1}>{order.shop.address}</AppText>}
            </View>
            <PressableScale
              style={s.trackBtn}
              onPress={() => router.push(`/order/${order.id}` as any)}
            >
              <AppText style={s.trackBtnText}>Track</AppText>
            </PressableScale>
          </View>
        </Animated.View>

        {/* ── ORDER ITEMS ── */}
        <Animated.View entering={FadeInDown.delay(150).springify().damping(15)} style={s.card}>
          <AppText style={s.cardTitle}>Order Items</AppText>
          {(order.items || []).map((item: any, idx: number) => {
            const name = item.productVariant?.product?.name || item.productVariant?.name || 'Item';
            const varName = item.productVariant?.name;
            const unitPrice = item.priceAtTime ?? 0;
            const total = unitPrice * (item.quantity ?? 1);
            return (
              <View key={item.id || idx} style={[s.itemRow, idx < order.items.length - 1 && s.itemDivider]}>
                <View style={s.itemQtyBadge}>
                  <AppText style={s.itemQty}>{item.quantity}</AppText>
                </View>
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <AppText style={s.itemName} numberOfLines={1}>{name}</AppText>
                  {varName && varName !== name && <AppText style={s.itemVariant}>{varName}</AppText>}
                  <AppText style={s.itemUnit}>₹{unitPrice.toFixed(2)} each</AppText>
                </View>
                <AppText style={s.itemTotal}>₹{total.toFixed(2)}</AppText>
              </View>
            );
          })}
        </Animated.View>

        {/* ── BILL BREAKDOWN ── */}
        <Animated.View entering={FadeInDown.delay(200).springify().damping(15)} style={s.card}>
          <AppText style={s.cardTitle}>Bill Details</AppText>
          <BillRow label="Item Total"      value={`₹${(order.subtotal ?? 0).toFixed(2)}`} />
          <BillRow label="Taxes & GST"     value={`₹${(order.taxAmount ?? 0).toFixed(2)}`} />
          <BillRow
            label="Delivery Fee"
            value={isSelfPickup ? 'FREE 🎉' : `₹${(order.deliveryFee ?? 0).toFixed(2)}`}
            color={isSelfPickup ? PRIMARY : undefined}
          />
          {(order.walletAmountUsed ?? 0) > 0 && (
            <BillRow label="Wallet Used" value={`-₹${order.walletAmountUsed.toFixed(2)}`} color={PRIMARY} />
          )}
          <View style={s.totalDivider} />
          <BillRow label="Total Paid" value={`₹${(order.totalAmount ?? 0).toFixed(2)}`} isTotal />
        </Animated.View>

        {/* ── PAYMENT INFO ── */}
        <Animated.View entering={FadeInDown.delay(250).springify().damping(15)} style={s.card}>
          <AppText style={s.cardTitle}>Payment</AppText>
          <View style={s.payRow}>
            <View style={s.payIconWrap}>
              <Ionicons
                name={order.paymentMethod === 'COD' ? 'cash' : order.paymentMethod === 'RAZORPAY' ? 'card' : 'wallet'}
                size={24}
                color={order.paymentMethod === 'COD' ? PRIMARY : '#4F46E5'}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <AppText style={s.payMethod}>
                {order.paymentMethod === 'COD' ? (isSelfPickup ? 'Pay at Shop' : 'Cash on Delivery') : order.paymentMethod === 'RAZORPAY' ? 'Paid Online' : 'Wallet'}
              </AppText>
              <AppText style={s.payStatus}>Status: {order.paymentStatus}</AppText>
            </View>
            <View style={[s.payStatusBadge, { backgroundColor: order.paymentStatus === 'PAID' ? '#EAF8F0' : '#FEF3C7' }]}>
              <AppText style={[s.payStatusText, { color: order.paymentStatus === 'PAID' ? '#00B140' : '#D97706' }]}>
                {order.paymentStatus === 'PAID' ? '✓ PAID' : 'PENDING'}
              </AppText>
            </View>
          </View>
        </Animated.View>

        {/* ── SELF PICKUP INSTRUCTIONS ── */}
        {isSelfPickup && (
          <Animated.View entering={FadeInDown.delay(300).springify().damping(15)} style={s.pickupCard}>
            <AppText style={s.pickupCardTitle}>📍 Pickup Instructions</AppText>
            <AppText style={s.pickupCardText}>
              Show this receipt at the <AppText style={{ fontWeight: '800' }}>{order.shop?.name}</AppText> counter. Quote your order number <AppText style={{ fontWeight: '800' }}>#{order.orderNumber}</AppText> to collect your items.
            </AppText>
          </Animated.View>
        )}

        {/* Footer */}
        <Animated.Text entering={FadeInDown.delay(350).springify().damping(15)} style={s.footer}>Thank you for shopping on BazarChowk 💚</Animated.Text>
        <Animated.Text entering={FadeInDown.delay(350).springify().damping(15)} style={s.footerId}>Order ID: {order.id}</Animated.Text>

      </ScrollView>
    </View>
  );
}

function BillRow({ label, value, color, isTotal }: { label: string; value: string; color?: string; isTotal?: boolean }) {
  return (
    <View style={[s.billRow, isTotal && { marginTop: 2 }]}>
      <AppText style={[s.billLabel, isTotal && s.billLabelBold]}>{label}</AppText>
      <AppText style={[s.billValue, isTotal && s.billValueBold, color ? { color } : {}]}>{value}</AppText>
    </View>
  );
}

const s = StyleSheet.create({
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7FBF8' },
  errText:     { fontSize: 16, color: '#66736B' },
  container:   { flex: 1, backgroundColor: '#F7FBF8' },
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderColor: '#E5EBE7' },
  backBtn:     { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F7FBF8', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800', color: '#122018', letterSpacing: -0.2 },
  shareBtn:    { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F7FBF8', alignItems: 'center', justifyContent: 'center' },
  scroll:      { padding: 16, paddingBottom: 60, gap: 16 },

  successBanner: { borderRadius: 24, padding: 24, alignItems: 'center', shadowColor: '#00B140', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 1 },
  successIcon:   { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  successStatus: { fontSize: 24, fontWeight: '900', marginBottom: 6, letterSpacing: -0.5 },
  successOrderNum: { fontSize: 18, fontWeight: '800', color: '#122018', marginBottom: 4 },
  successDate:   { fontSize: 14, color: '#66736B', fontWeight: '600' },

  deliveryBadge: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 16, borderWidth: 1 },
  deliveryBadgeText: { fontSize: 15, fontWeight: '800' },

  card:      { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#E5EBE7', shadowColor: '#00B140', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 12, elevation: 1 },
  cardTitle: { fontSize: 18, fontWeight: '900', color: '#122018', marginBottom: 20, letterSpacing: -0.3 },

  shopRow:     { flexDirection: 'row', alignItems: 'center' },
  shopIconWrap:{ width: 56, height: 56, borderRadius: 16, backgroundColor: '#F7FBF8', alignItems: 'center', justifyContent: 'center' },
  shopName:    { fontSize: 16, fontWeight: '800', color: '#122018' },
  shopAddr:    { fontSize: 14, color: '#66736B', marginTop: 4, fontWeight: '500' },
  trackBtn:    { backgroundColor: '#EAF8F0', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16 },
  trackBtnText:{ fontSize: 15, fontWeight: '800', color: PRIMARY },

  itemRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  itemDivider: { borderBottomWidth: 1, borderColor: '#F0F5F2' },
  itemQtyBadge:{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#F7FBF8', alignItems: 'center', justifyContent: 'center' },
  itemQty:     { fontSize: 16, fontWeight: '800', color: '#122018' },
  itemName:    { fontSize: 16, fontWeight: '800', color: '#122018' },
  itemVariant: { fontSize: 14, color: '#66736B', marginTop: 4, fontWeight: '500' },
  itemUnit:    { fontSize: 13, color: '#8B9690', marginTop: 4, fontWeight: '600' },
  itemTotal:   { fontSize: 18, fontWeight: '800', color: '#122018' },

  billRow:        { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  billLabel:      { fontSize: 15, color: '#66736B', fontWeight: '500' },
  billValue:      { fontSize: 15, color: '#122018', fontWeight: '700' },
  billLabelBold:  { fontSize: 18, fontWeight: '900', color: '#122018' },
  billValueBold:  { fontSize: 20, fontWeight: '900', color: PRIMARY },
  totalDivider:   { height: 1, backgroundColor: '#F0F5F2', marginVertical: 4, marginBottom: 16 },

  payRow:        { flexDirection: 'row', alignItems: 'center' },
  payIconWrap:   { width: 56, height: 56, borderRadius: 16, backgroundColor: '#F7FBF8', alignItems: 'center', justifyContent: 'center' },
  payMethod:     { fontSize: 16, fontWeight: '800', color: '#122018' },
  payStatus:     { fontSize: 14, color: '#66736B', marginTop: 4, fontWeight: '500' },
  payStatusBadge:{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  payStatusText: { fontSize: 13, fontWeight: '800' },

  pickupCard:     { backgroundColor: '#FFF7ED', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#FFEDD5' },
  pickupCardTitle:{ fontSize: 18, fontWeight: '900', color: '#D97706', marginBottom: 8, letterSpacing: -0.3 },
  pickupCardText: { fontSize: 15, color: '#92400E', lineHeight: 24, fontWeight: '500' },

  footer:   { textAlign: 'center', fontSize: 16, fontWeight: '800', color: '#66736B', marginTop: 16 },
  footerId: { textAlign: 'center', fontSize: 13, color: '#8B9690', marginTop: 6, fontWeight: '600' },
});
