import { Text as AppText } from '@/components/TranslatedText';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import api from '@/services/api';

const PRIMARY = '#00B140';
const { width: W } = Dimensions.get('window');

export default function MarketDetailScreen() {
  const params = useLocalSearchParams();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id as string);
  const insets = useSafeAreaInsets();

  const [market, setMarket] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMarket = async () => {
      try {
        const res = await api.get(`/markets/market-nodes/${id}`);
        setMarket(res.data);
      } catch (e) {
        console.warn('Failed to fetch market details');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchMarket();
  }, [id]);

  return (
    <View style={[styles.root, { backgroundColor: '#F7FAF8' }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color="#122018" />
        </TouchableOpacity>
        <AppText style={styles.headerTitle} numberOfLines={1}>{market?.name || 'Market'}</AppText>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={PRIMARY} />
          </View>
        ) : !market ? (
          <View style={styles.centered}>
            <AppText style={styles.emptyTitle}>Market not found</AppText>
          </View>
        ) : (
          <>
            <View style={styles.marketBanner}>
              {market.imageUrl ? (
                <Image source={{ uri: market.imageUrl }} style={styles.marketBannerImg} contentFit="cover" />
              ) : (
                <View style={[styles.marketBannerImg, { backgroundColor: '#E5EBE7', alignItems: 'center', justifyContent: 'center' }]}>
                  <Ionicons name="business-outline" size={48} color="#8B9690" />
                </View>
              )}
              <View style={styles.marketBannerOverlay}>
                <AppText style={styles.marketBannerName}>{market.name}</AppText>
                <AppText style={styles.marketBannerSub}>{market.shops?.length || 0} Shops Available</AppText>
              </View>
            </View>

            <View style={styles.shopSection}>
              <AppText style={styles.sectionTitle}>Shops in this Market</AppText>
              
              {market.shops?.length === 0 ? (
                <AppText style={styles.emptyText}>No shops currently active in this market.</AppText>
              ) : (
                market.shops?.map((shop: any) => (
                  <TouchableOpacity 
                    key={shop.id} 
                    style={styles.shopCard} 
                    activeOpacity={0.9} 
                    onPress={() => router.push(`/shop/${shop.id}`)}
                  >
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
                          <AppText style={styles.openBadgeTxt}>OPEN</AppText>
                        </View>
                      )}
                    </View>
                    <View style={styles.shopInfo}>
                      <AppText style={styles.shopName} numberOfLines={1}>{shop.name}</AppText>
                      <AppText style={styles.shopMeta}>
                        <Ionicons name="star" size={12} color="#F59E0B" /> {shop.rating?.toFixed(1) || '4.5'}
                      </AppText>
                      <AppText style={styles.shopDesc} numberOfLines={2}>{shop.description || 'Visit us for best products.'}</AppText>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#EAF8F0', backgroundColor: '#FFF'
  },
  iconBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#F7FAF8', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#EAF8F0',
  },
  headerTitle: {
    flex: 1, textAlign: 'center', fontSize: 18,
    fontWeight: '800', color: '#122018', marginHorizontal: 12,
  },
  scroll: { paddingBottom: 120 },
  centered: { flex: 1, alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#122018', marginTop: 16 },
  
  marketBanner: { width: '100%', height: 220, position: 'relative' },
  marketBannerImg: { width: '100%', height: '100%' },
  marketBannerOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 20, paddingTop: 60,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  marketBannerName: { color: '#FFF', fontSize: 24, fontWeight: '900' },
  marketBannerSub: { color: '#E5EBE7', fontSize: 14, fontWeight: '600', marginTop: 4 },

  shopSection: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#122018', marginBottom: 16 },
  emptyText: { color: '#66736B', fontSize: 14, fontWeight: '500' },

  shopCard: {
    flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 16, marginBottom: 16,
    padding: 12, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2
  },
  shopImgWrapper: { width: 90, height: 90, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  shopImg: { width: '100%', height: '100%' },
  openBadge: {
    position: 'absolute', bottom: 6, left: 6, backgroundColor: PRIMARY,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6
  },
  openBadgeTxt: { color: '#FFF', fontSize: 9, fontWeight: '800' },
  
  shopInfo: { flex: 1, justifyContent: 'center' },
  shopName: { fontSize: 16, fontWeight: '800', color: '#122018', marginBottom: 4 },
  shopMeta: { fontSize: 13, color: '#66736B', fontWeight: '600', marginBottom: 6 },
  shopDesc: { fontSize: 12, color: '#8B9690', fontWeight: '500', lineHeight: 18 }
});
