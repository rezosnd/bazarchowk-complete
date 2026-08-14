import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Dimensions, Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown, useSharedValue, useAnimatedStyle, withSpring,
} from 'react-native-reanimated';
import api from '@/services/api';
import { useCartStore } from '@/store/cart.store';
import { useAuthStore } from '@/store/auth.store';
import { useCurrentLocation } from '@/hooks';

const PRIMARY = '#00B140';
const { width: W } = Dimensions.get('window');
const CARD_W = (W - 16 * 2 - 12) / 2;

// ─── Product Card ─────────────────────────────────────────────────────────────

function ProductCard({ product, index }: { product: any; index: number }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const [adding, setAdding] = useState(false);

  const { isAuthenticated } = useAuthStore();
  const { cart, fetchCart, addToCart } = useCartStore();

  const primaryImage =
    product.images?.find((img: any) => img.isPrimary)?.imageUrl ||
    product.images?.[0]?.imageUrl ||
    product.imageUrl ||
    null;

  const firstVariant = product.variants?.[0];
  const price = firstVariant?.price ?? product.basePrice ?? 0;

  // Check how many of this item are in cart
  const cartQty = (cart?.items || [])
    .filter((i: any) => i.productVariant?.productId === product.id)
    .reduce((s: number, i: any) => s + i.quantity, 0);

  const isOutOfStock = !firstVariant || firstVariant.stock <= 0;

  const handleAdd = async () => {
    if (!isAuthenticated) {
      Alert.alert('Login Required', 'Please login to add items to cart.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => router.push('/(auth)/login' as any) },
      ]);
      return;
    }
    if (!firstVariant) {
      Alert.alert('Unavailable', 'This product has no available variant.');
      return;
    }
    setAdding(true);
    try {
      await addToCart(firstVariant.id, 1);
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      const errorMsg = Array.isArray(msg) ? msg.join(', ') : (msg || e.message || 'Could not add to cart');
      Alert.alert('Error', typeof errorMsg === 'string' ? errorMsg : 'Something went wrong');
    } finally {
      setAdding(false);
    }
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 35).springify().damping(14)} style={styles.cardWrap}>
      <TouchableOpacity
        activeOpacity={1}
        style={styles.card}
        onPress={() => router.push(`/product/${product.id}`)}
        onPressIn={() => { scale.value = withSpring(0.97, { damping: 12 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 10 }); }}
      >
        <Animated.View style={animStyle}>
          {/* Image */}
          <View style={styles.imgWrap}>
            {primaryImage ? (
              <Image
                source={{ uri: primaryImage }}
                style={styles.img}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.img, { backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }]}>
                <Ionicons name="cube-outline" size={32} color="#CBD5E1" />
              </View>
            )}
            {/* Veg/Non-veg badge */}
            <View style={[styles.vegBadge, { borderColor: PRIMARY }]}>
              <View style={[styles.vegDot, { backgroundColor: PRIMARY }]} />
            </View>
          </View>

          {/* Info */}
          <View style={styles.info}>
            <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
            {product.shop?.name && (
              <Text style={styles.shopName} numberOfLines={1}>{product.shop.name}</Text>
            )}
            <View style={styles.priceRow}>
              <Text style={styles.price}>₹{price}</Text>
              {product.mrp && product.mrp > price && (
                <Text style={styles.mrp}>₹{product.mrp}</Text>
              )}
            </View>

            {/* Add to Cart button */}
            {isOutOfStock ? (
              <View style={[styles.addBtn, { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1' }]}>
                <Text style={[styles.addBtnText, { color: '#94A3B8', fontSize: 11 }]}>OUT OF STOCK</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.addBtn, cartQty > 0 && styles.addBtnActive]}
                onPress={handleAdd}
                activeOpacity={0.8}
                disabled={adding}
              >
                {adding ? (
                  <ActivityIndicator size="small" color={cartQty > 0 ? '#FFF' : PRIMARY} />
                ) : cartQty > 0 ? (
                  <Text style={[styles.addBtnText, { color: '#FFF' }]}>+ Add ({cartQty})</Text>
                ) : (
                  <Text style={styles.addBtnText}>+ ADD</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function CategoryDetailScreen() {
  const params = useLocalSearchParams();
  // useLocalSearchParams can return string | string[] — always normalize to string
  const id = Array.isArray(params.id) ? params.id[0] : (params.id as string);
  const name = Array.isArray(params.name) ? params.name[0] : (params.name as string);
  const insets = useSafeAreaInsets();
  const location = useCurrentLocation();

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'default' | 'price_asc' | 'price_desc'>('default');

  const { cart, fetchCart } = useCartStore();
  const itemsCount = cart?.items?.reduce((acc: number, item: any) => acc + item.quantity, 0) || 0;

  useEffect(() => { fetchCart(); }, []);

  const fetchProducts = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const locParams = location?.lat && location?.lng
        ? `&lat=${location.lat}&lng=${location.lng}&city=${encodeURIComponent(location.city || '')}`
        : (location?.city ? `&city=${encodeURIComponent(location.city)}` : '');

      if (id.startsWith('dyn-')) {
        const partnerType = id.replace('dyn-', '').toUpperCase();
        // Fallback for salon vs saloon
        const type = partnerType === 'SALOON' ? 'SALON' : partnerType;
        const res = await api.get(`/shops?partnerType=${type}${locParams}`);
        setProducts(Array.isArray(res.data) ? res.data : []);
      } else {
        const [subRes, catRes] = await Promise.all([
          api.get(`/products?subCategoryId=${id}${locParams}`).catch(() => ({ data: [] })),
          api.get(`/products?categoryId=${id}${locParams}`).catch(() => ({ data: [] })),
        ]);
        const subData = Array.isArray(subRes.data) ? subRes.data : (subRes.data?.items || []);
        const catData = Array.isArray(catRes.data) ? catRes.data : (catRes.data?.items || []);
        const mergedMap = new Map<string, any>();
        [...subData, ...catData].forEach(p => mergedMap.set(p.id, p));
        setProducts(Array.from(mergedMap.values()));
      }
    } catch (e) {
      console.warn('Failed to load items', e);
    } finally {
      setLoading(false);
    }
  }, [id, location?.lat, location?.lng, location?.city]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const sorted = [...products].sort((a, b) => {
    const pa = a.variants?.[0]?.price ?? a.basePrice ?? 0;
    const pb = b.variants?.[0]?.price ?? b.basePrice ?? 0;
    if (sortBy === 'price_asc') return pa - pb;
    if (sortBy === 'price_desc') return pb - pa;
    return 0;
  });

  return (
    <View style={[styles.root, { backgroundColor: '#F8FAFC' }]}>

      {/* ── Header ── */}
      <LinearGradient colors={['#FFFFFF', '#FAFAFA']} style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{name || 'Category'}</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/cart')}>
          <Ionicons name="cart-outline" size={22} color="#0F172A" />
          {itemsCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{itemsCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </LinearGradient>

      {/* ── Sort Bar ── */}
      {!loading && products.length > 0 && !id.startsWith('dyn-') && (
        <View style={styles.sortBar}>
          <Text style={styles.resultCount}>{products.length} items</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {[
              { key: 'default', label: '⭐ Relevance' },
              { key: 'price_asc', label: '↑ Price Low-High' },
              { key: 'price_desc', label: '↓ Price High-Low' },
            ].map(opt => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.sortChip, sortBy === opt.key && styles.sortChipActive]}
                onPress={() => setSortBy(opt.key as any)}
              >
                <Text style={[styles.sortChipText, sortBy === opt.key && styles.sortChipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── Grid ── */}
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={PRIMARY} />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : sorted.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="location-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No options near you</Text>
            <Text style={styles.emptyText}>
              {location?.city
                ? `No providers in ${location.city} found.`
                : 'No options available in this category right now.'}
            </Text>
            <TouchableOpacity
              onPress={fetchProducts}
              style={{ marginTop: 16, backgroundColor: '#00B140', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 }}
            >
              <Text style={{ color: '#FFF', fontWeight: '700' }}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : id.startsWith('dyn-') ? (
          <View style={{ gap: 16 }}>
            {sorted.map((shop, idx) => (
              <TouchableOpacity 
                key={shop.id} 
                style={{
                  flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 16,
                  padding: 12, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2
                }} 
                activeOpacity={0.9} 
                onPress={() => router.push(`/services/${shop.id}`)}
              >
                <View style={{ width: 90, height: 90, borderRadius: 12, overflow: 'hidden', backgroundColor: '#F1F5F9' }}>
                  {shop.bannerUrl || shop.logoUrl ? (
                    <Image source={{ uri: shop.bannerUrl || shop.logoUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                  ) : (
                    <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="briefcase-outline" size={32} color="#CBD5E1" />
                    </View>
                  )}
                  {shop.status?.isOpen && (
                    <View style={{ position: 'absolute', bottom: 6, left: 6, backgroundColor: PRIMARY, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                      <Text style={{ color: '#FFF', fontSize: 9, fontWeight: '800' }}>OPEN</Text>
                    </View>
                  )}
                </View>
                <View style={{ flex: 1, justifyContent: 'center' }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 4 }}>{shop.name}</Text>
                  <Text style={{ fontSize: 13, color: '#64748B', fontWeight: '600', marginBottom: 6 }}>
                    <Ionicons name="star" size={12} color="#F59E0B" /> {shop.rating?.toFixed(1) || '4.5'}
                  </Text>
                  <TouchableOpacity 
                    style={{ alignSelf: 'flex-start', backgroundColor: '#EA580C', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
                    onPress={() => router.push(`/services/${shop.id}`)}
                  >
                    <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>Book Appointment</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.grid}>
            {sorted.map((product, idx) => (
              <ProductCard key={product.id} product={product} index={idx} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  iconBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  headerTitle: {
    flex: 1, textAlign: 'center', fontSize: 18,
    fontWeight: '800', color: '#0F172A', marginHorizontal: 12,
  },
  cartBadge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: PRIMARY, width: 18, height: 18,
    borderRadius: 9, alignItems: 'center', justifyContent: 'center',
  },
  cartBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800' },

  sortBar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 12, backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 12,
  },
  resultCount: { fontSize: 13, fontWeight: '700', color: '#64748B', flexShrink: 0 },
  sortChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  sortChipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  sortChipText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  sortChipTextActive: { color: '#FFF' },

  scroll: { padding: 16, paddingBottom: 120 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },

  // Card
  cardWrap: { width: CARD_W },
  card: {
    backgroundColor: '#FFF', borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07, shadowRadius: 12, elevation: 4,
  },
  imgWrap: {
    width: '100%', height: 150,
    backgroundColor: '#F1F5F9',
    position: 'relative',
  },
  img: { width: '100%', height: '100%' },
  vegBadge: {
    position: 'absolute', top: 8, left: 8,
    width: 18, height: 18, borderRadius: 4,
    borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  vegDot: { width: 9, height: 9, borderRadius: 5 },

  info: { padding: 12 },
  productName: { fontSize: 13, fontWeight: '700', color: '#0F172A', lineHeight: 18, marginBottom: 3 },
  shopName: { fontSize: 11, color: '#94A3B8', fontWeight: '500', marginBottom: 6 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  price: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  mrp: { fontSize: 12, color: '#94A3B8', fontWeight: '500', textDecorationLine: 'line-through' },

  addBtn: {
    borderWidth: 1.5, borderColor: PRIMARY, borderRadius: 8,
    paddingVertical: 7, alignItems: 'center', justifyContent: 'center',
  },
  addBtnActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  addBtnText: { fontSize: 13, fontWeight: '800', color: PRIMARY },

  // States
  centered: { flex: 1, alignItems: 'center', paddingTop: 80 },
  loadingText: { marginTop: 12, color: '#64748B', fontWeight: '500' },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#94A3B8', fontWeight: '500', marginTop: 4 },
});
