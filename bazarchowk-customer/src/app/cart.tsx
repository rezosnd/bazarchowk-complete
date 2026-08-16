import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
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
      const msg = error?.response?.data?.message;
      const errorMsg = Array.isArray(msg) ? msg.join(', ') : (msg || error?.message || 'Failed to update quantity.');
      Alert.alert('Error', typeof errorMsg === 'string' ? errorMsg : 'Something went wrong');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    setUpdatingId(itemId);
    try {
      await removeItem(itemId);
    } catch (error) {
      Alert.alert('Error', 'Failed to remove item');
    } finally {
      setUpdatingId(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.center}>
        <View style={styles.emptyIconBg}>
          <Ionicons name="cart-outline" size={56} color="#8B9690" />
        </View>
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

  // Assume single shop checkout for now (Module 7 rule)
  const shopId = cart?.items?.[0]?.productVariant?.product?.shopId;
  const items = (cart?.items || []).filter((item: any) => item.productVariant?.product?.shopId === shopId);
  
  if (items.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.headerTitle}>My Cart</Text>
        <View style={styles.centerEmpty}>
          <View style={styles.emptyIconBg}>
            <Ionicons name="basket-outline" size={48} color={PRIMARY} />
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
  const total = subtotal; // Delivery and tax calculated at checkout

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.headerTitle}>My Cart</Text>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.shopHeader}>
          <Ionicons name="storefront" size={20} color="#66736B" />
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
                  <Ionicons name="cube" size={24} color="#8B9690" />
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
                      <Ionicons name="remove" size={18} color="#122018" />
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                    <TouchableOpacity onPress={() => {
                      if (item.quantity >= item.productVariant.stock) {
                        Alert.alert('Stock Limit', `Only ${item.productVariant.stock} items available in stock.`);
                      } else {
                        handleUpdateQuantity(item.id, item.quantity + 1);
                      }
                    }} style={styles.qtyBtn}>
                      <Ionicons name="add" size={18} color="#122018" />
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
            <Text style={styles.billLabel}>Taxes & Delivery</Text>
            <Text style={styles.billValue}>Calculated at checkout</Text>
          </View>
          <View style={[styles.billRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>₹{total.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Checkout Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <View style={styles.payInfo}>
          <Text style={styles.payLabel}>Subtotal</Text>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7FAF8' },
  centerEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  container: { flex: 1, backgroundColor: '#F7FAF8' },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#122018', paddingHorizontal: 20, paddingVertical: 12 },
  emptyIconBg: { width: 80, height: 80, borderRadius: 24, backgroundColor: '#EAF8F0', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  emptyText: { fontSize: 20, fontWeight: '700', color: '#122018', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#66736B', marginBottom: 24 },
  loginBtn: { marginTop: 24, backgroundColor: PRIMARY, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16 },
  loginBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  browseBtn: { backgroundColor: '#122018', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16 },
  browseBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  
  scroll: { padding: 16, paddingBottom: 130, gap: 16 },
  shopHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4 },
  shopName: { fontSize: 15, fontWeight: '700', color: '#122018' },
  
  itemCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', padding: 12, borderRadius: 20, borderWidth: 1, borderColor: '#E5EBE7', alignItems: 'center', shadowColor: '#00B140', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
  itemImg: { width: 72, height: 72, borderRadius: 16, backgroundColor: '#F7FAF8' },
  itemInfo: { flex: 1, marginLeft: 16 },
  itemName: { fontSize: 16, fontWeight: '700', color: '#122018' },
  itemVariant: { fontSize: 13, color: '#66736B', marginTop: 2, marginBottom: 4 },
  itemPrice: { fontSize: 16, fontWeight: '700', color: PRIMARY },
  
  qtyBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EAF8F0', borderRadius: 14, borderWidth: 1, borderColor: '#E5EBE7' },
  qtyBtn: { padding: 10 },
  qtyText: { fontSize: 15, fontWeight: '700', color: '#122018', minWidth: 24, textAlign: 'center' },

  billCard: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#E5EBE7', marginTop: 8, shadowColor: '#00B140', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
  billTitle: { fontSize: 18, fontWeight: '700', color: '#122018', marginBottom: 16 },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  billLabel: { fontSize: 15, color: '#66736B', fontWeight: '500' },
  billValue: { fontSize: 15, color: '#122018', fontWeight: '600' },
  totalRow: { marginTop: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E5EBE7', marginBottom: 0 },
  totalLabel: { fontSize: 18, color: '#122018', fontWeight: '800' },
  totalValue: { fontSize: 20, color: PRIMARY, fontWeight: '800' },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5EBE7',
    paddingHorizontal: 20, paddingTop: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: '#00B140', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 10,
  },
  payInfo: {},
  payLabel: { fontSize: 13, color: '#66736B', fontWeight: '600', marginBottom: 2 },
  payAmount: { fontSize: 22, color: '#122018', fontWeight: '800' },
  checkoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: PRIMARY, paddingHorizontal: 28, height: 56, borderRadius: 16 },
  checkoutText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' }
});
