import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import api from '@/services/api';
import { useCartStore } from '@/store/cart.store';

const PRIMARY = '#00B140';

export default function CategoryDetailScreen() {
  const { id, name } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const { cart } = useCartStore();
  const itemsCount = cart?.items?.reduce((acc: number, item: any) => acc + item.quantity, 0) || 0;

  useEffect(() => {
    fetchProducts();
  }, [id]);

  const fetchProducts = async () => {
    try {
      // id here is the subCategoryId from the GridCard
      const productsRes = await api.get(`/products?subCategoryId=${id}`);
      setProducts(productsRes.data);
    } catch (e) {
      console.warn('Failed to load products', e);
      Alert.alert('Error', 'Failed to load products for this category');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{name || 'Category'}</Text>
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
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={PRIMARY} />
          </View>
        ) : (
          <View style={styles.productsContainer}>
            <Text style={styles.sectionTitle}>Items in {name}</Text>
            
            {products.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="cube-outline" size={48} color="#CBD5E1" />
                <Text style={styles.emptyText}>No items available yet.</Text>
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
                        <Text style={styles.shopName} numberOfLines={1}>By {product.shop?.name || 'Shop'}</Text>
                        <Text style={styles.productPrice}>₹{product.basePrice}</Text>
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
  center: { marginTop: 40, alignItems: 'center' },
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
  productName: { fontSize: 14, fontWeight: '600', color: '#0F172A', marginBottom: 2, height: 40 },
  shopName: { fontSize: 11, color: '#64748B', marginBottom: 4 },
  productPrice: { fontSize: 16, fontWeight: '800', color: PRIMARY },
});
