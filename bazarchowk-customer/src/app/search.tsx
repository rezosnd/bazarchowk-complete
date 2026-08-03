import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import api from '@/services/api';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store';

const PRIMARY = '#00B140';

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ products: any[]; shops: any[] }>({ products: [], shops: [] });
  const [loading, setLoading] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  
  // Use AuthStore and useQuery to get the default location
  const { isAuthenticated } = useAuthStore();
  const { data: addresses = [] } = useQuery({
    queryKey: ['addresses'],
    queryFn: async () => {
      const res = await api.get('/addresses');
      return res.data;
    },
    enabled: isAuthenticated
  });

  const fetchSearch = async (text: string) => {
    if (!text.trim()) {
      setResults({ products: [], shops: [] });
      setLoading(false);
      return;
    }

    try {
      let lat = '';
      let lng = '';
      const defaultAddress = addresses.find((a: any) => a.isDefault) || addresses[0];
      if (defaultAddress && defaultAddress.latitude && defaultAddress.longitude) {
        lat = defaultAddress.latitude;
        lng = defaultAddress.longitude;
      }
      
      const { data } = await api.get(`/search?query=${encodeURIComponent(text)}&lat=${lat}&lng=${lng}`);
      setResults(data.results || { products: [], shops: [] });
    } catch (e) {
      console.warn('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleTextChange = (text: string) => {
    setQuery(text);
    setLoading(true);

    if (typingTimeout) clearTimeout(typingTimeout);
    setTypingTimeout(
      setTimeout(() => {
        fetchSearch(text);
      }, 500)
    );
  };

  const clearSearch = () => {
    setQuery('');
    setResults({ products: [], shops: [] });
    setLoading(false);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Search Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search shops or products..."
            placeholderTextColor="#94A3B8"
            autoFocus
            value={query}
            onChangeText={handleTextChange}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {!query ? (
          <View style={styles.emptyState}>
            <View style={styles.tagCloud}>
              <Text style={styles.sectionTitle}>Trending Searches</Text>
              <View style={styles.tagsRow}>
                {['Fresh Milk', 'Organic Tomatoes', 'Bread', 'Paneer', 'Pet Food'].map((tag) => (
                  <TouchableOpacity key={tag} style={styles.tagBtn} onPress={() => handleTextChange(tag)}>
                    <Ionicons name="trending-up" size={12} color={PRIMARY} />
                    <Text style={styles.tagText}>{tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        ) : loading ? (
          <View style={styles.centerLoad}>
            <ActivityIndicator size="large" color={PRIMARY} />
            <Text style={styles.loadText}>Searching PostgreSQL Full Text Index...</Text>
          </View>
        ) : (
          <View>
            {/* Shops Results */}
            {results.shops?.length > 0 && (
              <View style={styles.resultSection}>
                <Text style={styles.sectionTitle}>Shops</Text>
                {results.shops.map((shop: any) => (
                  <TouchableOpacity 
                    key={shop.id} 
                    style={styles.shopCard} 
                    activeOpacity={0.7}
                    onPress={() => router.push(`/services/${shop.id}` as any)}
                  >
                    {shop.logoUrl ? (
                      <Image source={{ uri: shop.logoUrl }} style={styles.shopImg} />
                    ) : (
                      <View style={[styles.shopImg, { alignItems: 'center', justifyContent: 'center' }]}>
                        <Ionicons name="storefront" size={24} color="#94A3B8" />
                      </View>
                    )}
                    <View style={styles.shopInfo}>
                      <Text style={styles.shopName} numberOfLines={1}>{shop.name}</Text>
                      <View style={styles.shopMetaRow}>
                        <Ionicons name="location" size={12} color="#64748B" />
                        <Text style={styles.shopMeta}>{shop.city || 'Local'}</Text>
                        <Text style={styles.shopMetaDot}>•</Text>
                        <Text style={styles.shopMeta}>{shop.deliveryRadius}km</Text>
                      </View>
                    </View>
                    <View style={{ backgroundColor: '#DBEAFE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                      <Text style={{ color: '#2563EB', fontSize: 12, fontWeight: '700' }}>Book</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Products Results */}
            {results.products?.length > 0 && (
              <View style={styles.resultSection}>
                <Text style={styles.sectionTitle}>Products</Text>
                {results.products.map((product: any) => {
                  const image = product.images?.[0]?.imageUrl;
                  const variant = product.variants?.[0];
                  
                  return (
                    <TouchableOpacity 
                      key={product.id} 
                      style={styles.productCard} 
                      activeOpacity={0.7}
                      onPress={() => router.push(`/product/${product.id}` as any)}
                    >
                      {image ? (
                        <Image source={{ uri: image }} style={styles.productImg} />
                      ) : (
                        <View style={[styles.productImg, { alignItems: 'center', justifyContent: 'center' }]}>
                          <Ionicons name="cube" size={24} color="#94A3B8" />
                        </View>
                      )}
                      <View style={styles.productInfo}>
                        <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                        <Text style={styles.productShop} numberOfLines={1}>by {product.shop?.name}</Text>
                        <View style={styles.priceRow}>
                          <Text style={styles.price}>₹{variant?.price || product.basePrice}</Text>
                          {variant && variant.stock > 0 ? (
                            <Text style={styles.stockText}>{variant.stock} in stock</Text>
                          ) : (
                            <Text style={[styles.stockText, { color: '#DC2626' }]}>Out of Stock</Text>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {results.products?.length === 0 && results.shops?.length === 0 && (
              <View style={styles.noResults}>
                <Ionicons name="search-outline" size={48} color="#CBD5E1" />
                <Text style={styles.noResultsTitle}>No results found</Text>
                <Text style={styles.noResultsSub}>Try adjusting your search terms</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderColor: '#F1F5F9',
  },
  backBtn: { marginRight: 12 },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8FAFC', borderRadius: 12,
    paddingHorizontal: 12, height: 44,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 16, color: '#0F172A' },
  clearBtn: { padding: 4 },
  
  scroll: { padding: 16, paddingBottom: 100 },
  
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 16 },
  
  emptyState: { marginTop: 8 },
  tagCloud: { marginBottom: 32 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tagBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F0FDF4', paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1, borderColor: '#DCFCE7',
  },
  tagText: { color: PRIMARY, fontWeight: '600', fontSize: 13 },
  
  centerLoad: { alignItems: 'center', marginTop: 100 },
  loadText: { marginTop: 12, fontSize: 14, color: '#64748B', fontWeight: '500' },
  
  resultSection: { marginBottom: 32 },
  
  shopCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8FAFC', padding: 12, borderRadius: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  shopImg: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#E2E8F0' },
  shopInfo: { flex: 1, marginLeft: 12 },
  shopName: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  shopMetaRow: { flexDirection: 'row', alignItems: 'center' },
  shopMeta: { fontSize: 12, color: '#64748B', marginLeft: 4 },
  shopMetaDot: { fontSize: 12, color: '#CBD5E1', marginHorizontal: 6 },
  
  productCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', padding: 12, borderRadius: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  productImg: { width: 64, height: 64, borderRadius: 12, backgroundColor: '#F8FAFC' },
  productInfo: { flex: 1, marginLeft: 12 },
  productName: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  productShop: { fontSize: 12, color: '#64748B', marginTop: 2, marginBottom: 6 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  price: { fontSize: 16, fontWeight: '800', color: PRIMARY },
  stockText: { fontSize: 11, fontWeight: '600', color: '#059669', backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  
  noResults: { alignItems: 'center', marginTop: 80 },
  noResultsTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginTop: 16 },
  noResultsSub: { fontSize: 14, color: '#64748B', marginTop: 8 },
});
