import React, { useState } from 'react';
import {
  ScrollView, StyleSheet, Text, TouchableOpacity, View,
  Dimensions, ActivityIndicator, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown, FadeInUp, useSharedValue, useAnimatedStyle, withSpring,
} from 'react-native-reanimated';
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
const CARD_W = (W - PADDING_H * 2 - 12) / 2;
const CARD_H = 160;

// ─── Full-bleed Image Card (Zomato / Blinkit style) ──────────────────────────

function CategoryCard({ item, index }: { item: any; index: number }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const PLACEHOLDER = 'https://cdn-icons-png.flaticon.com/512/4359/4359628.png';

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 40).springify().damping(14)}
      style={styles.cardWrapper}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => router.push(`/category/${item.id}?name=${encodeURIComponent(item.name || 'Category')}` as any)}
        onPressIn={() => { scale.value = withSpring(0.96, { damping: 12 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 10 }); }}
      >
        <Animated.View style={[styles.card, animStyle]}>
          {/* Background image — full bleed */}
          <Image
            source={{ uri: item.imageUrl || PLACEHOLDER }}
            style={StyleSheet.absoluteFillObject}
            contentFit={item.imageUrl ? 'cover' : 'contain'}
          />

          {/* Gradient overlay so text is always readable */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.72)']}
            style={StyleSheet.absoluteFillObject}
          />

          {/* Name pill at bottom-left */}
          <View style={styles.cardLabel}>
            <Text style={styles.cardTitle} numberOfLines={2}>{item.name}</Text>
            {item.description ? (
              <Text style={styles.cardSub} numberOfLines={1}>{item.description}</Text>
            ) : null}
          </View>

          {/* Count badge if items exist */}
          {item._count?.products > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{item._count.products}</Text>
            </View>
          )}
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

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

  // Filter categories + their subcategories by search
  const filtered = (dynamicCategories as any[]).filter((cat: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      cat.name?.toLowerCase().includes(q) ||
      cat.subCategories?.some((s: any) => s.name?.toLowerCase().includes(q))
    );
  });

  return (
    <View style={[styles.root, { backgroundColor: '#F8FAFC' }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
      >
        {/* ── Sticky Header ── */}
        <View style={styles.stickyWrap}>
          <BlurView intensity={90} tint="light" style={StyleSheet.absoluteFill} />
          <View style={[styles.headerInner, { paddingTop: insets.top + 10 }]}>
            {/* Location row */}
            <View style={styles.locRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.locLabel}>DELIVERING TO</Text>
                <TouchableOpacity style={styles.locValueRow} activeOpacity={0.7}>
                  <Text style={styles.locValue} numberOfLines={1}>{displayLocation}</Text>
                  <Ionicons name="chevron-down" size={16} color="#0F172A" />
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <LanguageSelector />
                <TouchableOpacity style={styles.avatarBtn} activeOpacity={0.7} onPress={() => router.push('/profile' as any)}>
                  <Ionicons name="person-circle-outline" size={32} color="#0F172A" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Search bar */}
            <TouchableOpacity style={styles.searchBar} activeOpacity={0.8} onPress={() => router.push('/search')}>
              <Ionicons name="search" size={20} color="#64748B" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search categories, items..."
                placeholderTextColor="#94A3B8"
                value={search}
                onChangeText={setSearch}
                returnKeyType="search"
              />
              {search.length > 0 ? (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={20} color="#94A3B8" />
                </TouchableOpacity>
              ) : (
                <Ionicons name="mic-outline" size={20} color={PRIMARY} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Promo Banner ── */}
        <Animated.View entering={FadeInUp.delay(50).springify().damping(18)} style={styles.bannerWrap}>
          <LinearGradient colors={['#00B140', '#00D64D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.banner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>{'Delivering\nEverything 🚀'}</Text>
              <Text style={styles.bannerSub}>Groceries • Food • Medicine</Text>
            </View>
            <Image source={require('@/assets/images/scooty.png')} style={styles.bannerImg} contentFit="contain" />
          </LinearGradient>
        </Animated.View>

        {/* ── Category Sections ── */}
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={PRIMARY} />
            <Text style={styles.loadingText}>Finding categories near you...</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="search-outline" size={52} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Results</Text>
            <Text style={styles.emptyText}>Try a different search term</Text>
          </View>
        ) : (
          filtered.map((category: any) => {
            // Build items to show: subcategories if exist, else the category itself
            const items: any[] =
              category.subCategories && category.subCategories.length > 0
                ? category.subCategories
                : [{ id: category.id, name: 'All Items', description: `Browse ${category.name}`, imageUrl: category.imageUrl }];

            return (
              <View key={category.id} style={styles.section}>
                {/* Section Header */}
                <View style={styles.secHeaderRow}>
                  <View style={styles.secHeaderLeft}>
                    {category.imageUrl ? (
                      <Image source={{ uri: category.imageUrl }} style={styles.secIcon} contentFit="cover" />
                    ) : (
                      <View style={[styles.secIcon, { backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' }]}>
                        <Ionicons name="grid-outline" size={18} color={PRIMARY} />
                      </View>
                    )}
                    <View>
                      <Text style={styles.secTitle}>{category.name}</Text>
                      <Text style={styles.secSub}>{items.length} {items.length === 1 ? 'item' : 'items'}</Text>
                    </View>
                  </View>
                  {category.subCategories?.length > 0 && (
                    <TouchableOpacity
                      style={styles.seeAllBtn}
                      activeOpacity={0.7}
                      onPress={() => router.push(`/category/${category.id}?name=${encodeURIComponent(category.name)}` as any)}
                    >
                      <Text style={styles.seeAllText}>See all</Text>
                      <Ionicons name="chevron-forward" size={14} color={PRIMARY} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Cards Grid */}
                <View style={styles.grid}>
                  {items.map((item: any, idx: number) => (
                    <CategoryCard key={item.id} item={item} index={idx} />
                  ))}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Sticky header
  stickyWrap: {
    zIndex: 100,
    backgroundColor: 'rgba(248,250,252,0.92)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  headerInner: { paddingHorizontal: PADDING_H, paddingBottom: 14 },
  locRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  locLabel: { fontSize: 10, fontWeight: '800', color: '#94A3B8', letterSpacing: 1.2, marginBottom: 2 },
  locValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locValue: { fontSize: 17, fontWeight: '800', color: '#0F172A', maxWidth: W * 0.55 },
  avatarBtn: { padding: 2 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 16,
    paddingHorizontal: 16, height: 50,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 4,
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0F172A', fontWeight: '500' },

  // Banner
  bannerWrap: { marginHorizontal: PADDING_H, marginTop: 16, marginBottom: 8 },
  banner: {
    height: 132, borderRadius: 22, padding: 20,
    flexDirection: 'row', alignItems: 'center', overflow: 'hidden',
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 18, elevation: 8,
  },
  bannerTitle: { fontSize: 20, fontWeight: '900', color: '#FFF', lineHeight: 26, letterSpacing: -0.3, marginBottom: 6 },
  bannerSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  bannerImg: { width: 160, height: 150, position: 'absolute', right: -10, bottom: -10 },

  // Sections
  section: { marginTop: 24, paddingHorizontal: PADDING_H },
  secHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  secHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  secIcon: { width: 40, height: 40, borderRadius: 12, overflow: 'hidden' },
  secTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', letterSpacing: -0.3 },
  secSub: { fontSize: 12, color: '#94A3B8', fontWeight: '600', marginTop: 1 },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#F0FDF4', borderRadius: 20 },
  seeAllText: { fontSize: 13, fontWeight: '700', color: PRIMARY },

  // Cards grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },

  // Full-bleed image card
  cardWrapper: { width: CARD_W },
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 6,
    justifyContent: 'flex-end',
  },
  cardLabel: { padding: 12, zIndex: 2 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#FFFFFF', lineHeight: 20, letterSpacing: -0.2 },
  cardSub: { fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '600', marginTop: 2 },
  countBadge: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3,
  },
  countBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFF' },

  // States
  centered: { alignItems: 'center', paddingVertical: 60 },
  loadingText: { marginTop: 12, color: '#64748B', fontWeight: '500', fontSize: 14 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#94A3B8', fontWeight: '500', marginTop: 4 },
});
