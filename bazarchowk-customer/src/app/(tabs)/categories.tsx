import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Dimensions, TextInput, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useCategories } from '@/hooks';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import api from '@/services/api';
import { useAuthStore } from '@/store';
import { LanguageSelector } from '@/components/LanguageSelector';

const { width: W } = Dimensions.get('window');
const PADDING_H = 20;
const PRIMARY = '#00B140';
const PRIMARY_GRADIENT = ['#00B140', '#00D95F'] as const;
const SURFACE = '#F8FAFC';

// ─── Reusable Components ─────────────────────────────────────────────────────

function SectionHeader({ title, subtitle, emoji }: { title: string, subtitle?: string, emoji?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>
        {emoji && <Text>{emoji} </Text>}
        {title}
      </Text>
      {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
    </View>
  );
}

function GridCard({ item, index }: { item: any; index: number }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View entering={FadeInUp.delay(index * 30).springify().damping(18)} style={styles.gridCardWrapper}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => router.push({ pathname: '/category/[id]', params: { id: item.id, name: item.name } })}
        onPressIn={() => { scale.value = withSpring(0.95, { damping: 14 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 12 }); }}
      >
        <Animated.View style={[styles.gridCard, animStyle]}>
          <View style={styles.gridCardTextWrap}>
            <Text style={styles.gridCardTitle} numberOfLines={2}>{item.name}</Text>
            {item.description && <Text style={styles.gridCardSub} numberOfLines={1}>{item.description}</Text>}
          </View>
          <View style={styles.gridCardImgWrap}>
            <Image 
              source={{ uri: item.imageUrl || 'https://cdn-icons-png.flaticon.com/512/4359/4359628.png' }} 
              style={styles.gridCardImg} 
              contentFit="contain" 
            />
          </View>
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

  const { data: addresses = [] } = useQuery({
    queryKey: ['addresses'],
    queryFn: async () => {
      const res = await api.get('/addresses');
      return res.data;
    },
    enabled: isAuthenticated
  });

  const defaultAddress = addresses.find((a: any) => a.isDefault) || addresses[0];
  const displayLocation = defaultAddress 
    ? `${defaultAddress.title || defaultAddress.type || 'Home'} - ${defaultAddress.addressLine1}, ${defaultAddress.city}`
    : t('header.location', { defaultValue: 'Select Location' });

  const { data: dynamicCategories = [], isLoading: isLoadingCategories } = useCategories(defaultAddress?.city);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
      >
        {/* ── 0. Sticky Header + Search ── */}
        <View style={styles.stickyHeaderWrap}>
          <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />

          <View style={[styles.headerInner, { paddingTop: insets.top + 12 }]}>
            <View style={styles.locationRow}>
              <View style={{ flex: 1, marginRight: 16 }}>
                <Text style={styles.locationLabel}>Delivering to</Text>
                <View style={styles.locationValueRow}>
                  <Text style={styles.locationValue} numberOfLines={1}>{displayLocation}</Text>
                  <Ionicons name="chevron-down" size={16} color="#0F172A" />
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <LanguageSelector />
                <TouchableOpacity style={styles.profileBtn}>
                  <Ionicons name="person-circle-outline" size={32} color="#0F172A" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.searchBar}>
              <Ionicons name="search" size={22} color="#64748B" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search categories, subcategories..."
                placeholderTextColor="#94A3B8"
              />
              <View style={styles.divider} />
              <TouchableOpacity style={styles.voiceBtn} activeOpacity={0.7}>
                <Ionicons name="mic" size={20} color={PRIMARY} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.scrollBody}>
          {/* ── Promo Banner ── */}
          <Animated.View entering={FadeInUp.delay(100).springify().damping(20)}>
            <TouchableOpacity activeOpacity={0.95} style={styles.promoWrap}>
              <LinearGradient
                colors={PRIMARY_GRADIENT}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.promoBanner}
              >
                <View style={styles.promoContent}>
                  <Text style={styles.promoTitle}>Delivering Everything{'\n'}In Your City <Text style={{ fontSize: 20 }}>🚀</Text></Text>
                  <Text style={styles.promoSub}>Groceries • Food • Medicine</Text>
                </View>
                <Image source={require('@/assets/images/scooty.png')} style={styles.promoImg} contentFit="contain" />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {isLoadingCategories ? (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <ActivityIndicator size="large" color={PRIMARY} />
              <Text style={{ marginTop: 10, color: '#64748B' }}>Loading categories in {defaultAddress?.city || 'your area'}...</Text>
            </View>
          ) : dynamicCategories?.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Ionicons name="location-outline" size={48} color="#CBD5E1" />
              <Text style={{ marginTop: 10, color: '#64748B', fontWeight: '500' }}>No categories available in your area yet.</Text>
            </View>
          ) : (
            dynamicCategories?.map((category: any) => (
              <View key={category.id} style={styles.sectionMargin}>
                <SectionHeader 
                  title={category.name} 
                  subtitle={`Explore ${category.name}`} 
                  emoji="✨" 
                />
                
                <View style={styles.grid2Col}>
                  {category.subCategories?.map((sub: any, idx: number) => (
                    <GridCard key={sub.id} item={sub} index={idx} />
                  ))}
                </View>
              </View>
            ))
          )}

        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SURFACE },
  content: { flexGrow: 1 },
  scrollBody: { paddingTop: 16 },

  stickyHeaderWrap: {
    zIndex: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerInner: { paddingHorizontal: PADDING_H, paddingBottom: 16 },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  locationLabel: { fontSize: 11, color: '#64748B', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  locationValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationValue: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  profileBtn: { opacity: 0.8 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    height: 54,
    borderRadius: 18,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 4,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0F172A', fontWeight: '500', paddingHorizontal: 10 },
  divider: { width: 1, height: 24, backgroundColor: '#E2E8F0', marginHorizontal: 8 },
  voiceBtn: { padding: 4 },

  promoWrap: { paddingHorizontal: PADDING_H, marginBottom: 32 },
  promoBanner: {
    height: 140,
    borderRadius: 24,
    flexDirection: 'row',
    padding: 20,
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  promoContent: { flex: 1, zIndex: 2 },
  promoTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', lineHeight: 28, marginBottom: 8, letterSpacing: -0.5 },
  promoSub: { fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  promoImg: { width: 180, height: 160, position: 'absolute', right: -20, bottom: -10, zIndex: 1 },

  sectionMargin: { marginBottom: 32 },
  sectionHeader: { paddingHorizontal: PADDING_H, marginBottom: 16 },
  sectionTitle: { fontSize: 24, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5, marginBottom: 2 },
  sectionSubtitle: { fontSize: 13, color: '#64748B', fontWeight: '500' },

  grid2Col: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: PADDING_H,
    gap: 16,
    justifyContent: 'space-between',
  },
  gridCardWrapper: {
    width: (W - (PADDING_H * 2) - 16) / 2,
  },
  gridCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    height: 120,
    padding: 16,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  gridCardTextWrap: { flex: 1, zIndex: 2 },
  gridCardTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  gridCardSub: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  gridCardImgWrap: {
    position: 'absolute',
    right: -10,
    bottom: -10,
    width: 80,
    height: 80,
    zIndex: 1,
  },
  gridCardImg: { width: '100%', height: '100%' },
});
