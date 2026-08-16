import React, { useState } from 'react';
import {
  ScrollView, StyleSheet, Text, TouchableOpacity, View,
  Dimensions, ActivityIndicator, TextInput, FlatList
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useCategories } from '@/hooks';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import api from '@/services/api';
import { useAuthStore } from '@/store';
import { LanguageSelector } from '@/components/LanguageSelector';
import { useTranslation } from 'react-i18next';

const { width: W } = Dimensions.get('window');
const PADDING_H = 16;
const PRIMARY = '#00B140';

export default function CategoriesScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const [search, setSearch] = useState('');

  const { data: addresses = [] } = useQuery({
    queryKey: ['addresses'],
    queryFn: async () => { const res = await api.get('/addresses'); return res.data; },
    enabled: isAuthenticated,
  });

  const defaultAddress = addresses.find((a: any) => a.isDefault) || addresses[0];
  const displayLocation = defaultAddress
    ? `${defaultAddress.title || defaultAddress.type || 'Home'} · ${defaultAddress.city}`
    : 'Select Location';

  const { data: dynamicCategories = [], isLoading } = useCategories(defaultAddress?.city);

  const filtered = (dynamicCategories as any[]).filter((cat: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      cat.name?.toLowerCase().includes(q) ||
      cat.subCategories?.some((s: any) => s.name?.toLowerCase().includes(q))
    );
  });

  const renderCategoryItem = (item: any, index: number) => {
    const PLACEHOLDER = 'https://cdn-icons-png.flaticon.com/512/4359/4359628.png';
    return (
      <Animated.View key={item.id} entering={FadeInDown.delay(index * 20).springify().damping(15)} style={styles.gridItem}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push(`/category/${item.id}?name=${encodeURIComponent(item.name || 'Category')}` as any)}
          style={styles.gridItemContent}
        >
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: item.imageUrl || PLACEHOLDER }}
              style={styles.categoryImage}
              contentFit="cover"
              transition={200}
            />
          </View>
          <Text style={styles.categoryName} numberOfLines={2} ellipsizeMode="tail">
            {item.name}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: '#F7FAF8' }]}>
      <View style={styles.stickyWrap}>
        <BlurView intensity={90} tint="light" style={StyleSheet.absoluteFill} />
        <View style={[styles.headerInner, { paddingTop: insets.top + 10 }]}>
          {/* Location row */}
          <View style={styles.locRow}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Feather name="navigation" size={12} color="#00B140" style={{ marginRight: 4 }} />
                <Text style={styles.locLabel}>DELIVERING TO</Text>
              </View>
              <TouchableOpacity style={styles.locValueRow} activeOpacity={0.7}>
                <Text style={styles.locValue} numberOfLines={1}>{displayLocation}</Text>
                <Ionicons name="chevron-down" size={16} color="#122018" />
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <LanguageSelector />
              <TouchableOpacity style={styles.avatarBtn} activeOpacity={0.7} onPress={() => router.push('/profile' as any)}>
                <Image source={{ uri: 'https://ui-avatars.com/api/?name=User&background=0F172A&color=fff' }} style={styles.avatarImage} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Search bar */}
          <TouchableOpacity style={styles.searchBar} activeOpacity={0.9} onPress={() => router.push('/search')}>
            <Ionicons name="search" size={20} color="#00B140" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for groceries, food, or services..."
              placeholderTextColor="#8B9690"
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
            {search.length > 0 ? (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={20} color="#8B9690" />
              </TouchableOpacity>
            ) : (
              <View style={styles.micWrap}>
                <Ionicons name="mic" size={16} color="#00B140" />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100, paddingTop: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {!search && (
          <Animated.View entering={FadeInUp.delay(50).springify().damping(18)} style={styles.bannerWrap}>
            <LinearGradient colors={['#00B140', '#008F3C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.banner}>
              <View style={{ flex: 1 }}>
                <Text style={styles.bannerTitle}>Instant Delivery</Text>
                <Text style={styles.bannerSub}>Get your daily needs in minutes.</Text>
                <TouchableOpacity style={styles.bannerBtn}>
                  <Text style={styles.bannerBtnText}>Order Now</Text>
                </TouchableOpacity>
              </View>
              <Image source={require('@/assets/images/scooty.png')} style={styles.bannerImg} contentFit="contain" />
            </LinearGradient>
          </Animated.View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Shop by Category</Text>
          <Text style={styles.sectionSubtitle}>Everything you need, from local stores near you.</Text>
        </View>

        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={PRIMARY} />
            <Text style={styles.loadingText}>Loading fresh categories...</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.centered}>
            <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/7486/7486754.png' }} style={{ width: 100, height: 100, opacity: 0.5 }} />
            <Text style={styles.emptyTitle}>No matching categories</Text>
            <Text style={styles.emptyText}>Try searching for something else</Text>
          </View>
        ) : (
          <View style={styles.categoriesGrid}>
            {filtered.map((cat, idx) => renderCategoryItem(cat, idx))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7FAF8' },
  stickyWrap: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5EBE7',
    shadowColor: '#00B140',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 4,
    zIndex: 10,
  },
  headerInner: { paddingHorizontal: PADDING_H, paddingBottom: 16 },
  locRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, justifyContent: 'space-between' },
  locLabel: { fontSize: 11, fontWeight: '700', color: '#122018', letterSpacing: 0.5 },
  locValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  locValue: { fontSize: 18, fontWeight: '800', color: '#122018', maxWidth: W * 0.55 },
  avatarBtn: { padding: 2 },
  avatarImage: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F7FAF8' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 20,
    paddingHorizontal: 16, height: 56,
    borderWidth: 1, borderColor: '#E5EBE7',
    gap: 12,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#122018', fontWeight: '500' },
  micWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EAF8F0', alignItems: 'center', justifyContent: 'center' },

  bannerWrap: { marginHorizontal: PADDING_H, marginBottom: 24 },
  banner: {
    height: 140, borderRadius: 24, padding: 20,
    flexDirection: 'row', alignItems: 'center', overflow: 'hidden',
    shadowColor: '#00B140', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 20, elevation: 8,
  },
  bannerTitle: { fontSize: 24, fontWeight: '800', color: '#FFF', letterSpacing: -0.5 },
  bannerSub: { fontSize: 13, color: '#D1FAE5', fontWeight: '600', marginTop: 4, marginBottom: 12 },
  bannerBtn: { backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, alignSelf: 'flex-start' },
  bannerBtnText: { color: PRIMARY, fontWeight: '700', fontSize: 13 },
  bannerImg: { width: 140, height: 140, position: 'absolute', right: -10, bottom: -5 },

  sectionHeader: { paddingHorizontal: PADDING_H, marginBottom: 20 },
  sectionTitle: { fontSize: 22, fontWeight: '700', color: '#122018', letterSpacing: -0.3 },
  sectionSubtitle: { fontSize: 14, color: '#66736B', marginTop: 4 },

  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 },
  gridItem: { width: (W - 24) / 4, alignItems: 'center', padding: 4, marginBottom: 20 },
  gridItemContent: { alignItems: 'center', width: '100%' },
  imageContainer: {
    width: 76, height: 76, borderRadius: 24, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
    shadowColor: '#00B140', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 12, elevation: 3,
    borderWidth: 1, borderColor: '#F3FBF5'
  },
  categoryImage: { width: 52, height: 52 },
  categoryName: { fontSize: 12, fontWeight: '600', color: '#122018', textAlign: 'center', lineHeight: 16 },

  centered: { alignItems: 'center', paddingVertical: 80, paddingHorizontal: 20 },
  loadingText: { marginTop: 16, color: '#66736B', fontWeight: '600', fontSize: 15 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#122018', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#66736B', fontWeight: '500', marginTop: 4, textAlign: 'center' },
});
