import { Text as AppText } from '@/components/TranslatedText';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import api from '@/services/api';
import { Image } from 'expo-image';

const PRIMARY = '#00B140';

export default function MyReviewsScreen() {
  const insets = useSafeAreaInsets();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyReviews();
  }, []);

  const fetchMyReviews = async () => {
    try {
      const { data } = await api.get('/reviews/me');
      setReviews(data);
    } catch (e) {
      console.warn('Failed to fetch my reviews', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={PRIMARY} /></View>;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#122018" />
        </TouchableOpacity>
        <AppText style={styles.title}>My Reviews</AppText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {reviews.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="star-outline" size={64} color="#CBD5E1" />
            <AppText style={styles.emptyText}>No reviews written</AppText>
            <AppText style={styles.emptySub}>You haven't reviewed any shops or products yet.</AppText>
          </View>
        ) : (
          reviews.map((review: any) => {
            const isProduct = !!review.product;
            const targetName = isProduct ? review.product.name : review.shop?.name;
            const targetImg = isProduct 
              ? (review.product.images?.[0]?.imageUrl)
              : (review.shop?.logoUrl);

            return (
              <View key={review.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  {targetImg ? (
                    <Image source={{ uri: targetImg }} style={styles.targetImg} contentFit="cover" />
                  ) : (
                    <View style={[styles.targetImg, { alignItems: 'center', justifyContent: 'center' }]}>
                      <Ionicons name={isProduct ? "cube" : "storefront"} size={24} color="#8B9690" />
                    </View>
                  )}
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <AppText style={styles.targetType}>{isProduct ? 'Product Review' : 'Shop Review'}</AppText>
                    <AppText style={styles.targetName} numberOfLines={1}>{targetName}</AppText>
                  </View>
                  <AppText style={styles.date}>{new Date(review.createdAt).toLocaleDateString()}</AppText>
                </View>

                <View style={styles.divider} />

                <View style={styles.starsRow}>
                  {[...Array(5)].map((_, i) => (
                    <Ionicons key={i} name={i < review.rating ? "star" : "star-outline"} size={16} color="#F59E0B" />
                  ))}
                  <AppText style={styles.ratingText}>{review.rating}.0</AppText>
                </View>
                
                {review.comment && (
                  <AppText style={styles.comment}>{review.comment}</AppText>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7FAF8' },
  container: { flex: 1, backgroundColor: '#F7FAF8' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E5EBE7',
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EAF8F0', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: '#122018' },
  scroll: { padding: 16, paddingBottom: 100 },
  
  emptyState: { alignItems: 'center', marginTop: 80, padding: 32, backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: '#E5EBE7', borderStyle: 'dashed' },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#122018', marginTop: 16 },
  emptySub: { fontSize: 14, color: '#66736B', textAlign: 'center', marginTop: 8 },

  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E5EBE7' },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  targetImg: { width: 48, height: 48, borderRadius: 8, backgroundColor: '#EAF8F0' },
  targetType: { fontSize: 12, fontWeight: '600', color: '#66736B', textTransform: 'uppercase' },
  targetName: { fontSize: 15, fontWeight: '800', color: '#122018', marginTop: 2 },
  date: { fontSize: 12, color: '#8B9690', fontWeight: '500' },
  
  divider: { height: 1, backgroundColor: '#EAF8F0', marginVertical: 12 },
  
  starsRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 8 },
  ratingText: { fontSize: 14, fontWeight: '700', color: '#122018', marginLeft: 6 },
  comment: { fontSize: 15, color: '#66736B', lineHeight: 22 },
});
