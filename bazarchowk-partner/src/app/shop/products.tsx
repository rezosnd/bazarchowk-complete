import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import * as SecureStore from 'expo-secure-store';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://bazarchowk-complete.vercel.app';

export default function ShopProductsScreen() {
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      // In production, pass shopId from auth store
      const shopId = await SecureStore.getItemAsync('bazar_shop_id');
      if (!shopId) throw new Error('Shop ID not found in session');
      
      const res = await fetch(`${API_BASE}/products?shopId=${shopId}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00B140" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Inventory</Text>
          <Text style={styles.subtitle}>{products.length} Products listed</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/shop/addProduct')}>
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {products.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyText}>No products yet.</Text>
            <Text style={styles.emptySub}>Add your first product to start selling.</Text>
          </View>
        ) : (
          products.map((product) => {
            const totalStock = product.variants?.reduce((sum: number, v: any) => sum + v.stock, 0) || 0;
            const primaryImg = product.images?.[0]?.imageUrl;

            return (
              <TouchableOpacity key={product.id} style={styles.card} activeOpacity={0.7}>
                {primaryImg ? (
                  <Image source={{ uri: primaryImg }} style={styles.image} contentFit="cover" />
                ) : (
                  <View style={[styles.image, { alignItems: 'center', justifyContent: 'center' }]}>
                    <Ionicons name="cube" size={24} color="#94A3B8" />
                  </View>
                )}
                <View style={styles.info}>
                  <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                  <Text style={styles.price}>â‚¹{product.basePrice}</Text>
                  
                  <View style={styles.metaRow}>
                    <Text style={styles.variantsText}>{product.variants?.length || 0} Variants</Text>
                    {totalStock > 0 ? (
                      <View style={styles.stockBadge}>
                        <Text style={styles.stockText}>{totalStock} in stock</Text>
                      </View>
                    ) : (
                      <View style={[styles.stockBadge, { backgroundColor: '#FEE2E2' }]}>
                        <Text style={[styles.stockText, { color: '#DC2626' }]}>Out of Stock</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E2E8F0',
  },
  title: { fontSize: 28, fontWeight: '800', color: '#0F172A' },
  subtitle: { fontSize: 14, color: '#64748B', fontWeight: '500', marginTop: 4 },
  addBtn: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#00B140',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#00B140', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  scroll: { padding: 16, gap: 16, paddingBottom: 100 },
  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginTop: 16 },
  emptySub: { fontSize: 14, color: '#64748B', marginTop: 8 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', padding: 12, borderRadius: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  image: { width: 64, height: 64, borderRadius: 12, backgroundColor: '#F8FAFC' },
  info: { flex: 1, marginLeft: 16 },
  productName: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  price: { fontSize: 15, fontWeight: '800', color: '#00B140', marginBottom: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  variantsText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  stockBadge: { backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  stockText: { fontSize: 10, fontWeight: '800', color: '#059669' },
});
