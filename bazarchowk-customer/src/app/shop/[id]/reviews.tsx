import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '@/services/api';
import { useAuthStore } from '@/store/auth.store';

const PRIMARY = '#00B140';

export default function ShopReviewsScreen() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, [id]);

  const fetchReviews = async () => {
    try {
      const res = await api.get(`/reviews/shop/${id}`);
      setData(res.data);
    } catch (e) {
      console.warn('Failed to load shop reviews', e);
    } finally {
      setLoading(false);
    }
  };

  const { isAuthenticated } = useAuthStore();

  const submitReview = async () => {
    if (!isAuthenticated) {
      Alert.alert('Login Required', 'Please login to submit a review.', [
        { text: 'OK', onPress: () => router.push('/(auth)/login') }
      ]);
      return;
    }
    if (!rating) return;
    setSubmitting(true);
    try {
      await api.post('/reviews', {
        shopId: id,
        rating,
        comment
      });
      setSubmitted(true);
      setComment('');
      fetchReviews();
    } catch (e: any) {
      const raw = e.response?.data?.message;
      const isForbidden = e.response?.status === 403;
      const msg = isForbidden
        ? 'You can only review a shop after receiving a completed order from them.'
        : Array.isArray(raw) ? raw[0] : (raw || 'Failed to submit review.');
      Alert.alert(isForbidden ? '🛒 Order Required' : 'Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={PRIMARY} /></View>;
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#FFF' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Shop Ratings & Reviews</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Summary */}
        <View style={styles.summaryBox}>
          <Text style={styles.avgRating}>{data?.averageRating?.toFixed(1) || '0.0'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 8 }}>
            {[...Array(5)].map((_, i) => (
              <Ionicons key={i} name={i < Math.round(data?.averageRating || 0) ? "star" : "star-outline"} size={20} color="#F59E0B" />
            ))}
          </View>
          <Text style={styles.totalReviews}>Based on {data?.totalReviews || 0} reviews</Text>
        </View>

        {/* Post Review Form */}
        {submitted ? (
          <View style={[styles.formBox, { alignItems: 'center' }]}>
            <Ionicons name="checkmark-circle" size={48} color="#00B140" />
            <Text style={[styles.formTitle, { marginTop: 12 }]}>Review Posted! 🎉</Text>
            <Text style={{ color: '#64748B', textAlign: 'center' }}>Thank you for your feedback on this shop.</Text>
          </View>
        ) : (
          <View style={styles.formBox}>
            <Text style={styles.formTitle}>Write a Review for this Shop</Text>
            <View style={styles.starSelectRow}>
              {[1, 2, 3, 4, 5].map((num) => (
                <TouchableOpacity key={num} onPress={() => setRating(num)} style={{ padding: 4 }}>
                  <Ionicons name={num <= rating ? "star" : "star-outline"} size={32} color="#F59E0B" />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.input}
              placeholder="How was your experience with this shop?"
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={4}
              value={comment}
              onChangeText={setComment}
            />
            <TouchableOpacity style={styles.submitBtn} onPress={submitReview} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Post Review</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* Review List */}
        <Text style={styles.listTitle}>All Shop Reviews</Text>
        {data?.reviews?.length === 0 ? (
          <Text style={{ color: '#64748B', textAlign: 'center', marginTop: 32 }}>No reviews yet for this shop.</Text>
        ) : (
          data?.reviews?.map((review: any) => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <View style={styles.reviewAvatar}>
                  <Text style={styles.reviewAvatarText}>{review.user?.firstName?.[0] || 'A'}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.reviewName}>{review.user?.firstName} {review.user?.lastName}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                    {[...Array(5)].map((_, i) => (
                      <Ionicons key={i} name={i < review.rating ? "star" : "star-outline"} size={14} color="#F59E0B" />
                    ))}
                  </View>
                </View>
                <Text style={styles.reviewDate}>{new Date(review.createdAt).toLocaleDateString()}</Text>
              </View>
              {review.comment && (
                <Text style={styles.reviewComment}>{review.comment}</Text>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderColor: '#F1F5F9', backgroundColor: '#FFF'
  },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  scroll: { padding: 20, paddingBottom: 100 },
  summaryBox: { alignItems: 'center', marginBottom: 32 },
  avgRating: { fontSize: 48, fontWeight: '900', color: '#0F172A' },
  totalReviews: { fontSize: 14, color: '#64748B', fontWeight: '500' },
  
  formBox: { backgroundColor: '#F8FAFC', padding: 20, borderRadius: 20, marginBottom: 32 },
  formTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 16, textAlign: 'center' },
  starSelectRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 16 },
  input: {
    backgroundColor: '#FFF', borderRadius: 12, padding: 16, minHeight: 100, textAlignVertical: 'top',
    borderWidth: 1, borderColor: '#E2E8F0', fontSize: 15, color: '#0F172A', marginBottom: 16
  },
  submitBtn: { backgroundColor: PRIMARY, padding: 16, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  listTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 16 },
  reviewCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  reviewAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' },
  reviewAvatarText: { fontSize: 16, fontWeight: '800', color: PRIMARY },
  reviewName: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  reviewDate: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },
  reviewComment: { fontSize: 15, color: '#475569', marginTop: 12, lineHeight: 22 },
});
