import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://bazarchowkapi.veritasco.tech';

export default function ShopReviewsScreen() {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const shopId = await SecureStore.getItemAsync('bazar_shop_id');
      if (!shopId) return;

      const res = await fetch(`${API_BASE}/reviews/shop/${shopId}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.warn('Failed to load reviews', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#00B140" /></View>;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.title}>Shop Reviews</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.avgRating}>{data?.averageRating?.toFixed(1) || '0.0'}</Text>
          <View style={styles.starsRow}>
            {[...Array(5)].map((_, i) => (
              <Ionicons key={i} name={i < Math.round(data?.averageRating || 0) ? "star" : "star-outline"} size={24} color="#F59E0B" />
            ))}
          </View>
          <Text style={styles.totalText}>Based on {data?.totalReviews || 0} customer ratings</Text>
        </View>

        <Text style={styles.sectionTitle}>Recent Reviews</Text>
        
        {data?.reviews?.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="star-half-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyText}>No reviews yet</Text>
            <Text style={styles.emptySub}>When customers review your shop or products, they will appear here.</Text>
          </View>
        ) : (
          data?.reviews?.map((review: any) => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{review.user?.firstName?.[0] || 'U'}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.reviewerName}>{review.user?.firstName} {review.user?.lastName}</Text>
                  <View style={{ flexDirection: 'row', marginTop: 4 }}>
                    {[...Array(5)].map((_, i) => (
                      <Ionicons key={i} name={i < review.rating ? "star" : "star-outline"} size={14} color="#F59E0B" />
                    ))}
                  </View>
                </View>
                <Text style={styles.dateText}>{new Date(review.createdAt).toLocaleDateString()}</Text>
              </View>
              {review.comment && (
                <Text style={styles.commentText}>{review.comment}</Text>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E2E8F0',
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  scroll: { padding: 16, paddingBottom: 100 },
  
  summaryCard: {
    backgroundColor: '#FFF', padding: 24, borderRadius: 20, alignItems: 'center', marginBottom: 24,
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  avgRating: { fontSize: 56, fontWeight: '900', color: '#0F172A' },
  starsRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 8, gap: 4 },
  totalText: { fontSize: 14, color: '#64748B', fontWeight: '500' },
  
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 16 },
  
  reviewCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  reviewHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '800', color: '#2563EB' },
  reviewerName: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  dateText: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },
  commentText: { fontSize: 15, color: '#475569', lineHeight: 22 },
  
  emptyState: { alignItems: 'center', padding: 32, backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed' },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#64748B', marginTop: 12 },
  emptySub: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginTop: 8 },
});
