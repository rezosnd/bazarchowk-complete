import { Text as AppText } from '@/components/TranslatedText';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { useAuthStore } from '@/store/auth.store';
import { useCartStore } from '@/store/cart.store';
import { Header } from '@/components/Header';
import { PressableScale } from '@/components/PressableScale';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';

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
      <View style={styles.root}>
        <Header title="My Cart" showBack={false} />
        <View style={styles.center}>
          <View style={styles.emptyIconBg}>
            <Ionicons name="cart-outline" size={56} color="#8B9690" />
          </View>
          <AppText style={styles.emptyText}>You need to login first</AppText>
          <PressableScale style={styles.loginBtn} onPress={() => router.push('/(auth)/login')}>
            <AppText style={styles.loginBtnText}>Login to View Cart</AppText>
          </PressableScale>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.root}>
        <Header title="My Cart" showBack={false} />
        <View style={styles.center}><ActivityIndicator size="large" color={PRIMARY} /></View>
      </View>
    );
  }

  // Assume single shop checkout for now (Module 7 rule)
  const shopId = cart?.items?.[0]?.productVariant?.product?.shopId;
  const items = (cart?.items || []).filter((item: any) => item.productVariant?.product?.shopId === shopId);
  
  if (items.length === 0) {
    return (
      <View style={styles.root}>
        <Header title="My Cart" showBack={false} />
        <Animated.View entering={FadeInUp.springify().damping(18)} style={styles.centerEmpty}>
          <View style={styles.emptyIconBg}>
            <Ionicons name="basket-outline" size={48} color={PRIMARY} />
          </View>
          <AppText style={styles.emptyText}>Your cart is empty</AppText>
          <AppText style={styles.emptySub}>Looks like you haven't added anything yet.</AppText>
          <PressableScale style={styles.browseBtn} onPress={() => router.push('/')}>
            <AppText style={styles.browseBtnText}>Browse Products</AppText>
          </PressableScale>
        </Animated.View>
      </View>
    );
  }

  // Calculate Totals
  const subtotal = items.reduce((sum: number, item: any) => sum + (item.quantity * item.productVariant.price), 0);
  const total = subtotal; // Delivery and tax calculated at checkout

  return (
    <View style={styles.root}>
      <Header title="My Cart" showBack={false} />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, 24) + 100 }]} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.springify().damping(15)} style={styles.shopHeader}>
          <Ionicons name="storefront" size={20} color="#122018" />
          <AppText style={styles.shopName}>Items from {items[0]?.productVariant?.product?.shop?.name || 'Shop'}</AppText>
        </Animated.View>

        {items.map((item: any, index: number) => {
          const variant = item.productVariant;
          const product = variant.product;
          const image = product.images?.[0]?.imageUrl;

          return (
            <Animated.View key={item.id} entering={FadeInDown.delay(index * 40).springify().damping(15)}>
              <View style={styles.itemCard}>
                {image ? (
                  <Image source={{ uri: image }} style={styles.itemImg} contentFit="cover" />
                ) : (
                  <View style={[styles.itemImg, { alignItems: 'center', justifyContent: 'center' }]}>
                    <Ionicons name="cube" size={24} color="#8B9690" />
                  </View>
                )}
                <View style={styles.itemInfo}>
                  <AppText style={styles.itemName} numberOfLines={2}>{product.name}</AppText>
                  <AppText style={styles.itemVariant}>{variant.name}</AppText>
                  <AppText style={styles.itemPrice}>₹{variant.price}</AppText>
                </View>
                
                <View style={styles.qtyBox}>
                  {updatingId === item.id ? (
                    <ActivityIndicator size="small" color={PRIMARY} style={{ margin: 12 }} />
                  ) : (
                    <>
                      <PressableScale onPress={() => handleUpdateQuantity(item.id, item.quantity - 1)} style={styles.qtyBtn} scaleTo={0.8}>
                        <Ionicons name="remove" size={18} color="#00B140" />
                      </PressableScale>
                      <AppText style={styles.qtyText}>{item.quantity}</AppText>
                      <PressableScale onPress={() => {
                        if (item.quantity >= item.productVariant.stock) {
                          Alert.alert('Stock Limit', `Only ${item.productVariant.stock} items available in stock.`);
                        } else {
                          handleUpdateQuantity(item.id, item.quantity + 1);
                        }
                      }} style={styles.qtyBtn} scaleTo={0.8}>
                        <Ionicons name="add" size={18} color="#00B140" />
                      </PressableScale>
                    </>
                  )}
                </View>
              </View>
            </Animated.View>
          );
        })}

        <Animated.View entering={FadeInDown.delay(items.length * 40).springify().damping(15)} style={styles.billCard}>
          <AppText style={styles.billTitle}>Bill Details</AppText>
          <View style={styles.billRow}>
            <AppText style={styles.billLabel}>Item Total</AppText>
            <AppText style={styles.billValue}>₹{subtotal.toFixed(2)}</AppText>
          </View>
          <View style={styles.billRow}>
            <AppText style={styles.billLabel}>Taxes & Delivery</AppText>
            <AppText style={styles.billValue}>Calculated at checkout</AppText>
          </View>
          <View style={[styles.billRow, styles.totalRow]}>
            <AppText style={styles.totalLabel}>Subtotal</AppText>
            <AppText style={styles.totalValue}>₹{total.toFixed(2)}</AppText>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Checkout Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.payInfo}>
          <AppText style={styles.payLabel}>Subtotal</AppText>
          <AppText style={styles.payAmount}>₹{total.toFixed(2)}</AppText>
        </View>
        <PressableScale 
          style={styles.checkoutBtn} 
          onPress={() => router.push({ pathname: '/checkout', params: { shopId } })}
        >
          <AppText style={styles.checkoutText}>Proceed</AppText>
          <Ionicons name="arrow-forward" size={20} color="#FFF" />
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7FBF8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  centerEmpty: { flex: 1, alignItems: 'center', marginTop: '30%' },
  
  emptyIconBg: { width: 96, height: 96, borderRadius: 32, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAF8F0', shadowColor: '#00B140', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  emptyText: { fontSize: 22, fontWeight: '800', color: '#122018', marginBottom: 8, letterSpacing: -0.2 },
  emptySub: { fontSize: 15, color: '#66736B', marginBottom: 32 },
  loginBtn: { marginTop: 24, backgroundColor: PRIMARY, paddingHorizontal: 28, paddingVertical: 16, borderRadius: 16 },
  loginBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  browseBtn: { backgroundColor: '#122018', paddingHorizontal: 28, paddingVertical: 16, borderRadius: 20 },
  browseBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  
  scroll: { padding: 16, gap: 16 },
  shopHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4, marginBottom: 4 },
  shopName: { fontSize: 16, fontWeight: '800', color: '#122018', letterSpacing: -0.2 },
  
  itemCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 24, borderWidth: 1, borderColor: '#E5EBE7', alignItems: 'center', shadowColor: '#00B140', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
  itemImg: { width: 76, height: 76, borderRadius: 16, backgroundColor: '#F7FBF8', borderWidth: 1, borderColor: '#EAF8F0' },
  itemInfo: { flex: 1, marginLeft: 16 },
  itemName: { fontSize: 16, fontWeight: '800', color: '#122018', letterSpacing: -0.2, marginBottom: 2 },
  itemVariant: { fontSize: 13, color: '#66736B', fontWeight: '500', marginBottom: 6 },
  itemPrice: { fontSize: 16, fontWeight: '800', color: PRIMARY },
  
  qtyBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7FBF8', borderRadius: 14, borderWidth: 1, borderColor: '#EAF8F0' },
  qtyBtn: { padding: 10 },
  qtyText: { fontSize: 16, fontWeight: '800', color: '#122018', minWidth: 28, textAlign: 'center' },

  billCard: { backgroundColor: '#FFFFFF', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: '#E5EBE7', marginTop: 8, shadowColor: '#00B140', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
  billTitle: { fontSize: 18, fontWeight: '800', color: '#122018', marginBottom: 20, letterSpacing: -0.2 },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  billLabel: { fontSize: 15, color: '#66736B', fontWeight: '500' },
  billValue: { fontSize: 15, color: '#122018', fontWeight: '700' },
  totalRow: { marginTop: 8, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#F0F5F2', marginBottom: 0 },
  totalLabel: { fontSize: 18, color: '#122018', fontWeight: '800' },
  totalValue: { fontSize: 22, color: PRIMARY, fontWeight: '900' },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5EBE7',
    paddingHorizontal: 20, paddingTop: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: '#00B140', shadowOffset: { width: 0, height: -12 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 12,
  },
  payInfo: {},
  payLabel: { fontSize: 13, color: '#66736B', fontWeight: '600', marginBottom: 2 },
  payAmount: { fontSize: 24, color: '#122018', fontWeight: '900', letterSpacing: -0.5 },
  checkoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: PRIMARY, paddingHorizontal: 32, height: 56, borderRadius: 16 },
  checkoutText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' }
});
