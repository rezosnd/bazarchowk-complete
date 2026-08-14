import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Share, Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import api from '@/services/api';

const PRIMARY = '#00B140';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  PLACED:           { label: 'Order Placed',       color: '#2563EB', bg: '#DBEAFE', icon: 'checkmark-circle' },
  ACCEPTED:         { label: 'Accepted by Shop',   color: '#7C3AED', bg: '#EDE9FE', icon: 'storefront'       },
  PREPARING:        { label: 'Preparing',          color: '#D97706', bg: '#FEF3C7', icon: 'fast-food'        },
  READY:            { label: 'Ready',              color: '#059669', bg: '#D1FAE5', icon: 'bag-check'        },
  READY_FOR_PICKUP: { label: 'Ready for Pickup',  color: '#059669', bg: '#D1FAE5', icon: 'bag-handle'       },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery',  color: '#0891B2', bg: '#CFFAFE', icon: 'bicycle'          },
  DELIVERED:        { label: 'Delivered ✓',        color: '#16A34A', bg: '#DCFCE7', icon: 'home'            },
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
  if (!order)  return <View style={s.center}><Text style={s.errText}>Order not found</Text></View>;

  const isSelfPickup = !order.deliveryAddressId;
  const statusInfo = STATUS_MAP[order.status] || { label: order.status, color: '#64748B', bg: '#F1F5F9', icon: 'information-circle' };
  const date = new Date(order.createdAt);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.replace('/(tabs)/orders' as any)} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Receipt</Text>
        <TouchableOpacity onPress={handleShare} style={s.shareBtn}>
          <Ionicons name="share-outline" size={22} color={PRIMARY} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── SUCCESS BANNER ── */}
        <View style={[s.successBanner, { backgroundColor: statusInfo.bg }]}>
          <View style={[s.successIcon, { backgroundColor: statusInfo.color }]}>
            <Ionicons name={statusInfo.icon as any} size={32} color="#FFF" />
          </View>
          <Text style={[s.successStatus, { color: statusInfo.color }]}>{statusInfo.label}</Text>
          <Text style={s.successOrderNum}>#{order.orderNumber}</Text>
          <Text style={s.successDate}>{date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}  ·  {date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</Text>
        </View>

        {/* ── DELIVERY TYPE BADGE ── */}
        <View style={[s.deliveryBadge, { backgroundColor: isSelfPickup ? '#F5F3FF' : '#F0FDF4', borderColor: isSelfPickup ? '#DDD6FE' : '#BBF7D0' }]}>
          <Ionicons name={isSelfPickup ? 'bag-handle' : 'bicycle'} size={18} color={isSelfPickup ? '#7C3AED' : PRIMARY} />
          <Text style={[s.deliveryBadgeText, { color: isSelfPickup ? '#7C3AED' : PRIMARY }]}>
            {isSelfPickup ? 'Self Pickup · Collect from shop' : `Home Delivery · ${order.deliveryAddress?.city || 'Your address'}`}
          </Text>
        </View>

        {/* ── SHOP CARD ── */}
        <View style={s.card}>
          <View style={s.shopRow}>
            <View style={s.shopIconWrap}>
              <Ionicons name="storefront" size={22} color={PRIMARY} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.shopName}>{order.shop?.name}</Text>
              {order.shop?.address && <Text style={s.shopAddr} numberOfLines={1}>{order.shop.address}</Text>}
            </View>
            <TouchableOpacity
              style={s.trackBtn}
              onPress={() => router.push(`/order/${order.id}` as any)}
            >
              <Text style={s.trackBtnText}>Track</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── ORDER ITEMS ── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Order Items</Text>
          {(order.items || []).map((item: any, idx: number) => {
            const name = item.productVariant?.product?.name || item.productVariant?.name || 'Item';
            const varName = item.productVariant?.name;
            const unitPrice = item.priceAtTime ?? 0;
            const total = unitPrice * (item.quantity ?? 1);
            return (
              <View key={item.id || idx} style={[s.itemRow, idx < order.items.length - 1 && s.itemDivider]}>
                <View style={s.itemQtyBadge}>
                  <Text style={s.itemQty}>{item.quantity}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={s.itemName} numberOfLines={1}>{name}</Text>
                  {varName && varName !== name && <Text style={s.itemVariant}>{varName}</Text>}
                  <Text style={s.itemUnit}>₹{unitPrice.toFixed(2)} each</Text>
                </View>
                <Text style={s.itemTotal}>₹{total.toFixed(2)}</Text>
              </View>
            );
          })}
        </View>

        {/* ── BILL BREAKDOWN ── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Bill Details</Text>
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
        </View>

        {/* ── PAYMENT INFO ── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Payment</Text>
          <View style={s.payRow}>
            <View style={s.payIconWrap}>
              <Ionicons
                name={order.paymentMethod === 'COD' ? 'cash' : order.paymentMethod === 'RAZORPAY' ? 'card' : 'wallet'}
                size={20}
                color={order.paymentMethod === 'COD' ? PRIMARY : '#3B82F6'}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.payMethod}>
                {order.paymentMethod === 'COD' ? (isSelfPickup ? 'Pay at Shop' : 'Cash on Delivery') : order.paymentMethod === 'RAZORPAY' ? 'Paid Online' : 'Wallet'}
              </Text>
              <Text style={s.payStatus}>Status: {order.paymentStatus}</Text>
            </View>
            <View style={[s.payStatusBadge, { backgroundColor: order.paymentStatus === 'PAID' ? '#DCFCE7' : '#FEF3C7' }]}>
              <Text style={[s.payStatusText, { color: order.paymentStatus === 'PAID' ? '#16A34A' : '#D97706' }]}>
                {order.paymentStatus === 'PAID' ? '✓ PAID' : 'PENDING'}
              </Text>
            </View>
          </View>
        </View>

        {/* ── SELF PICKUP INSTRUCTIONS ── */}
        {isSelfPickup && (
          <View style={s.pickupCard}>
            <Text style={s.pickupCardTitle}>📍 Pickup Instructions</Text>
            <Text style={s.pickupCardText}>
              Show this receipt at the <Text style={{ fontWeight: '800' }}>{order.shop?.name}</Text> counter. Quote your order number <Text style={{ fontWeight: '800' }}>#{order.orderNumber}</Text> to collect your items.
            </Text>
          </View>
        )}

        {/* Footer */}
        <Text style={s.footer}>Thank you for shopping on BazarChowk 💚</Text>
        <Text style={s.footerId}>Order ID: {order.id}</Text>

      </ScrollView>
    </View>
  );
}

function BillRow({ label, value, color, isTotal }: { label: string; value: string; color?: string; isTotal?: boolean }) {
  return (
    <View style={[s.billRow, isTotal && { marginTop: 2 }]}>
      <Text style={[s.billLabel, isTotal && s.billLabelBold]}>{label}</Text>
      <Text style={[s.billValue, isTotal && s.billValueBold, color ? { color } : {}]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  errText:     { fontSize: 16, color: '#64748B' },
  container:   { flex: 1, backgroundColor: '#F8FAFC' },
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E2E8F0' },
  backBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800', color: '#0F172A' },
  shareBtn:    { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center' },
  scroll:      { padding: 16, paddingBottom: 60, gap: 14 },

  successBanner: { borderRadius: 20, padding: 24, alignItems: 'center' },
  successIcon:   { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  successStatus: { fontSize: 20, fontWeight: '900', marginBottom: 6 },
  successOrderNum: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  successDate:   { fontSize: 13, color: '#64748B', fontWeight: '500' },

  deliveryBadge: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1 },
  deliveryBadgeText: { fontSize: 14, fontWeight: '700' },

  card:      { backgroundColor: '#FFF', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: '900', color: '#0F172A', marginBottom: 14 },

  shopRow:     { flexDirection: 'row', alignItems: 'center' },
  shopIconWrap:{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center' },
  shopName:    { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  shopAddr:    { fontSize: 12, color: '#64748B', marginTop: 2 },
  trackBtn:    { backgroundColor: '#F0FDF4', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  trackBtnText:{ fontSize: 13, fontWeight: '800', color: PRIMARY },

  itemRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  itemDivider: { borderBottomWidth: 1, borderColor: '#F8FAFC' },
  itemQtyBadge:{ width: 30, height: 30, borderRadius: 8, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  itemQty:     { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  itemName:    { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  itemVariant: { fontSize: 12, color: '#64748B', marginTop: 1 },
  itemUnit:    { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  itemTotal:   { fontSize: 15, fontWeight: '800', color: '#0F172A' },

  billRow:        { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  billLabel:      { fontSize: 14, color: '#64748B', fontWeight: '500' },
  billValue:      { fontSize: 14, color: '#0F172A', fontWeight: '600' },
  billLabelBold:  { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  billValueBold:  { fontSize: 18, fontWeight: '900', color: PRIMARY },
  totalDivider:   { height: 1, backgroundColor: '#F1F5F9', marginBottom: 10 },

  payRow:        { flexDirection: 'row', alignItems: 'center' },
  payIconWrap:   { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' },
  payMethod:     { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  payStatus:     { fontSize: 12, color: '#64748B', marginTop: 2 },
  payStatusBadge:{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  payStatusText: { fontSize: 12, fontWeight: '800' },

  pickupCard:     { backgroundColor: '#F5F3FF', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#DDD6FE' },
  pickupCardTitle:{ fontSize: 15, fontWeight: '800', color: '#5B21B6', marginBottom: 8 },
  pickupCardText: { fontSize: 14, color: '#6D28D9', lineHeight: 22 },

  footer:   { textAlign: 'center', fontSize: 15, fontWeight: '700', color: '#64748B', marginTop: 8 },
  footerId: { textAlign: 'center', fontSize: 11, color: '#CBD5E1', marginTop: 4 },
});
