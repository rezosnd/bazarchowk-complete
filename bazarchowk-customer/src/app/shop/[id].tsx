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
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{shop?.name || 'Shop'}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.push('/cart')}>
          <Ionicons name="cart-outline" size={24} color="#0F172A" />
          {itemsCount > 0 && (
            <View style={{ position: 'absolute', top: -4, right: -4, backgroundColor: PRIMARY, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#FFF', fontSize: 10, fontWeight: 'bold' }}>{itemsCount}</Text>
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
              <Ionicons name="storefront" size={40} color="#94A3B8" />
            </View>
          )}
          <Text style={styles.shopName}>{shop.name}</Text>
          <Text style={styles.shopDescription}>{shop.description || 'Welcome to our shop!'}</Text>
          
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, { backgroundColor: shop.isOpen ? '#DCFCE7' : '#FEE2E2' }]}>
              <Text style={[styles.statusText, { color: shop.isOpen ? '#059669' : '#DC2626' }]}>
                {shop.isOpen ? 'OPEN NOW' : 'CLOSED'}
              </Text>
            </View>
            {shop.reason && <Text style={styles.reasonText}>({shop.reason})</Text>}
          </View>

          <TouchableOpacity style={styles.reviewBtn} onPress={() => router.push(`/shop/${id}/reviews` as any)}>
            <Ionicons name="star" size={16} color="#F59E0B" />
            <Text style={styles.reviewBtnText}>Ratings & Reviews</Text>
          </TouchableOpacity>
        </View>

        {/* Products Grid */}
        <View style={styles.productsContainer}>
          <Text style={styles.sectionTitle}>Products</Text>
          
          {products.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="cube-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyText}>No products available yet.</Text>
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
                      <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                      <Text style={styles.productPrice}>₹{product.basePrice}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 16, backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#F8FAFC',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', flex: 1, textAlign: 'center', marginHorizontal: 16 },
  
  shopBanner: {
    backgroundColor: '#FFF', padding: 24, alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  shopLogo: { width: 100, height: 100, borderRadius: 50, marginBottom: 16 },
  shopLogoPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  shopName: { fontSize: 24, fontWeight: '800', color: '#0F172A', marginBottom: 8, textAlign: 'center' },
  shopDescription: { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 16, paddingHorizontal: 20 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '800' },
  reasonText: { fontSize: 12, color: '#64748B', fontWeight: '500' },

  reviewBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB',
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginTop: 12,
    borderWidth: 1, borderColor: '#FEF3C7'
  },
  reviewBtnText: { fontSize: 14, fontWeight: '700', color: '#B45309', marginLeft: 6 },

  productsContainer: { padding: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 16 },
  emptyBox: { alignItems: 'center', padding: 40, backgroundColor: '#FFF', borderRadius: 16 },
  emptyText: { marginTop: 12, fontSize: 15, color: '#64748B', fontWeight: '500' },
  
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  productCard: {
    width: '48%', backgroundColor: '#FFF', borderRadius: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    overflow: 'hidden'
  },
  productImgContainer: { width: '100%', height: 140, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  productImg: { width: '100%', height: '100%' },
  productInfo: { padding: 12 },
  productName: { fontSize: 14, fontWeight: '600', color: '#0F172A', marginBottom: 4, height: 40 },
  productPrice: { fontSize: 16, fontWeight: '800', color: PRIMARY },
});
