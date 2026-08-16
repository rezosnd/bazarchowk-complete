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
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, withSpring, useAnimatedScrollHandler, runOnJS } from 'react-native-reanimated';
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
const DARK_EMERALD = '#008F3C';
const DEEP_EMERALD = '#006B2A';
const SOFT_GREEN = '#EAF8F0';
const ORANGE = '#FF8A00';
const YELLOW = '#FFC928';
const BG = '#F7FAF8';
const CARD_BG = '#FFFFFF';
const TEXT_MAIN = '#122018';
const TEXT_MUTED = '#66736B';
const BORDER = '#E5EBE7';

// ─── Asset ───────────────────────────────────────────────────────────────────
const LOGO_SRC = require('@/assets/images/APP-ICON.png');

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { HomeService } from '@/services/home.service';
import api from '@/services/api';
import { socketService } from '@/services/socket';

// Reusing some placeholder images just in case backend data lacks images initially
// No longer using unsplash placeholder globally




// ─── Components ──────────────────────────────────────────────────────────────

import { useCartStore } from '@/store/cart.store';
import { useAuthStore } from '@/store';
import { useAppStore } from '@/store/app.store';

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
        <View style={styles.logoWrapper}>
          <Image source={LOGO_SRC} style={styles.headerLogo} contentFit="contain" />
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
  const { user } = useAuthStore();
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 1500, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.in(Easing.ease) })
      ),
      -1, false
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: interpolate(pulse.value, [1, 1.3], [0.5, 0]),
  }));

  const toggleListening = useAIStore((state) => state.toggleListening);
  const handlePress = () => {
    toggleListening();
  };

  return (
    <View style={styles.aiHeroWrapper}>
      <LinearGradient colors={[EMERALD, DARK_EMERALD]} style={styles.aiHero}>
        <View style={styles.aiHeroTop}>
          <View style={styles.aiHeroContent}>
            <View style={styles.aiBrandRow}>
              <Ionicons name="sparkles" size={16} color="#FFF" />
              <Text style={styles.aiTitle}>Bazar AI Assistant</Text>
            </View>
            <Text style={styles.aiGreetingText}>{t('ai.greeting', { name: user?.firstName || 'there' })}</Text>
          </View>

          <View style={styles.aiMicContainerLarge}>
            {isListening && <Animated.View style={[styles.aiMicGlowLarge, glowStyle]} />}
            <TouchableOpacity 
              style={styles.aiMicBtnLarge} 
              activeOpacity={0.8}
              onPress={handlePress}
            >
              <Ionicons name="mic" size={28} color={EMERALD} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.aiPillScroll}>
          {[
            { label: 'Fresh Vegetables', icon: 'basket-outline' },
            { label: 'Order Food', icon: 'restaurant-outline' },
            { label: 'Find a Service', icon: 'build-outline' },
            { label: 'More', icon: 'ellipsis-horizontal' },
          ].map((item, i) => (
            <TouchableOpacity key={i} style={styles.aiPill} activeOpacity={0.7}>
              <Ionicons name={item.icon as any} size={14} color="#FFF" />
              <Text style={styles.aiPillText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

function GlobalSearch() {
  return (
    <View style={styles.searchWrapper}>
      <TouchableOpacity style={styles.searchBar} activeOpacity={0.9} onPress={() => router.push('/search')}>
        <Ionicons name="search" size={20} color={TEXT_MUTED} />
        <Text style={styles.searchPlaceholder} numberOfLines={1}>Search groceries, food & more</Text>
        <View style={styles.searchRight}>
          <Ionicons name="mic-outline" size={22} color={TEXT_MUTED} />
          <View style={styles.searchSparkle}>
            <Ionicons name="sparkles" size={18} color={EMERALD} />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

function ServiceDiscovery() {
  const services = [
    { id: 'groceries', name: 'Groceries', icon: 'basket', color: EMERALD, bg: SOFT_GREEN, route: '/(tabs)/categories' },
    { id: 'food', name: 'Food', icon: 'restaurant', color: ORANGE, bg: '#FFF7ED', route: '/search' },
    { id: 'medicine', name: 'Medicine', icon: 'medkit', color: '#3B82F6', bg: '#EFF6FF', route: '/search' },
    { id: 'salon', name: 'Salon', icon: 'cut', color: '#EC4899', bg: '#FDF2F8', route: '/service-category?type=Salon' },
    { id: 'services', name: 'Services', icon: 'build', color: '#8B5CF6', bg: '#F5F3FF', route: '/search' },
  ];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitleMain}>What are you looking for?</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
        {services.map((s) => (
          <TouchableOpacity 
             key={s.id} 
             style={styles.serviceDiscItem} 
             onPress={() => router.push(s.route as any)}
             activeOpacity={0.8}
          >
             <View style={[styles.serviceDiscIconWrap, { backgroundColor: s.bg }]}>
                <Ionicons name={s.icon as any} size={28} color={s.color} />
             </View>
             <Text style={styles.serviceDiscText}>{s.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

function ShopByCategory() {
  const { data: fetchedCategories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => HomeService.getCategories()
  });

  if (isLoading || fetchedCategories.length === 0) return null;

  return (
    <View style={styles.section}>
      <SectionHeader title="Shop by Category" onPress={() => router.push('/(tabs)/categories')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
        {fetchedCategories.slice(0, 10).map((c: any) => (
          <TouchableOpacity
            key={c.id}
            style={styles.categoryCard}
            activeOpacity={0.8}
            onPress={() => router.push(`/category/${c.id}?name=${encodeURIComponent(c.name || 'Category')}` as any)}
          >
            <View style={styles.categoryImgWrap}>
              {c.imageUrl || c.iconUrl ? (
                <Image source={{ uri: c.imageUrl || c.iconUrl }} style={styles.categoryImg} contentFit="cover" />
              ) : (
                <Ionicons name="grid" size={24} color={TEXT_MUTED} />
              )}
            </View>
            <Text style={styles.categoryLabel} numberOfLines={2}>{c.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

function SectionHeader({ title, onPress }: { title: string, onPress?: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {onPress && (
        <TouchableOpacity activeOpacity={0.7} style={styles.seeAllBtn} onPress={onPress}>
          <Text style={styles.seeAllTxt}>{t('common.seeAll')}</Text>
          <Ionicons name="chevron-forward" size={16} color={EMERALD} />
        </TouchableOpacity>
      )}
    </View>
  );
}

function NearbyShops({ lat, lng, city }: { lat?: number, lng?: number, city?: string }) {
  const { t } = useTranslation();

  const { data: shops = [], isLoading } = useQuery({ 
    queryKey: ['shops', lat, lng, city], 
    queryFn: () => HomeService.getNearbyShops(lat, lng, city),
    enabled: !!lat || !!city 
  });

  if (isLoading || shops.length === 0) return null;

  return (
    <View style={styles.section}>
      <SectionHeader title="Local Favorites Near You" onPress={() => router.push('/search')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
        {shops.map((shop: any) => (
          <TouchableOpacity key={shop.id} style={styles.shopCard} activeOpacity={0.9} onPress={() => router.push(`/shop/${shop.id}`)}>
            <View style={styles.shopImgWrapper}>
              {shop.bannerUrl || shop.logoUrl ? (
                <Image source={{ uri: shop.bannerUrl || shop.logoUrl }} style={styles.shopImg} contentFit="cover" />
              ) : (
                <View style={[styles.shopImg, { backgroundColor: '#EAF8F0', alignItems: 'center', justifyContent: 'center' }]}>
                  <Ionicons name="storefront-outline" size={28} color="#CBD5E1" />
                </View>
              )}
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

function NearbyServices({ lat, lng, city }: { lat?: number, lng?: number, city?: string }) {
  const { t } = useTranslation();

  const { data: services = [], isLoading } = useQuery({ 
    queryKey: ['services', lat, lng, city], 
    queryFn: () => HomeService.getNearbyServices(lat, lng, city),
    enabled: !!lat || !!city 
  });

  if (isLoading || services.length === 0) return null;

  return (
    <View style={styles.section}>
      <SectionHeader title="Services Near You" onPress={() => router.push('/search')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
        {services.map((svc: any) => (
          <TouchableOpacity key={svc.id} style={styles.shopCard} activeOpacity={0.9} onPress={() => router.push(`/services/${svc.id}`)}>
            <View style={styles.shopImgWrapper}>
              {svc.bannerUrl || svc.logoUrl ? (
                <Image source={{ uri: svc.bannerUrl || svc.logoUrl }} style={styles.shopImg} contentFit="cover" />
              ) : (
                <View style={[styles.shopImg, { backgroundColor: '#EAF8F0', alignItems: 'center', justifyContent: 'center' }]}>
                  <Ionicons name="briefcase-outline" size={28} color="#CBD5E1" />
                </View>
              )}
              <View style={[styles.openBadge, { backgroundColor: '#EA580C' }]}>
                <Text style={styles.openBadgeTxt}>BOOK</Text>
              </View>
            </View>
            <View style={styles.shopInfo}>
              <Text style={styles.shopName} numberOfLines={1}>{svc.name}</Text>
              <Text style={styles.shopMeta}>
                {svc.distanceKm ? `${svc.distanceKm.toFixed(1)} km` : 'Near you'} • {svc.partnerType?.replace('_', ' ')}
              </Text>
              <Text style={styles.shopTime} numberOfLines={1}>{svc.status?.reason || 'Book Now'}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

function PopularMarkets({ lat, lng }: { lat?: number, lng?: number }) {
  const { t } = useTranslation();
  const { data: markets = [], isLoading } = useQuery({ 
    queryKey: ['markets', lat, lng], 
    queryFn: () => HomeService.getMarkets(lat, lng),
    enabled: !!lat 
  });

  if (isLoading || markets.length === 0) return null;

  return (
    <View style={styles.section}>
      <SectionHeader title={t('sections.popularMarkets')} onPress={() => router.push('/search')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
        {markets.map((m: any) => (
          <TouchableOpacity key={m.id} style={styles.marketCard} activeOpacity={0.9} onPress={() => router.push(`/market/${m.id}` as any)}>
            {m.imageUrl ? (
              <Image source={{ uri: m.imageUrl }} style={styles.marketImg} contentFit="cover" />
            ) : (
              <View style={[styles.marketImg, { backgroundColor: '#E5EBE7', alignItems: 'center', justifyContent: 'center' }]}>
                <Ionicons name="business-outline" size={32} color="#8B9690" />
              </View>
            )}
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

function PromoCarousel({ lat, lng }: { lat?: number, lng?: number }) {
  const { data: ads = [], isLoading } = useQuery({
    queryKey: ['ads', 'BANNER', lat, lng],
    queryFn: () => HomeService.getActiveAds('BANNER'),
  });

  if (isLoading || ads.length === 0) return null;

  return (
    <View style={[styles.section, { paddingTop: 0 }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll} pagingEnabled snapToInterval={W - 28} decelerationRate="fast">
        {ads.map((ad: any) => (
          <TouchableOpacity 
            key={ad.id} 
            activeOpacity={0.9} 
            style={{ width: W - 48, height: (W - 48) * (7/16), marginRight: 20 }}
            onPress={() => {
              if (ad.shop?.id) {
                router.push(`/shop/${ad.shop.id}`);
              }
            }}
          >
            {ad.imageUrl ? (
              <Image 
                source={{ uri: ad.imageUrl }} 
                style={{ width: '100%', height: '100%', borderRadius: 24 }} 
                contentFit="cover" 
              />
            ) : (
              <View style={{ width: '100%', height: '100%', borderRadius: 24, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: BORDER }}>
                <Ionicons name="image-outline" size={32} color="#CBD5E1" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

function TodaysBestDeals() {
  return (
    <View style={[styles.section, { backgroundColor: SOFT_GREEN, paddingVertical: 24, marginHorizontal: -20, paddingHorizontal: 20 }]}>
      <SectionHeader title="Today's Best Deals" onPress={() => router.push('/search')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.hScroll, { paddingHorizontal: 0 }]}>
        <TouchableOpacity activeOpacity={0.9} style={styles.dealCard}>
          <View style={styles.dealContent}>
            <View style={[styles.dealBadge, { backgroundColor: '#FEF2F2' }]}>
              <Ionicons name="pricetag" size={12} color="#EF4444" />
              <Text style={[styles.dealBadgeTxt, { color: '#EF4444' }]}>20% OFF</Text>
            </View>
            <Text style={styles.dealTitle}>Fresh Grocery</Text>
            <Text style={styles.dealSub}>Discount on all fresh items</Text>
          </View>
          <Image source={{ uri: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=200&q=80' }} style={styles.dealImg} contentFit="cover" />
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.9} style={styles.dealCard}>
          <View style={styles.dealContent}>
            <View style={[styles.dealBadge, { backgroundColor: '#FFFBEB' }]}>
              <Ionicons name="flash" size={12} color={ORANGE} />
              <Text style={[styles.dealBadgeTxt, { color: ORANGE }]}>FREE DELIVERY</Text>
            </View>
            <Text style={styles.dealTitle}>On ₹199+</Text>
            <Text style={styles.dealSub}>Get your order delivered free</Text>
          </View>
          <Image source={{ uri: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=200&q=80' }} style={styles.dealImg} contentFit="cover" />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function RecommendedSection({ lat, lng, city }: { lat?: number, lng?: number, city?: string }) {
  const { t } = useTranslation();
  const { data: products = [], isLoading } = useQuery({ 
    queryKey: ['recommendedProducts', lat, lng, city], 
    queryFn: () => HomeService.getRecommendedProducts(lat, lng, city),
    enabled: !!lat || !!city
  });

  if (isLoading || products.length === 0) return null;

  return (
    <View style={styles.section}>
      <SectionHeader title="Popular Near You" onPress={() => router.push('/search')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
        {products.map((prod: any) => {
          const isOutOfStock = !prod.variants?.[0] || prod.variants[0].stock <= 0;
          return (
          <TouchableOpacity key={prod.id} style={styles.productCard} activeOpacity={0.9} onPress={() => router.push(`/product/${prod.id}`)}>
            {prod.images?.[0]?.imageUrl ? (
              <Image source={{ uri: prod.images[0].imageUrl }} style={styles.productImg} contentFit="cover" />
            ) : (
              <View style={[styles.productImg, { backgroundColor: '#EAF8F0', alignItems: 'center', justifyContent: 'center' }]}>
                <Ionicons name="cube-outline" size={28} color="#CBD5E1" />
              </View>
            )}
            <Text style={styles.productName} numberOfLines={1}>{prod.name}</Text>
            <View style={styles.productPriceRow}>
              <Text style={styles.productPrice}>₹{prod.variants?.[0]?.price || prod.basePrice}</Text>
              {isOutOfStock ? (
                <View style={[styles.addBtn, { backgroundColor: '#EAF8F0', borderColor: BORDER }]}>
                  <Text style={[styles.addBtnText, { color: '#8B9690', fontSize: 10 }]}>OUT OF STOCK</Text>
                </View>
              ) : (
                <TouchableOpacity style={styles.addBtn} onPress={() => router.push(`/product/${prod.id}`)}>
                  <Ionicons name="add" size={14} color={EMERALD} />
                  <Text style={styles.addBtnText}>ADD</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        )})}
      </ScrollView>
    </View>
  );
}



// ─── Main Screen ─────────────────────────────────────────────────────────────

import { useCurrentLocation } from '@/hooks';


export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const isListening = useAIStore(state => state.isListening);
  const location = useCurrentLocation();

  const scale = useSharedValue(1);
  const overlayOpacity = useSharedValue(0);

  const { isTabBarVisible, setTabBarVisible } = useAppStore();
  const prevScrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event: any) => {
      const currentY = event.contentOffset.y;
      const diff = currentY - prevScrollY.value;
      
      // Don't trigger if near the very top (bounce effect)
      if (currentY < 100) {
        if (!isTabBarVisible) runOnJS(setTabBarVisible)(true);
      } else if (diff > 10) { // Scrolling down page (finger up) -> Hide Tab Bar
        if (isTabBarVisible) runOnJS(setTabBarVisible)(false);
      } else if (diff < -15) { // Scrolling up page (finger down) -> Show Tab Bar
        if (!isTabBarVisible) runOnJS(setTabBarVisible)(true);
      }
      
      prevScrollY.value = currentY;
    }
  });

  const { data: markets = [], isLoading: isLoadingMarkets } = useQuery({ 
    queryKey: ['markets', location?.lat, location?.lng], 
    queryFn: () => HomeService.getMarkets(location?.lat, location?.lng),
    enabled: !!location?.lat 
  });

  useEffect(() => {
    if (!isLoadingMarkets && location?.lat && markets.length === 0) {
      router.push('/unserviceable' as any);
    }
  }, [isLoadingMarkets, markets.length, location?.lat]);

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
      <Animated.View style={animatedMainStyle}>
        
        {/* PREMIUM GLASSMORPHISM TOP HEADER */}
        <BlurView
          intensity={25}
          tint="light"
          style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            paddingTop: insets.top, 
            paddingBottom: 12, 
            zIndex: 50,
            backgroundColor: 'rgba(255,255,255,0.80)',
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(255,255,255,0.55)',
            borderBottomLeftRadius: 20,
            borderBottomRightRadius: 20,
            shadowColor: '#00B140',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.04,
            shadowRadius: 12,
            elevation: 2
          }}
        >
          <HomeHeader />
        </BlurView>

        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          contentContainerStyle={[
            styles.scrollContent, 
            { 
              paddingTop: insets.top + 70, // offset for absolute glass header
              paddingBottom: 130 + insets.bottom 
            }
          ]}
        >
          {/* Top Atmospheric Green Glow */}
          <LinearGradient
            colors={['rgba(234, 248, 239, 0.8)', 'rgba(248, 250, 249, 0)']}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 400, zIndex: 0 }}
            pointerEvents="none"
          />

          {/* Middle Atmospheric Orange Glow (Around Deals/Food) */}
          <LinearGradient
            colors={['rgba(248, 250, 249, 0)', 'rgba(255, 243, 229, 0.8)', 'rgba(248, 250, 249, 0)']}
            style={{ position: 'absolute', top: 850, left: 0, right: 0, height: 600, zIndex: 0 }}
            pointerEvents="none"
          />

          {/* BIRD GIF */}
          <View style={styles.birdContainer}>
            <Image 
              source={require('@/assets/images/bazarchowk_ultra_clean_cartoon_village.gif')} 
              style={styles.birdGif} 
              contentFit="cover" 
            />
            {/* Blending Gradients to mask the rectangular edges */}
            <LinearGradient colors={['rgba(247, 250, 248, 1)', 'rgba(247, 250, 248, 0)']} style={styles.fadeTop} />
            <LinearGradient colors={['rgba(247, 250, 248, 0)', 'rgba(247, 250, 248, 1)']} style={styles.fadeBottom} />
            <LinearGradient colors={['rgba(247, 250, 248, 1)', 'rgba(247, 250, 248, 0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.fadeLeft} />
            <LinearGradient colors={['rgba(247, 250, 248, 0)', 'rgba(247, 250, 248, 1)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.fadeRight} />
          </View>

          <AIHero />

          {/* WELCOME GIF - Reduced vertical gap */}
          <View style={styles.welcomeGifContainer}>
            <Image 
              source={require('@/assets/images/animation.gif')} 
              style={styles.welcomeGif} 
              contentFit="cover" 
            />
            {/* Blending Gradients to mask the rectangular edges */}
            <LinearGradient colors={['rgba(247, 250, 248, 1)', 'rgba(247, 250, 248, 0)']} style={styles.fadeTop} />
            <LinearGradient colors={['rgba(247, 250, 248, 0)', 'rgba(247, 250, 248, 1)']} style={styles.fadeBottom} />
            <LinearGradient colors={['rgba(247, 250, 248, 1)', 'rgba(247, 250, 248, 0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.fadeLeft} />
            <LinearGradient colors={['rgba(247, 250, 248, 0)', 'rgba(247, 250, 248, 1)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.fadeRight} />
          </View>

          <GlobalSearch />
          <PromoCarousel lat={location?.lat} lng={location?.lng} />
          <ServiceDiscovery />
          <ShopByCategory />
          <TodaysBestDeals />
          <RecommendedSection lat={location?.lat} lng={location?.lng} city={location?.city} />
          <NearbyShops lat={location?.lat} lng={location?.lng} city={location?.city} />
        </Animated.ScrollView>
        
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
    // paddingBottom is set dynamically inline to account for safe area and elevated button
  },
  birdContainer: {
    height: 100,
    marginTop: 0, // removed margin to align tighter below header
    marginBottom: -32, // Blend deeper into the AI card
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 1,
  },
  birdGif: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.85,
  },
  welcomeGifContainer: {
    height: 90, // Reduced height for tighter integration
    marginTop: -4, // Reduced gap between AI Hero and this
    marginBottom: -8, // Reduced gap between this and Search
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  welcomeGif: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.9,
  },
  fadeTop: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 32,
  },
  fadeBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 32,
  },
  fadeLeft: {
    position: 'absolute', top: 0, left: 0, bottom: 0, width: 32,
  },
  fadeRight: {
    position: 'absolute', top: 0, right: 0, bottom: 0, width: 32,
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
  logoWrapper: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  headerLogo: {
    width: 24,
    height: 24,
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
    zIndex: 2, // Keep above the village environmental layer
    shadowColor: EMERALD,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
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
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
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
    backgroundColor: '#E5EBE7',
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
    backgroundColor: '#EAF8F0',
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
    marginTop: 24,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    height: 60,
    borderRadius: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: SOFT_GREEN,
    ...Platform.select({
      ios: { shadowColor: EMERALD, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 16 },
      android: { elevation: 2 },
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
    backgroundColor: '#F3FAF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  // Categories & Service Discovery
  serviceHScroll: {
    paddingHorizontal: 20,
    gap: 16,
  },
  serviceDiscItem: {
    alignItems: 'center',
    width: 72,
  },
  serviceDiscIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  serviceDiscText: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_MAIN,
    textAlign: 'center',
  },
  categoryCard: {
    alignItems: 'center',
    width: 80,
  },
  categoryImgWrap: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: BORDER,
  },
  categoryImg: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: TEXT_MUTED,
    textAlign: 'center',
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
  sectionTitleMain: {
    fontFamily: 'Inter-Bold',
    fontSize: 22,
    fontWeight: '900',
    color: TEXT_MAIN,
    paddingHorizontal: 20,
    marginBottom: 20,
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

  // Deal Card
  dealCard: {
    width: 290,
    height: 150,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FFF3E5', // subtle orange border for deals
    ...Platform.select({
      ios: { shadowColor: ORANGE, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 16 },
      android: { elevation: 2 },
    }),
  },
  dealContent: {
    padding: 16,
    flex: 1,
    justifyContent: 'center',
  },
  dealBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  dealBadgeTxt: {
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  dealTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: TEXT_MAIN,
    marginBottom: 4,
  },
  dealSub: {
    fontSize: 13,
    fontWeight: '500',
    color: TEXT_MUTED,
  },
  dealImg: {
    width: 120,
    height: 150,
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
    backgroundColor: '#F3FAF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 177, 64, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: EMERALD,
  },
});
