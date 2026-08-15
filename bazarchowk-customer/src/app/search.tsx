import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, FlatList,
  TouchableOpacity, ActivityIndicator, Keyboard
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import api from '@/services/api';

const PRIMARY = '#00B140';

const TRENDING = ['Fresh Milk', 'Eggs', 'Bread', 'Paneer', 'Rice', 'Vegetables', 'Fruits', 'Snacks'];

type Product = { id: string; name: string; images?: { imageUrl: string }[]; variants?: { price: number; stock: number }[]; basePrice?: number; shop?: { name: string } };
type Shop = { id: string; name: string; logoUrl?: string; city?: string; hasProducts?: boolean; hasServices?: boolean; category?: string };
type Service = { id: string; name: string; price?: number; shop?: { id: string; name: string } };

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const initialQ = Array.isArray(params.q) ? params.q[0] : (params.q as string) || '';

  const [query, setQuery] = useState(initialQ);
  const [products, setProducts] = useState<Product[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'products' | 'shops' | 'services'>('all');
  const inputRef = useRef<TextInput>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalResults = products.length + shops.length + services.length;

  const doSearch = async (text: string) => {
    if (!text.trim()) {
      setProducts([]); setShops([]); setServices([]);
      setSearched(false); setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Search without geo-filtering so all results appear
      const { data } = await api.get(`/search?query=${encodeURIComponent(text)}&limit=30`);
      const r = data?.results || data || {};
      setProducts(r.products || []);
      setShops(r.shops || []);
      setServices(r.services || []);
      setSearched(true);
    } catch (e) {
      console.warn('Search failed:', e);
      setProducts([]); setShops([]); setServices([]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialQ) {
      doSearch(initialQ);
      setActiveTab('all');
    }
    // auto-focus
    setTimeout(() => inputRef.current?.focus(), 200);
  }, []);

  const handleChange = (text: string) => {
    setQuery(text);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!text.trim()) {
      setProducts([]); setShops([]); setServices([]);
      setSearched(false); setLoading(false);
      return;
    }
    setLoading(true);
    timerRef.current = setTimeout(() => doSearch(text), 450);
  };

  const handleTrending = (tag: string) => {
    setQuery(tag);
    Keyboard.dismiss();
    doSearch(tag);
  };

  const clearSearch = () => {
    setQuery('');
    setProducts([]); setShops([]); setServices([]);
    setSearched(false);
    inputRef.current?.focus();
  };

  // ─── Render Helpers ───────────────────────────────────────────────

  const renderProduct = ({ item: p }: { item: Product }) => {
    const img = p.images?.[0]?.imageUrl;
    const variant = p.variants?.[0];
    const price = variant?.price ?? p.basePrice ?? 0;
    const inStock = !variant || (variant.stock ?? 0) > 0;

    return (
      <TouchableOpacity style={styles.productCard} onPress={() => router.push(`/product/${p.id}` as any)} activeOpacity={0.8}>
        {img ? (
          <Image source={{ uri: img }} style={styles.productImg} contentFit="cover" />
        ) : (
          <View style={[styles.productImg, styles.placeholder]}>
            <Ionicons name="cube-outline" size={28} color="#CBD5E1" />
          </View>
        )}
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>{p.name}</Text>
          {p.shop?.name && <Text style={styles.productShop} numberOfLines={1}>🏪 {p.shop.name}</Text>}
          <View style={styles.priceRow}>
            <Text style={styles.price}>₹{price}</Text>
            <View style={[styles.stockBadge, { backgroundColor: inStock ? '#DCFCE7' : '#FEE2E2' }]}>
              <Text style={[styles.stockText, { color: inStock ? '#16A34A' : '#DC2626' }]}>
                {inStock ? 'In Stock' : 'Out of Stock'}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderShop = ({ item: s }: { item: Shop }) => (
    <TouchableOpacity
      style={styles.shopCard}
      onPress={() => s.hasServices
        ? router.push(`/services/${s.id}` as any)
        : router.push(`/shop/${s.id}` as any)
      }
      activeOpacity={0.8}
    >
      {s.logoUrl ? (
        <Image source={{ uri: s.logoUrl }} style={styles.shopImg} contentFit="cover" />
      ) : (
        <View style={[styles.shopImg, styles.placeholder]}>
          <Ionicons name="storefront" size={24} color="#CBD5E1" />
        </View>
      )}
      <View style={styles.shopInfo}>
        <Text style={styles.shopName} numberOfLines={1}>{s.name}</Text>
        {s.city && <Text style={styles.shopCity}><Ionicons name="location-outline" size={12} color="#64748B" /> {s.city}</Text>}
        <View style={styles.shopTagRow}>
          {s.hasProducts && <View style={styles.tagChip}><Text style={styles.tagChipText}>🛒 Delivery</Text></View>}
          {s.hasServices && <View style={[styles.tagChip, { backgroundColor: '#EDE9FE' }]}><Text style={[styles.tagChipText, { color: '#7C3AED' }]}>✂️ Services</Text></View>}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
    </TouchableOpacity>
  );

  const renderService = ({ item: s }: { item: Service }) => (
    <TouchableOpacity
      style={styles.serviceCard}
      onPress={() => router.push(`/services/${s.shop?.id}` as any)}
      activeOpacity={0.8}
    >
      <View style={styles.serviceIcon}>
        <Ionicons name="briefcase-outline" size={22} color={PRIMARY} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.serviceName}>{s.name}</Text>
        {s.shop?.name && <Text style={styles.serviceShop}>by {s.shop.name}</Text>}
      </View>
      {s.price && <Text style={styles.servicePrice}>₹{s.price}</Text>}
    </TouchableOpacity>
  );

  const visibleProducts = activeTab === 'all' || activeTab === 'products' ? products : [];
  const visibleShops = activeTab === 'all' || activeTab === 'shops' ? shops : [];
  const visibleServices = activeTab === 'all' || activeTab === 'services' ? services : [];

  const flatData: any[] = [
    ...(visibleShops.length > 0 ? [{ type: 'section', title: `Shops (${visibleShops.length})` }, ...visibleShops.map(s => ({ type: 'shop', ...s }))] : []),
    ...(visibleProducts.length > 0 ? [{ type: 'section', title: `Products (${visibleProducts.length})` }, ...visibleProducts.map(p => ({ type: 'product', ...p }))] : []),
    ...(visibleServices.length > 0 ? [{ type: 'section', title: `Services (${visibleServices.length})` }, ...visibleServices.map(s => ({ type: 'service', ...s }))] : []),
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={PRIMARY} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Search products, shops..."
            placeholderTextColor="#94A3B8"
            value={query}
            onChangeText={handleChange}
            returnKeyType="search"
            onSubmitEditing={() => { if (timerRef.current) clearTimeout(timerRef.current); doSearch(query); }}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={clearSearch}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Tabs — only when results exist */}
      {searched && totalResults > 0 && (
        <View style={styles.tabBar}>
          {(['all', 'products', 'shops', 'services'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === 'products' && products.length > 0 ? ` (${products.length})` : ''}
                {tab === 'shops' && shops.length > 0 ? ` (${shops.length})` : ''}
                {tab === 'services' && services.length > 0 ? ` (${services.length})` : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Content */}
      {!query.trim() ? (
        // Empty state — trending tags
        <View style={styles.emptyWrap}>
          <Text style={styles.trendingTitle}>🔥 Trending Searches</Text>
          <View style={styles.tagsWrap}>
            {TRENDING.map(tag => (
              <TouchableOpacity key={tag} style={styles.trendTag} onPress={() => handleTrending(tag)}>
                <Ionicons name="trending-up" size={12} color={PRIMARY} />
                <Text style={styles.trendTagText}>{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.trendingTitle, { marginTop: 28 }]}>🏪 Browse Categories</Text>
          <View style={styles.catGrid}>
            {[
              { name: 'Grocery', icon: '🛒', route: '/categories' },
              { name: 'Salon', icon: '✂️', route: '/service-category?type=Salon' },
              { name: 'Plumber', icon: '🔧', route: '/service-category?type=Plumber' },
              { name: 'Electrician', icon: '⚡', route: '/service-category?type=Electrician' },
            ].map(c => (
              <TouchableOpacity key={c.name} style={styles.catBtn} onPress={() => router.push(c.route as any)}>
                <Text style={{ fontSize: 28 }}>{c.icon}</Text>
                <Text style={styles.catBtnText}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : loading ? (
        <View style={styles.centerLoad}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadText}>Searching...</Text>
        </View>
      ) : searched && totalResults === 0 ? (
        <View style={styles.noResults}>
          <Text style={{ fontSize: 56 }}>🔍</Text>
          <Text style={styles.noResultsTitle}>No results for "{query}"</Text>
          <Text style={styles.noResultsSub}>Try different keywords or check spelling</Text>
          <View style={[styles.tagsWrap, { marginTop: 24, flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', paddingHorizontal: 20 }]}>
            {TRENDING.slice(0, 4).map(tag => (
              <TouchableOpacity key={tag} style={styles.trendTag} onPress={() => handleTrending(tag)}>
                <Text style={styles.trendTagText}>{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <FlatList
          data={flatData}
          keyExtractor={(item, idx) => `${item.type}-${item.id || idx}`}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            if (item.type === 'section') {
              return <Text style={styles.sectionTitle}>{item.title}</Text>;
            }
            if (item.type === 'product') return renderProduct({ item });
            if (item.type === 'shop') return renderShop({ item });
            if (item.type === 'service') return renderService({ item });
            return null;
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#F1F5F9', gap: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 14, paddingHorizontal: 14, height: 46, borderWidth: 1, borderColor: '#E2E8F0', gap: 10 },
  searchInput: { flex: 1, fontSize: 16, color: '#0F172A', fontWeight: '500' },

  tabBar: { flexDirection: 'row', backgroundColor: '#FFF', paddingHorizontal: 8, borderBottomWidth: 1, borderColor: '#F1F5F9' },
  tab: { paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 2, borderColor: 'transparent' },
  tabActive: { borderColor: PRIMARY },
  tabText: { fontSize: 12, fontWeight: '600', color: '#94A3B8' },
  tabTextActive: { color: PRIMARY, fontWeight: '800' },

  list: { padding: 16, paddingBottom: 80 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: '#0F172A', marginBottom: 10, marginTop: 4 },

  // Product card
  productCard: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 18, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  productImg: { width: 72, height: 72, borderRadius: 14 },
  placeholder: { backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  productInfo: { flex: 1, marginLeft: 14, justifyContent: 'center' },
  productName: { fontSize: 15, fontWeight: '800', color: '#0F172A', marginBottom: 3 },
  productShop: { fontSize: 12, color: '#64748B', fontWeight: '500', marginBottom: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  price: { fontSize: 17, fontWeight: '900', color: PRIMARY },
  stockBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  stockText: { fontSize: 11, fontWeight: '700' },

  // Shop card
  shopCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 18, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9', gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  shopImg: { width: 52, height: 52, borderRadius: 14 },
  shopInfo: { flex: 1 },
  shopName: { fontSize: 15, fontWeight: '800', color: '#0F172A', marginBottom: 3 },
  shopCity: { fontSize: 12, color: '#64748B', marginBottom: 6 },
  shopTagRow: { flexDirection: 'row', gap: 6 },
  tagChip: { backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  tagChipText: { fontSize: 11, fontWeight: '700', color: '#16A34A' },

  // Service card
  serviceCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 18, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9', gap: 12 },
  serviceIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center' },
  serviceName: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  serviceShop: { fontSize: 12, color: '#64748B', marginTop: 2 },
  servicePrice: { fontSize: 16, fontWeight: '900', color: PRIMARY },

  // States
  emptyWrap: { flex: 1, padding: 20 },
  trendingTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 14 },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  trendTag: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F0FDF4', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: '#DCFCE7' },
  trendTagText: { color: PRIMARY, fontWeight: '700', fontSize: 13 },
  catGrid: { flexDirection: 'row', gap: 12, marginTop: 4, flexWrap: 'wrap' },
  catBtn: { flex: 1, minWidth: 80, backgroundColor: '#FFF', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  catBtnText: { fontSize: 13, fontWeight: '700', color: '#334155', marginTop: 6 },

  centerLoad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadText: { marginTop: 12, fontSize: 15, color: '#64748B', fontWeight: '500' },
  noResults: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  noResultsTitle: { fontSize: 20, fontWeight: '900', color: '#0F172A', marginTop: 16, textAlign: 'center' },
  noResultsSub: { fontSize: 14, color: '#64748B', marginTop: 8, textAlign: 'center' },
});
