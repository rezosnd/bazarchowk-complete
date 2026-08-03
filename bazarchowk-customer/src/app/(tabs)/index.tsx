/**
 * BazarChowk – Flagship Home Screen
 * 
 * Hyperlocal Commerce Super App.
 * Combines Grocery, Food, Medicine, Services, and AI Commerce into a single,
 * ultra-premium, investor-ready UI (inspired by Blinkit, Zepto, Swiggy).
 */

import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Dimensions, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, withSpring } from 'react-native-reanimated';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from '@/components/LanguageSelector';
import { useAIStore } from '@/store/aiStore';
import { BlurView } from 'expo-blur';
import * as Location from 'expo-location';
let Speech: any = null;
let Audio: any = null;
let FileSystem: any = null;

try {
  Speech = require('expo-speech');
  Audio = require('expo-audio');
  FileSystem = require('expo-file-system');
} catch (e) {
  console.log('Voice packages not available in Expo Go');
}

import { TextInput } from 'react-native-gesture-handler';

const { width: W } = Dimensions.get('window');

const EMERALD = '#00B140';
const ORANGE = '#FF8A00';
const BG = '#F3FAF5'; // Premium Zomato-style background
const CARD_BG = '#FFFFFF';
const TEXT_MAIN = '#111827';
const TEXT_MUTED = '#6B7280';

// ─── Asset ───────────────────────────────────────────────────────────────────
const LOGO_SRC = require('@/assets/images/APP-ICON.png');

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { HomeService } from '@/services/home.service';
import api from '@/services/api';
import { socketService } from '@/services/socket';

// Reusing some placeholder images just in case backend data lacks images initially
const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80';




// ─── Components ──────────────────────────────────────────────────────────────

import { useCartStore } from '@/store/cart.store';
import { useAuthStore } from '@/store';

function HomeHeader() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { cart } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  
  const { data: notifications = [] } = useQuery({ 
    queryKey: ['notifications'], 
    queryFn: async () => {
      try {
        const res = await api.get('/notifications');
        return res.data;
      } catch (e) {
        return [];
      }
    } 
  });

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
    : t('header.location');
  
  const unreadCount = notifications.filter((n: any) => !n.isRead).length;
  const itemsCount = cart?.items?.reduce((acc: number, item: any) => acc + item.quantity, 0) || 0;
  
  const scale = useSharedValue(1);
  
  useEffect(() => {
    socketService.connect();
    const handleNewNotif = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };
    socketService.on('new_notification', handleNewNotif);
    return () => {
      socketService.off('new_notification', handleNewNotif);
    };
  }, []);

  useEffect(() => {
    if (itemsCount > 0) {
      scale.value = withSequence(
        withTiming(1.2, { duration: 150 }),
        withSpring(1, { damping: 5, stiffness: 200 })
      );
    }
  }, [itemsCount]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <View style={styles.pinIcon}>
          <Ionicons name="location" size={16} color={EMERALD} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.deliveringTo} numberOfLines={1}>{t('header.deliveringTo')}</Text>
          <TouchableOpacity style={styles.locationRow} activeOpacity={0.7} onPress={() => router.push('/addresses')}>
            <Text style={styles.locationText} numberOfLines={1}>{displayLocation}</Text>
            <Ionicons name="chevron-down" size={16} color={TEXT_MAIN} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.headerRight}>
        <LanguageSelector />

        <TouchableOpacity style={styles.bellBtn} activeOpacity={0.7} onPress={() => router.push('/notifications')}>
          <Ionicons name="notifications-outline" size={26} color={TEXT_MAIN} />
          {unreadCount > 0 && (
            <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount}</Text></View>
          )}
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/cart')}>
          <Animated.View style={[styles.cartIconWrapper, animatedStyle]}>
            <Ionicons name="cart-outline" size={28} color={TEXT_MAIN} />
            {itemsCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{itemsCount}</Text>
              </View>
            )}
          </Animated.View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function AIHero() {
  const { t } = useTranslation();
  const isListening = useAIStore(state => state.isListening);
  const pulse = useSharedValue(1);
  const borderGlow = useSharedValue(0.2);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.6, { duration: 1500, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.in(Easing.ease) }) // Smooth reset
      ),
      -1, false
    );
  }, []);

  useEffect(() => {
    if (isListening) {
      borderGlow.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.2, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1, true
      );
    } else {
      borderGlow.value = withTiming(0.2, { duration: 300 });
    }
  }, [isListening]);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: interpolate(pulse.value, [1, 1.6], [0.8, 0]),
  }));

  const borderStyle = useAnimatedStyle(() => {
    if (!isListening) return { borderColor: 'transparent', borderWidth: 0, shadowOpacity: 0 };
    return {
      borderColor: `rgba(0, 177, 64, ${borderGlow.value})`,
      borderWidth: 2,
      shadowColor: '#00B140',
      shadowOpacity: borderGlow.value,
      shadowRadius: 20,
      elevation: 10,
    };
  });

  return (
    <Animated.View style={[styles.aiHeroWrapper, borderStyle]}>
      <LinearGradient colors={['#00B140', '#00752A']} style={styles.aiHero}>
      <View style={styles.aiHeroTop}>
        <View style={styles.aiHeroContent}>
          <View style={styles.aiBrandRow}>
            <View style={styles.aiLogoBox}>
              <Image source={LOGO_SRC} style={{ width: 24, height: 24 }} contentFit="contain" />
            </View>
            <View>
              <Text style={styles.aiTitle}>{t('ai.title')}</Text>
              <Text style={styles.aiSubtitle}>{t('ai.subtitle')}</Text>
            </View>
          </View>
          <View style={styles.aiGreeting}>
            <Text style={styles.aiGreetingText}>{t('ai.greeting')}</Text>
          </View>
        </View>

        <View style={styles.aiMicContainerLarge}>
          <Animated.View style={[styles.aiMicGlowLarge, glowStyle, { backgroundColor: '#00D64D' }]} />
          
          <TouchableOpacity 
            style={styles.aiMicBtnLarge} 
            activeOpacity={0.8}
            onPress={() => useAIStore.getState().startListening()}
          >
            <Ionicons name="mic" size={32} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>



      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.aiPillScroll}>
        {[
          t('ai.pills.vegetables'),
          t('ai.pills.plumber'),
          t('ai.pills.doctor'),
          t('ai.pills.pandit'),
          t('ai.pills.medicine')
        ].map((txt, i) => (
          <TouchableOpacity key={i} style={styles.aiPill} activeOpacity={0.7}>
            <Text style={styles.aiPillText}>{txt}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      </LinearGradient>
    </Animated.View>
  );
}

function GlobalSearch() {
  const { t } = useTranslation();
  return (
    <View style={styles.searchWrapper}>
      <TouchableOpacity style={styles.searchBar} activeOpacity={0.9} onPress={() => router.push('/search')}>
        <Ionicons name="search" size={22} color={TEXT_MUTED} />
        <Text style={styles.searchPlaceholder} numberOfLines={1}>{t('search.placeholder')}</Text>
        <Ionicons name="mic-outline" size={24} color={TEXT_MAIN} style={{ marginRight: 12 }} />
        <View style={styles.searchSparkle}>
          <Ionicons name="sparkles" size={16} color="#FFF" />
        </View>
      </TouchableOpacity>
    </View>
  );
}

function CategoriesGrid() {
  const { t } = useTranslation();
  
  const HOME_CATEGORIES = [
    { id: 'grocery', name: t('categories.grocery') || 'Grocery', icon: 'cart' },
    { id: 'food', name: t('categories.food') || 'Food', icon: 'restaurant' },
    { id: 'medicine', name: t('categories.medicine') || 'Medicine', icon: 'medkit' },
    { id: 'salon', name: t('categories.salon') || 'Salon', icon: 'cut' },
    { id: 'more', name: t('categories.more') || 'More', icon: 'grid', isViewAll: true }
  ];

  return (
    <View style={styles.categoryGrid}>
      {HOME_CATEGORIES.map(c => (
        <TouchableOpacity
          key={c.id}
          style={styles.catItem}
          activeOpacity={0.7}
          onPress={() => {
            if (c.isViewAll) {
              router.push('/(tabs)/categories');
            } else {
              router.push('/(tabs)/categories');
            }
          }}
        >
          <View style={[styles.catIconWrap, c.isViewAll && { backgroundColor: EMERALD }]}>
            <Ionicons
              name={c.icon as any}
              size={26}
              color={c.isViewAll ? '#FFFFFF' : EMERALD}
            />
          </View>
          <Text
            style={styles.catText}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {c.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  const { t } = useTranslation();
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <TouchableOpacity activeOpacity={0.7} style={styles.seeAllBtn}>
        <Text style={styles.seeAllTxt}>{t('common.seeAll')}</Text>
        <Ionicons name="chevron-forward" size={16} color={EMERALD} />
      </TouchableOpacity>
    </View>
  );
}

function NearbyShops() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);

  const { data: addresses = [] } = useQuery({
    queryKey: ['addresses'],
    queryFn: async () => {
      const res = await api.get('/addresses');
      return res.data;
    },
    enabled: isAuthenticated
  });

  useEffect(() => {
    (async () => {
      const defaultAddress = addresses.find((a: any) => a.isDefault) || addresses[0];
      if (defaultAddress && defaultAddress.latitude && defaultAddress.longitude) {
        setLocation({ lat: defaultAddress.latitude, lng: defaultAddress.longitude });
        return;
      }

      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }
      try {
        let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      } catch (e) {
        console.warn('Failed to get location', e);
      }
    })();
  }, [addresses]);

  const { data: shops = [], isLoading } = useQuery({ 
    queryKey: ['shops', location?.lat, location?.lng], 
    queryFn: () => HomeService.getNearbyShops(location?.lat, location?.lng),
    enabled: !!location // Only fetch when location is determined
  });

  if (isLoading || shops.length === 0) return null;

  return (
    <View style={styles.section}>
      <SectionHeader title={t('sections.nearbyShops')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
        {shops.map((shop: any) => (
          <TouchableOpacity key={shop.id} style={styles.shopCard} activeOpacity={0.9} onPress={() => router.push(`/shop/${shop.id}`)}>
            <View style={styles.shopImgWrapper}>
              <Image source={{ uri: shop.bannerUrl || shop.logoUrl || PLACEHOLDER_IMG }} style={styles.shopImg} contentFit="cover" />
              {shop.status?.isOpen && (
                <View style={styles.openBadge}>
                  <Text style={styles.openBadgeTxt}>{t('shops.open')}</Text>
                </View>
              )}
            </View>
            <View style={styles.shopInfo}>
              <Text style={styles.shopName} numberOfLines={1}>{shop.name}</Text>
              <Text style={styles.shopMeta}>
                {shop.distanceKm ? `${shop.distanceKm.toFixed(1)} km` : 'Near you'} • <Ionicons name="star" size={12} color="#F59E0B" /> {shop.rating?.toFixed(1) || '4.5'}
              </Text>
              <Text style={styles.shopTime}>{shop.status?.reason || '15–20 min'}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

function PopularMarkets() {
  const { t } = useTranslation();
  const { data: markets = [], isLoading } = useQuery({ queryKey: ['markets'], queryFn: HomeService.getMarkets });

  if (isLoading || markets.length === 0) return null;

  return (
    <View style={styles.section}>
      <SectionHeader title={t('sections.popularMarkets')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
        {markets.map((m: any) => (
          <TouchableOpacity key={m.id} style={styles.marketCard} activeOpacity={0.9} onPress={() => router.push(`/market/${m.id}` as any)}>
            <Image source={{ uri: m.imageUrl || PLACEHOLDER_IMG }} style={styles.marketImg} contentFit="cover" />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)']}
              style={styles.marketOverlay}
            >
              <Text style={styles.marketName} numberOfLines={1}>{m.name}</Text>
              <Text style={styles.marketShops}>{m.shops?.length || '10+'} Shops</Text>
              <View style={styles.marketMetaRow}>
                <Text style={styles.marketDist}>1.0 km</Text>
                <View style={styles.openNowBadge}><Text style={styles.openNowTxt}>{t('shops.open')} Now</Text></View>
                <View style={{ flex: 1 }} />
                <View style={styles.miniMapBadge}>
                  <Ionicons name="map-outline" size={14} color="#FFF" />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

function TodaysOffers() {
  const { t } = useTranslation();
  return (
    <View style={styles.section}>
      <SectionHeader title={t('sections.todaysOffers')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
        <TouchableOpacity activeOpacity={0.9}>
          <LinearGradient colors={['#DCFCE7', '#BBF7D0']} style={styles.offerCard}>
            <View style={styles.offerContent}>
              <Text style={[styles.offerTag, { color: EMERALD }]}>UP TO</Text>
              <Text style={[styles.offerTitle, { color: '#065F46' }]}>50% {t('offers.off')}</Text>
              <Text style={[styles.offerSub, { color: '#065F46' }]}>On {t('categories.grocery')}</Text>
            </View>
            <Image source={{ uri: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=200&q=80' }} style={styles.offerImg} contentFit="cover" />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.9}>
          <LinearGradient colors={['#FFEDD5', '#FED7AA']} style={styles.offerCard}>
            <View style={styles.offerContent}>
              <Text style={[styles.offerTag, { color: ORANGE }]}>FREE</Text>
              <Text style={[styles.offerTitle, { color: '#9A3412' }]}>DELIVERY</Text>
              <Text style={[styles.offerSub, { color: '#9A3412' }]}>On Orders above ₹199</Text>
            </View>
            <Image source={{ uri: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=200&q=80' }} style={styles.offerImg} contentFit="cover" />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.9}>
          <LinearGradient colors={['#DBEAFE', '#BFDBFE']} style={styles.offerCard}>
            <View style={styles.offerContent}>
              <Text style={[styles.offerTag, { color: '#2563EB' }]}>FLAT</Text>
              <Text style={[styles.offerTitle, { color: '#1E40AF' }]}>20% CB</Text>
              <Text style={[styles.offerSub, { color: '#1E40AF' }]}>On {t('categories.medicine')}</Text>
            </View>
            <Image source={{ uri: 'https://images.unsplash.com/photo-1584308666744-24d5e478ac5c?auto=format&fit=crop&w=200&q=80' }} style={styles.offerImg} contentFit="cover" />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.9}>
          <LinearGradient colors={['#FCE7F3', '#FBCFE8']} style={styles.offerCard}>
            <View style={styles.offerContent}>
              <Text style={[styles.offerTag, { color: '#DB2777' }]}>{t('categories.salon').toUpperCase()}</Text>
              <Text style={[styles.offerTitle, { color: '#9D174D' }]}>OFFERS</Text>
              <Text style={[styles.offerSub, { color: '#9D174D' }]}>Up to 40% {t('offers.off')}</Text>
            </View>
            <Image source={{ uri: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=200&q=80' }} style={styles.offerImg} contentFit="cover" />
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function RecommendedSection() {
  const { t } = useTranslation();
  const { data: products = [], isLoading } = useQuery({ queryKey: ['recommendedProducts'], queryFn: HomeService.getRecommendedProducts });

  if (isLoading || products.length === 0) return null;

  return (
    <View style={styles.section}>
      <SectionHeader title={t('sections.recommended')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
        {products.map((prod: any) => (
          <TouchableOpacity key={prod.id} style={styles.productCard} activeOpacity={0.9} onPress={() => router.push(`/product/${prod.id}`)}>
            <Image source={{ uri: prod.images?.[0]?.url || PLACEHOLDER_IMG }} style={styles.productImg} contentFit="cover" />
            <Text style={styles.productName} numberOfLines={1}>{prod.name}</Text>
            <View style={styles.productPriceRow}>
              <Text style={styles.productPrice}>₹{prod.basePrice}</Text>
              <TouchableOpacity style={styles.addBtn}>
                <Text style={styles.addBtnText}>ADD</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}



// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const isListening = useAIStore(state => state.isListening);

  const scale = useSharedValue(1);
  const overlayOpacity = useSharedValue(0);

  useEffect(() => {
    if (isListening) {
      scale.value = withTiming(0.98, { duration: 300 });
      overlayOpacity.value = withTiming(1, { duration: 300 });
    } else {
      scale.value = withTiming(1, { duration: 300 });
      overlayOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [isListening]);

  const animatedMainStyle = useAnimatedStyle(() => ({
    flex: 1,
    transform: [{ scale: scale.value }],
    borderRadius: isListening ? 24 : 0,
    overflow: 'hidden',
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  return (
    <View style={styles.container}>
      {/* Fancy Blended Background Gradient (Blinkit/Zepto style) */}
      <LinearGradient
        colors={['#D1F5DF', '#F3FAF5', '#F3FAF5']}
        locations={[0, 0.3, 1]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 500 }}
      />

      <Animated.View style={animatedMainStyle}>
        <View style={{ paddingTop: insets.top }}>
          <HomeHeader />
        </View>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingTop: 16 }]}
        >
          <AIHero />
          <GlobalSearch />
          <CategoriesGrid />

          <NearbyShops />
          <PopularMarkets />
          <TodaysOffers />
          
          <RecommendedSection />
        </ScrollView>
        
        {/* Subtle backdrop reaction when listening */}
        <Animated.View style={[StyleSheet.absoluteFill, overlayStyle, { pointerEvents: 'none' as any }]}>
          <BlurView intensity={8} style={StyleSheet.absoluteFill} tint="dark" />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.08)' }]} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  scrollContent: {
    paddingBottom: 110, // space for 72px tab bar + safe area
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24, // increased whitespace
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 16,
  },
  pinIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  deliveringTo: {
    fontSize: 12,
    color: TEXT_MUTED,
    fontWeight: '500',
    marginBottom: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: TEXT_MAIN,
    flexShrink: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  bellBtn: {
    position: 'relative',
    padding: 4,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 4,
    backgroundColor: '#EF4444',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: BG,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  langChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  langChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_MAIN,
  },
  cartIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: EMERALD,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },

  // AI Hero
  aiHeroWrapper: {
    marginHorizontal: 16,
    borderRadius: 24,
  },
  aiHero: {
    borderRadius: 24,
    paddingTop: 24,
    paddingBottom: 20,
    ...Platform.select({
      ios: { shadowColor: EMERALD, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16 },
      android: { elevation: 8 },
    }),
  },
  aiHeroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  aiHeroContent: {
    flex: 1,
    paddingRight: 16,
  },
  aiBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aiLogoBox: {
    width: 44,
    height: 44,
    backgroundColor: '#FFF',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiLogoText: {
    color: ORANGE,
    fontSize: 24,
    fontWeight: '900',
  },
  aiTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  aiSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    marginTop: 2,
    maxWidth: '90%',
  },
  aiHeroRight: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
  },
  aiGreeting: {
    marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  aiGreetingText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  aiMicContainerLarge: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
    zIndex: 2,
  },
  aiMicGlowLarge: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  aiMicBtnLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: EMERALD,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  aiChatIconBadgeTopRight: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 6,
    borderRadius: 12,
    zIndex: 3,
  },
  aiPillScroll: {
    paddingHorizontal: 20,
    marginTop: 24,
    gap: 10,
  },
  aiPill: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  aiPillText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '500',
  },

  voicePanel: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  voiceHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    marginBottom: 24,
  },
  aiAvatarBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: EMERALD,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: EMERALD,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  aiVoiceReplyText: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_MAIN,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  voiceInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 24,
    width: '100%',
    padding: 4,
  },
  voiceInput: {
    flex: 1,
    height: 48,
    paddingHorizontal: 12,
    fontSize: 15,
    color: TEXT_MAIN,
  },
  voiceSendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: EMERALD,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },

  // Search Bar
  searchWrapper: {
    paddingHorizontal: 16,
    marginTop: 32, // increased spacing
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    height: 60,
    borderRadius: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.03, shadowRadius: 24 },
      android: { elevation: 3 },
    }),
  },
  searchPlaceholder: {
    flex: 1,
    color: TEXT_MUTED,
    fontSize: 15,
    marginLeft: 12,
  },
  searchSparkle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: EMERALD,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Categories (Accessible Grid)
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    marginTop: 32, // space below search
    justifyContent: 'flex-start',
  },
  catItem: {
    width: '25%', // 4 columns for large, accessible touch targets
    alignItems: 'center',
    marginBottom: 24,
  },
  catIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28, // perfect circle
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    ...Platform.select({
      ios: { shadowColor: EMERALD, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 16 },
      android: { elevation: 4 },
    }),
  },
  catText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    paddingHorizontal: 4,
    width: '100%',
  },

  // Sections
  section: {
    marginTop: 24, // normal spacing restored
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    fontWeight: '800',
    color: TEXT_MAIN,
    letterSpacing: -0.3,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllTxt: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    fontWeight: '600',
    color: EMERALD,
  },
  hScroll: {
    paddingHorizontal: 20,
    gap: 20, // increased gap between cards
  },

  // Shop Card
  shopCard: {
    width: 260,
    backgroundColor: CARD_BG,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.04, shadowRadius: 24 },
      android: { elevation: 3 },
    }),
  },
  shopImgWrapper: {
    height: 130,
    width: '100%',
  },
  shopImg: {
    width: '100%',
    height: '100%',
  },
  openBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: EMERALD,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  openBadgeTxt: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  shopInfo: {
    padding: 16,
  },
  shopName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: TEXT_MAIN,
    marginBottom: 6,
  },
  shopMeta: {
    fontSize: 13,
    color: TEXT_MUTED,
    marginBottom: 4,
  },
  shopTime: {
    fontSize: 13,
    color: TEXT_MUTED,
    fontWeight: '500',
  },

  // Market Card
  marketCard: {
    width: 280,
    height: 160,
    borderRadius: 20,
    overflow: 'hidden',
  },
  marketImg: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  marketOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 16,
  },
  marketName: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  marketShops: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    marginBottom: 8,
  },
  marketMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  marketDist: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '500',
  },
  openNowBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  openNowTxt: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  miniMapBadge: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 6,
    borderRadius: 12,
  },

  // Offer Card
  offerCard: {
    width: 290,
    height: 150,
    borderRadius: 24,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  offerContent: {
    padding: 20,
    flex: 1,
    justifyContent: 'center',
  },
  offerTag: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  offerTitle: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 4,
  },
  offerSub: {
    fontSize: 14,
    fontWeight: '600',
  },
  offerImg: {
    width: 140,
    height: 150,
    position: 'absolute',
    right: -10,
    bottom: -10,
    borderRadius: 24,
  },

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    ...Platform.select({
      ios: { shadowColor: EMERALD, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Recommended Products
  productCard: {
    width: 150,
    backgroundColor: CARD_BG,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.04, shadowRadius: 24 },
      android: { elevation: 2 },
    }),
  },
  productImg: {
    width: '100%',
    height: 90,
    borderRadius: 12,
    marginBottom: 8,
  },
  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_MAIN,
    marginBottom: 8,
  },
  productPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: TEXT_MAIN,
  },
  addBtn: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: EMERALD,
  },
});
