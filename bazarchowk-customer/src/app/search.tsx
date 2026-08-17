import { Text as AppText } from '@/components/TranslatedText';
import React, { useState, useEffect, useRef } from 'react';
import {
  View, StyleSheet, TextInput, FlatList,
  TouchableOpacity, ActivityIndicator, Keyboard, ScrollView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import api from '@/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import { HomeService } from '@/services/home.service';
import { useCurrentLocation } from '@/hooks';

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

  const location = useCurrentLocation();
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem('recent_searches').then((res) => {
      if (res) setRecentSearches(JSON.parse(res));
    });
  }, []);

  const saveRecentSearch = (text: string) => {
    const t = text.trim();
    if (!t) return;
    const newRecents = [t, ...recentSearches.filter(x => x !== t)].slice(0, 8);
    setRecentSearches(newRecents);
    AsyncStorage.setItem('recent_searches', JSON.stringify(newRecents)).catch(() => {});
  };

  const { data: recommendedProducts = [] } = useQuery({ 
    queryKey: ['recommendedProducts', location?.lat, location?.lng, location?.city], 
    queryFn: () => HomeService.getRecommendedProducts(location?.lat, location?.lng, location?.city),
    enabled: !!location?.lat || !!location?.city
  });

  const { data: nearbyShops = [] } = useQuery({ 
    queryKey: ['shops', location?.lat, location?.lng, location?.city], 
    queryFn: () => HomeService.getNearbyShops(location?.lat, location?.lng, location?.city),
    enabled: !!location?.lat || !!location?.city 
  });

  const totalResults = products.length + shops.length + services.length;

  const doSearch = async (text: string) => {
    if (!text.trim()) {
      setProducts([]); setShops([]); setServices([]);
      setSearched(false); setLoading(false);
      return;
    }
    saveRecentSearch(text);
    setLoading(true);
    try {
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
          <AppText style={styles.productName} numberOfLines={2}>{p.name}</AppText>
          {p.shop?.name && (
            <AppText style={styles.productShop} numberOfLines={1}>
              <Ionicons name="storefront-outline" size={12} color="#66736B" /> {p.shop.name}
            </AppText>
          )}
          <View style={styles.priceRow}>
            <AppText style={styles.price}>₹{price}</AppText>
            <View style={[styles.stockBadge, { backgroundColor: inStock ? '#EAF8F0' : '#FEE2E2' }]}>
              <AppText style={[styles.stockText, { color: inStock ? '#008F3C' : '#DC2626' }]}>
                {inStock ? 'In Stock' : 'Out of Stock'}
              </AppText>
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
        <AppText style={styles.shopName} numberOfLines={1}>{s.name}</AppText>
        {s.city && <AppText style={styles.shopCity}><Ionicons name="location-outline" size={12} color="#66736B" /> {s.city}</AppText>}
        <View style={styles.shopTagRow}>
          {s.hasProducts && <View style={styles.tagChip}><Ionicons name="cart-outline" size={12} color="#008F3C" /><AppText style={styles.tagChipText}> Delivery</AppText></View>}
          {s.hasServices && <View style={[styles.tagChip, { backgroundColor: '#F3E8FF' }]}><Ionicons name="cut-outline" size={12} color="#7C3AED" /><AppText style={[styles.tagChipText, { color: '#7C3AED' }]}> Services</AppText></View>}
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
        <AppText style={styles.serviceName}>{s.name}</AppText>
        {s.shop?.name && <AppText style={styles.serviceShop}>by {s.shop.name}</AppText>}
      </View>
      {s.price && <AppText style={styles.servicePrice}>₹{s.price}</AppText>}
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#122018" />
        </TouchableOpacity>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={PRIMARY} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Search products, shops..."
            placeholderTextColor="#8B9690"
            value={query}
            onChangeText={handleChange}
            returnKeyType="search"
            onSubmitEditing={() => { if (timerRef.current) clearTimeout(timerRef.current); doSearch(query); }}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={clearSearch}>
              <Ionicons name="close-circle" size={18} color="#8B9690" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {searched && totalResults > 0 && (
        <View style={styles.tabBar}>
          {(['all', 'products', 'shops', 'services'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <AppText style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === 'products' && products.length > 0 ? ` (${products.length})` : ''}
                {tab === 'shops' && shops.length > 0 ? ` (${shops.length})` : ''}
                {tab === 'services' && services.length > 0 ? ` (${services.length})` : ''}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {!query.trim() ? (
        <ScrollView style={styles.emptyWrap} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          {recentSearches.length > 0 && (
            <View style={styles.sectionContainer}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <Ionicons name="time-outline" size={20} color={PRIMARY} />
                <AppText style={[styles.trendingTitle, { marginBottom: 0, marginLeft: 8 }]}>Recent Searches</AppText>
              </View>
              <View style={styles.tagsWrap}>
                {recentSearches.map(tag => (
                  <TouchableOpacity key={tag} style={styles.trendTag} onPress={() => handleTrending(tag)}>
                    <AppText style={styles.trendTagText}>{tag}</AppText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.sectionContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Ionicons name="grid-outline" size={20} color={PRIMARY} />
              <AppText style={[styles.trendingTitle, { marginBottom: 0, marginLeft: 8 }]}>Browse Categories</AppText>
            </View>
            <View style={styles.catGrid}>
              {[
                { name: 'Grocery', icon: 'cart-outline', route: '/categories' },
                { name: 'Salon', icon: 'cut-outline', route: '/service-category?type=Salon' },
                { name: 'Plumber', icon: 'build-outline', route: '/service-category?type=Plumber' },
                { name: 'Electrician', icon: 'flash-outline', route: '/service-category?type=Electrician' },
              ].map(c => (
                <TouchableOpacity key={c.name} style={styles.catBtn} onPress={() => router.push(c.route as any)}>
                  <Ionicons name={c.icon as any} size={28} color={PRIMARY} />
                  <AppText style={styles.catBtnText}>{c.name}</AppText>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {recommendedProducts.length > 0 && (
            <View style={styles.sectionContainer}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <Ionicons name="flame-outline" size={20} color={PRIMARY} />
                <AppText style={[styles.trendingTitle, { marginBottom: 0, marginLeft: 8 }]}>Popular Near You</AppText>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                {recommendedProducts.slice(0, 6).map((prod: any) => (
                  <TouchableOpacity key={prod.id} style={styles.homeProdCard} activeOpacity={0.9} onPress={() => router.push(`/product/${prod.id}`)}>
                    {prod.images?.[0]?.imageUrl ? (
                      <Image source={{ uri: prod.images[0].imageUrl }} style={styles.homeProdImg} contentFit="cover" />
                    ) : (
                      <View style={[styles.homeProdImg, { backgroundColor: '#EAF8F0', alignItems: 'center', justifyContent: 'center' }]}>
                        <Ionicons name="cube-outline" size={28} color="#CBD5E1" />
                      </View>
                    )}
                    <AppText style={styles.homeProdName} numberOfLines={1}>{prod.name}</AppText>
                    <View style={styles.homeProdPriceRow}>
                      <AppText style={styles.homeProdPrice}>₹{prod.variants?.[0]?.price || prod.basePrice}</AppText>
                      <View style={styles.addBtnSmall}>
                        <Ionicons name="add" size={14} color={PRIMARY} />
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {nearbyShops.length > 0 && (
            <View style={styles.sectionContainer}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <Ionicons name="storefront-outline" size={20} color={PRIMARY} />
                <AppText style={[styles.trendingTitle, { marginBottom: 0, marginLeft: 8 }]}>Nearby Shops</AppText>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                {nearbyShops.slice(0, 5).map((shop: any) => (
                  <TouchableOpacity key={shop.id} style={styles.homeShopCard} activeOpacity={0.9} onPress={() => router.push(`/shop/${shop.id}`)}>
                    <View style={styles.homeShopImgWrapper}>
                      {shop.bannerUrl || shop.logoUrl ? (
                        <Image source={{ uri: shop.bannerUrl || shop.logoUrl }} style={styles.homeShopImg} contentFit="cover" />
                      ) : (
                        <View style={[styles.homeShopImg, { backgroundColor: '#EAF8F0', alignItems: 'center', justifyContent: 'center' }]}>
                          <Ionicons name="storefront-outline" size={28} color="#CBD5E1" />
                        </View>
                      )}
                      {shop.status?.isOpen && (
                        <View style={styles.openBadge}>
                          <AppText style={styles.openBadgeTxt}>OPEN</AppText>
                        </View>
                      )}
                    </View>
                    <AppText style={styles.homeShopName} numberOfLines={1}>{shop.name}</AppText>
                    <AppText style={styles.homeShopMeta}>
                      {shop.distanceKm ? `${shop.distanceKm.toFixed(1)} km` : 'Near you'} • ★ {shop.rating?.toFixed(1) || '4.5'}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </ScrollView>
      ) : loading ? (
        <View style={styles.centerLoad}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <AppText style={styles.loadText}>Searching...</AppText>
        </View>
      ) : searched && totalResults === 0 ? (
        <View style={styles.noResults}>
          <Ionicons name="search" size={56} color="#CBD5E1" />
          <AppText style={styles.noResultsTitle}>No results for "{query}"</AppText>
          <AppText style={styles.noResultsSub}>Try different keywords or check spelling</AppText>
          <View style={[styles.tagsWrap, { marginTop: 24, flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', paddingHorizontal: 20 }]}>
            {TRENDING.slice(0, 4).map(tag => (
              <TouchableOpacity key={tag} style={styles.trendTag} onPress={() => handleTrending(tag)}>
                <AppText style={styles.trendTagText}>{tag}</AppText>
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
            if (item.type === 'section') return <AppText style={styles.sectionTitle}>{item.title}</AppText>;
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
  container: { flex: 1, backgroundColor: '#F7FAF8' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderColor: '#E5EBE7', gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F7FAF8', alignItems: 'center', justifyContent: 'center' },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 20, paddingHorizontal: 16, height: 50, borderWidth: 1, borderColor: '#E5EBE7', gap: 10 },
  searchInput: { flex: 1, fontSize: 16, color: '#122018', fontWeight: '500' },

  tabBar: { flexDirection: 'row', backgroundColor: '#FFFFFF', paddingHorizontal: 8, borderBottomWidth: 1, borderColor: '#E5EBE7' },
  tab: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 2, borderColor: 'transparent' },
  tabActive: { borderColor: PRIMARY },
  tabText: { fontSize: 13, fontWeight: '600', color: '#66736B' },
  tabTextActive: { color: PRIMARY, fontWeight: '700' },

  list: { padding: 16, paddingBottom: 80 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#122018', marginBottom: 14, marginTop: 8 },

  productCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E5EBE7', shadowColor: '#00B140', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
  productImg: { width: 76, height: 76, borderRadius: 16 },
  placeholder: { backgroundColor: '#F7FAF8', alignItems: 'center', justifyContent: 'center' },
  productInfo: { flex: 1, marginLeft: 16, justifyContent: 'center' },
  productName: { fontSize: 15, fontWeight: '700', color: '#122018', marginBottom: 4 },
  productShop: { fontSize: 13, color: '#66736B', fontWeight: '500', marginBottom: 10 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  price: { fontSize: 16, fontWeight: '700', color: PRIMARY },
  stockBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  stockText: { fontSize: 11, fontWeight: '700' },

  shopCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E5EBE7', gap: 14, shadowColor: '#00B140', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
  shopImg: { width: 56, height: 56, borderRadius: 16 },
  shopInfo: { flex: 1 },
  shopName: { fontSize: 16, fontWeight: '700', color: '#122018', marginBottom: 4 },
  shopCity: { fontSize: 13, color: '#66736B', marginBottom: 8 },
  shopTagRow: { flexDirection: 'row', gap: 6 },
  tagChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EAF8F0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  tagChipText: { fontSize: 11, fontWeight: '700', color: '#008F3C' },

  serviceCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E5EBE7', gap: 14, shadowColor: '#00B140', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
  serviceIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#EAF8F0', alignItems: 'center', justifyContent: 'center' },
  serviceName: { fontSize: 16, fontWeight: '700', color: '#122018' },
  serviceShop: { fontSize: 13, color: '#66736B', marginTop: 4 },
  servicePrice: { fontSize: 16, fontWeight: '700', color: PRIMARY },

  emptyWrap: { flex: 1, padding: 20 },
  sectionContainer: { marginBottom: 28 },
  trendingTitle: { fontSize: 18, fontWeight: '700', color: '#122018', marginBottom: 16 },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  trendTag: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, borderWidth: 1, borderColor: '#E5EBE7', shadowColor: '#00B140', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
  trendTagText: { color: '#122018', fontWeight: '600', fontSize: 13 },
  
  catGrid: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap' },
  catBtn: { width: '48%', marginBottom: 16, backgroundColor: '#FFFFFF', borderRadius: 20, paddingVertical: 20, paddingHorizontal: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E5EBE7', shadowColor: '#00B140', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
  catBtnText: { fontSize: 14, fontWeight: '700', color: '#122018', marginTop: 10, textAlign: 'center' },

  homeProdCard: { width: 140, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#E5EBE7', shadowColor: '#00B140', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
  homeProdImg: { width: '100%', height: 100, borderRadius: 12, marginBottom: 8 },
  homeProdName: { fontSize: 13, fontWeight: '700', color: '#122018', marginBottom: 8 },
  homeProdPriceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  homeProdPrice: { fontSize: 14, fontWeight: '700', color: PRIMARY },
  addBtnSmall: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#EAF8F0', alignItems: 'center', justifyContent: 'center' },

  homeShopCard: { width: 220, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#E5EBE7', shadowColor: '#00B140', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
  homeShopImgWrapper: { width: '100%', height: 120, borderRadius: 12, marginBottom: 12, overflow: 'hidden' },
  homeShopImg: { width: '100%', height: '100%' },
  homeShopName: { fontSize: 15, fontWeight: '700', color: '#122018', marginBottom: 4 },
  homeShopMeta: { fontSize: 12, color: '#66736B' },
  openBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: '#FFFFFF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  openBadgeTxt: { fontSize: 9, fontWeight: '800', color: PRIMARY },

  centerLoad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadText: { marginTop: 16, fontSize: 15, color: '#66736B', fontWeight: '500' },
  noResults: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  noResultsTitle: { fontSize: 20, fontWeight: '700', color: '#122018', marginTop: 24, textAlign: 'center' },
  noResultsSub: { fontSize: 15, color: '#66736B', marginTop: 8, textAlign: 'center' },
});
