import { Text as AppText } from '@/components/TranslatedText';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import api from '@/services/api';
import { useCartStore } from '@/store/cart.store';

const PRIMARY = '#00B140';

export default function ShopDetailScreen() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  
  const [shop, setShop] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const { cart } = useCartStore();
  const itemsCount = cart?.items?.reduce((acc: number, item: any) => acc + item.quantity, 0) || 0;

  useEffect(() => {
    fetchShopDetails();
  }, [id]);

  const fetchShopDetails = async () => {
    try {
      const [shopRes, productsRes] = await Promise.all([
        api.get(`/shops/${id}`),
        api.get(`/products?shopId=${id}`)
      ]);
      setShop(shopRes.data);
      setProducts(productsRes.data);
    } catch (e) {
      console.warn('Failed to load shop details', e);
      Alert.alert('Error', 'Failed to load shop details');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !shop) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#122018" />
        </TouchableOpacity>
        <AppText style={styles.headerTitle} numberOfLines={1}>{shop?.name || 'Shop'}</AppText>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.push('/cart')}>
          <Ionicons name="cart-outline" size={24} color="#122018" />
          {itemsCount > 0 && (
            <View style={{ position: 'absolute', top: -4, right: -4, backgroundColor: PRIMARY, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}>
              <AppText style={{ color: '#FFF', fontSize: 10, fontWeight: 'bold' }}>{itemsCount}</AppText>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Shop Info */}
        <View style={styles.shopBanner}>
          {shop.logoUrl ? (
            <Image source={{ uri: shop.logoUrl }} style={styles.shopLogo} contentFit="cover" />
          ) : (
            <View style={styles.shopLogoPlaceholder}>
              <Ionicons name="storefront" size={40} color="#8B9690" />
            </View>
          )}
          <AppText style={styles.shopName}>{shop.name}</AppText>
          <AppText style={styles.shopDescription}>{shop.description || 'Welcome to our shop!'}</AppText>
          
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, { backgroundColor: shop.isOpen ? '#EAF8F0' : '#FEE2E2' }]}>
              <AppText style={[styles.statusText, { color: shop.isOpen ? '#008F3C' : '#DC2626' }]}>
                {shop.isOpen ? 'OPEN NOW' : 'CLOSED'}
              </AppText>
            </View>
            {shop.reason && <AppText style={styles.reasonText}>({shop.reason})</AppText>}
          </View>

          <TouchableOpacity style={styles.reviewBtn} onPress={() => router.push(`/shop/${id}/reviews` as any)}>
            <Ionicons name="star" size={16} color="#F59E0B" />
            <AppText style={styles.reviewBtnText}>Ratings & Reviews</AppText>
          </TouchableOpacity>
        </View>

        {/* Services Booking Banner (if shop offers services) */}
        {shop.hasServices && (
          <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
            <TouchableOpacity 
              style={{
                backgroundColor: '#2563EB',
                padding: 16,
                borderRadius: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                shadowColor: '#2563EB',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 4
              }}
              onPress={() => router.push(`/services/${shop.id}` as any)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Ionicons name="calendar" size={24} color="#FFF" />
                </View>
                <View>
                  <AppText style={{ color: '#FFF', fontSize: 18, fontWeight: '800' }}>Book Appointment</AppText>
                  <AppText style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 }}>View services & timeslots</AppText>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* Products Grid */}
        {(shop.hasProducts || products.length > 0) && (
          <View style={styles.productsContainer}>
            <AppText style={styles.sectionTitle}>Products</AppText>
            
            {products.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="cube-outline" size={48} color="#CBD5E1" />
                <AppText style={styles.emptyText}>No products available yet.</AppText>
              </View>
            ) : (
              <View style={styles.grid}>
                {products.map((product) => {
                  const primaryImage = product.images?.find((img: any) => img.isPrimary)?.imageUrl 
                    || product.images?.[0]?.imageUrl;
                  
                  return (
                    <TouchableOpacity 
                      key={product.id} 
                      style={styles.productCard}
                      onPress={() => router.push(`/product/${product.id}`)}
                    >
                      <View style={styles.productImgContainer}>
                        {primaryImage ? (
                          <Image source={{ uri: primaryImage }} style={styles.productImg} contentFit="cover" />
                        ) : (
                          <Ionicons name="image-outline" size={32} color="#CBD5E1" />
                        )}
                      </View>
                      <View style={styles.productInfo}>
                        <AppText style={styles.productName} numberOfLines={2}>{product.name}</AppText>
                        <AppText style={styles.productPrice}>₹{product.basePrice}</AppText>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
  container: { flex: 1, backgroundColor: '#F7FAF8' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 16, backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#EAF8F0',
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#F7FAF8',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#122018', flex: 1, textAlign: 'center', marginHorizontal: 16 },
  
  shopBanner: {
    backgroundColor: '#FFF', padding: 24, alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: '#EAF8F0',
  },
  shopLogo: { width: 100, height: 100, borderRadius: 50, marginBottom: 16 },
  shopLogoPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#EAF8F0', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  shopName: { fontSize: 24, fontWeight: '800', color: '#122018', marginBottom: 8, textAlign: 'center' },
  shopDescription: { fontSize: 14, color: '#66736B', textAlign: 'center', marginBottom: 16, paddingHorizontal: 20 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '800' },
  reasonText: { fontSize: 12, color: '#66736B', fontWeight: '500' },

  reviewBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB',
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginTop: 12,
    borderWidth: 1, borderColor: '#FEF3C7'
  },
  reviewBtnText: { fontSize: 14, fontWeight: '700', color: '#B45309', marginLeft: 6 },

  productsContainer: { padding: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#122018', marginBottom: 16 },
  emptyBox: { alignItems: 'center', padding: 40, backgroundColor: '#FFF', borderRadius: 16 },
  emptyText: { marginTop: 12, fontSize: 15, color: '#66736B', fontWeight: '500' },
  
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  productCard: {
    width: '48%', backgroundColor: '#FFF', borderRadius: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    overflow: 'hidden'
  },
  productImgContainer: { width: '100%', height: 140, backgroundColor: '#EAF8F0', alignItems: 'center', justifyContent: 'center' },
  productImg: { width: '100%', height: '100%' },
  productInfo: { padding: 12 },
  productName: { fontSize: 14, fontWeight: '600', color: '#122018', marginBottom: 4, height: 40 },
  productPrice: { fontSize: 16, fontWeight: '800', color: PRIMARY },
});
