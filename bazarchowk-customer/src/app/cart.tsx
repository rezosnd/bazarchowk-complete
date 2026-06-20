import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { useAuthStore } from '@/store/auth.store';
import { useCartStore } from '@/store/cart.store';

const PRIMARY = '#00B140';

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const { cart, loading, fetchCart, updateQuantity, removeItem } = useCartStore();

  useEffect(() => {
    if (isAuthenticated) {
      fetchCart();
    }
  }, [isAuthenticated]);

  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    setUpdatingId(itemId);
    try {
      await updateQuantity(itemId, newQuantity);
    } catch (error: any) {
      alert(error?.response?.data?.message || error?.message || 'Failed to update quantity.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    setUpdatingId(itemId);
    try {
      await removeItem(itemId);
    } catch (error) {
      alert('Failed to remove item');
    } finally {
      setUpdatingId(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.center}>
        <Ionicons name="cart-outline" size={80} color="#CBD5E1" />
        <Text style={styles.emptyText}>You need to login first</Text>
        <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.loginBtnText}>Login to View Cart</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={PRIMARY} /></View>;
  }

  const items = cart?.items || [];
  
  if (items.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.headerTitle}>My Cart</Text>
        <View style={styles.centerEmpty}>
          <View style={styles.emptyIconBg}>
            <Ionicons name="basket-outline" size={64} color={PRIMARY} />
          </View>
          <Text style={styles.emptyText}>Your cart is empty</Text>
          <Text style={styles.emptySub}>Looks like you haven't added anything yet.</Text>
          <TouchableOpacity style={styles.browseBtn} onPress={() => router.push('/')}>
            <Text style={styles.browseBtnText}>Browse Products</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Calculate Totals
  const subtotal = items.reduce((sum: number, item: any) => sum + (item.quantity * item.productVariant.price), 0);
  const tax = subtotal * 0.05; // 5% GST
  const delivery = 40;
  const total = subtotal + tax + delivery;

  // Assume single shop checkout for now (Module 7 rule)
  const shopId = items[0]?.productVariant?.product?.shopId;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.headerTitle}>My Cart</Text>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.shopHeader}>
          <Ionicons name="storefront" size={20} color="#64748B" />
          <Text style={styles.shopName}>Items from {items[0]?.productVariant?.product?.shop?.name || 'Shop'}</Text>
        </View>

        {items.map((item: any) => {
          const variant = item.productVariant;
          const product = variant.product;
          const image = product.images?.[0]?.imageUrl;

          return (
            <View key={item.id} style={styles.itemCard}>
              {image ? (
                <Image source={{ uri: image }} style={styles.itemImg} contentFit="cover" />
              ) : (
                <View style={[styles.itemImg, { alignItems: 'center', justifyContent: 'center' }]}>
                  <Ionicons name="cube" size={24} color="#94A3B8" />
                </View>
              )}
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={1}>{product.name}</Text>
                <Text style={styles.itemVariant}>{variant.name}</Text>
                <Text style={styles.itemPrice}>₹{variant.price}</Text>
              </View>
              
              <View style={styles.qtyBox}>
                {updatingId === item.id ? (
                  <ActivityIndicator size="small" color={PRIMARY} style={{ margin: 12 }} />
                ) : (
                  <>
                    <TouchableOpacity onPress={() => handleUpdateQuantity(item.id, item.quantity - 1)} style={styles.qtyBtn}>
                      <Ionicons name="remove" size={16} color="#0F172A" />
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                    <TouchableOpacity onPress={() => handleUpdateQuantity(item.id, item.quantity + 1)} style={styles.qtyBtn}>
                      <Ionicons name="add" size={16} color="#0F172A" />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          );
        })}

        <View style={styles.billCard}>
          <Text style={styles.billTitle}>Bill Details</Text>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Item Total</Text>
            <Text style={styles.billValue}>₹{subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Taxes & Charges</Text>
            <Text style={styles.billValue}>₹{tax.toFixed(2)}</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Delivery Fee</Text>
            <Text style={styles.billValue}>₹{delivery.toFixed(2)}</Text>
          </View>
          <View style={[styles.billRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>To Pay</Text>
            <Text style={styles.totalValue}>₹{total.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Checkout Bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom || 24 }]}>
        <View style={styles.payInfo}>
          <Text style={styles.payLabel}>Total Amount</Text>
          <Text style={styles.payAmount}>₹{total.toFixed(2)}</Text>
        </View>
        <TouchableOpacity 
          style={styles.checkoutBtn} 
          onPress={() => router.push({ pathname: '/checkout', params: { shopId } })}
        >
          <Text style={styles.checkoutText}>Proceed</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  centerEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#0F172A', paddingHorizontal: 20, paddingVertical: 12 },
  emptyIconBg: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  emptyText: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#64748B', marginBottom: 24 },
  loginBtn: { marginTop: 24, backgroundColor: PRIMARY, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  loginBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  browseBtn: { backgroundColor: '#0F172A', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16 },
  browseBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  
  scroll: { padding: 16, paddingBottom: 100, gap: 16 },
  shopHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  shopName: { fontSize: 14, fontWeight: '700', color: '#334155' },
  
  itemCard: { flexDirection: 'row', backgroundColor: '#FFF', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9', alignItems: 'center' },
  itemImg: { width: 64, height: 64, borderRadius: 12, backgroundColor: '#F8FAFC' },
  itemInfo: { flex: 1, marginLeft: 12 },
  itemName: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  itemVariant: { fontSize: 12, color: '#64748B', marginTop: 2, marginBottom: 4 },
  itemPrice: { fontSize: 15, fontWeight: '800', color: PRIMARY },
  
  qtyBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 8 },
  qtyBtn: { padding: 8 },
  qtyText: { fontSize: 14, fontWeight: '700', color: '#0F172A', minWidth: 20, textAlign: 'center' },

  billCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9', marginTop: 8 },
  billTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 16 },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  billLabel: { fontSize: 14, color: '#64748B', fontWeight: '500' },
  billValue: { fontSize: 14, color: '#0F172A', fontWeight: '600' },
  totalRow: { marginTop: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9', marginBottom: 0 },
  totalLabel: { fontSize: 16, color: '#0F172A', fontWeight: '800' },
  totalValue: { fontSize: 18, color: PRIMARY, fontWeight: '800' },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F1F5F9',
    paddingHorizontal: 20, paddingTop: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 10,
  },
  payInfo: {},
  payLabel: { fontSize: 12, color: '#64748B', fontWeight: '600', marginBottom: 2 },
  payAmount: { fontSize: 20, color: '#0F172A', fontWeight: '800' },
  checkoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: PRIMARY, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16 },
  checkoutText: { color: '#FFF', fontSize: 16, fontWeight: '700' }
});
