import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import api from '@/services/api';
import { useCartStore } from '@/store/cart.store';
import { useAuthStore } from '@/store/auth.store';

const PRIMARY = '#00B140';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCartStore();
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  const { cart } = useCartStore();
  const itemsCount = cart?.items?.reduce((acc: number, item: any) => acc + item.quantity, 0) || 0;

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const { data } = await api.get(`/products/${id}`);
      setProduct(data);
      if (data.variants && data.variants.length > 0) {
        setSelectedVariant(data.variants[0]);
      }
    } catch (e) {
      console.warn(e);
      Alert.alert('Error', 'Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const [addingToCart, setAddingToCart] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      Alert.alert('Login Required', 'Please login to add items to cart.', [
        { text: 'OK', onPress: () => router.push('/(auth)/login') }
      ]);
      return;
    }
    if (!selectedVariant) return;
    setAddingToCart(true);
    try {
      await addToCart(selectedVariant.id, quantity);
      setAddedSuccess(true);
      setTimeout(() => {
        setAddedSuccess(false);
        router.back();
      }, 800);
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      const errorMsg = Array.isArray(msg) ? msg.join(', ') : (msg || e?.message || 'Failed to add to cart. Check stock limits.');
      Alert.alert('Error', typeof errorMsg === 'string' ? errorMsg : 'Something went wrong');
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading || !product) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  const primaryImage = product.images?.find((img: any) => img.isPrimary)?.imageUrl 
    || product.images?.[0]?.imageUrl 
    || null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#122018" />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity style={styles.backBtn}>
            <Ionicons name="share-social-outline" size={24} color="#122018" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.push('/cart')}>
            <Ionicons name="cart-outline" size={24} color="#122018" />
            {itemsCount > 0 && (
              <View style={{ position: 'absolute', top: -4, right: -4, backgroundColor: PRIMARY, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#FFF', fontSize: 10, fontWeight: 'bold' }}>{itemsCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Image Gallery */}
        <View style={styles.imageContainer}>
          {primaryImage ? (
            <Image source={{ uri: primaryImage }} style={styles.mainImage} contentFit="contain" />
          ) : (
            <Ionicons name="cube" size={64} color="#8B9690" />
          )}
        </View>

        {/* Product Info */}
        <View style={styles.infoContainer}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{product.category?.name || 'Category'}</Text>
          </View>
          
          <Text style={styles.title}>{product.name}</Text>
          <TouchableOpacity onPress={() => router.push(`/shop/${product.shop?.id}`)}>
            <Text style={styles.shopName}>Sold by: <Text style={{ color: PRIMARY, textDecorationLine: 'underline' }}>{product.shop?.name}</Text></Text>
          </TouchableOpacity>
          
          <View style={styles.priceRow}>
            <Text style={styles.price}>₹{selectedVariant?.price || product.basePrice}</Text>
            {selectedVariant?.stock > 0 ? (
              <View style={styles.inStockBadge}>
                <Text style={styles.inStockText}>In Stock</Text>
              </View>
            ) : (
              <View style={[styles.inStockBadge, { backgroundColor: '#FEE2E2' }]}>
                <Text style={[styles.inStockText, { color: '#DC2626' }]}>Out of Stock</Text>
              </View>
            )}
          </View>

          {/* Variants */}
          {product.variants && product.variants.length > 1 && (
            <View style={styles.variantsContainer}>
              <Text style={styles.sectionTitle}>Select Variant</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                {product.variants.map((variant: any) => (
                  <TouchableOpacity 
                    key={variant.id}
                    style={[styles.variantBox, selectedVariant?.id === variant.id && styles.variantBoxActive]}
                    onPress={() => setSelectedVariant(variant)}
                  >
                    <Text style={[styles.variantText, selectedVariant?.id === variant.id && styles.variantTextActive]}>
                      {variant.name}
                    </Text>
                    <Text style={[styles.variantPrice, selectedVariant?.id === variant.id && styles.variantPriceActive]}>
                      ₹{variant.price}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Description */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{product.description}</Text>
          </View>

          {/* Reviews Section */}
          <View style={styles.reviewsContainer}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={styles.sectionTitle}>Ratings & Reviews</Text>
              <TouchableOpacity onPress={() => router.push(`/product/${id}/reviews`)}>
                <Text style={{ color: PRIMARY, fontWeight: '700' }}>See All</Text>
              </TouchableOpacity>
            </View>
            
            {product.reviews && product.reviews.length > 0 ? (
              product.reviews.slice(0, 3).map((review: any) => (
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
            ) : (
              <View style={styles.noReviewsBox}>
                <Ionicons name="chatbubble-ellipses-outline" size={32} color="#CBD5E1" />
                <Text style={styles.noReviewsText}>No reviews yet.</Text>
                <Text style={styles.noReviewsSub}>Be the first to review this product after purchase!</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <View style={styles.qtyControls}>
          <TouchableOpacity 
            style={styles.qtyBtn}
            onPress={() => setQuantity(Math.max(1, quantity - 1))}
          >
            <Ionicons name="remove" size={20} color="#122018" />
          </TouchableOpacity>
          <Text style={styles.qtyText}>{quantity}</Text>
          <TouchableOpacity 
            style={styles.qtyBtn}
            onPress={() => {
              if (selectedVariant && quantity >= selectedVariant.stock) {
                Alert.alert('Stock Limit', `Only ${selectedVariant.stock} items available in stock.`);
              } else {
                setQuantity(quantity + 1);
              }
            }}
          >
            <Ionicons name="add" size={20} color="#122018" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[
            styles.addToCartBtn, 
            (!selectedVariant || selectedVariant?.stock < 1 || addingToCart || addedSuccess) && { backgroundColor: addedSuccess ? '#008F3C' : '#EAF8F0', shadowOpacity: addedSuccess ? 0.3 : 0 }
          ]}
          disabled={!selectedVariant || selectedVariant?.stock < 1 || addingToCart || addedSuccess}
          onPress={handleAddToCart}
          activeOpacity={0.8}
        >
          {addedSuccess ? (
            <View style={{flexDirection: 'row', alignItems:'center', gap: 6}}>
               <Ionicons name="checkmark-circle" size={20} color="#FFF" />
               <Text style={styles.addToCartText}>Added to Cart</Text>
            </View>
          ) : addingToCart ? (
            <ActivityIndicator color="#122018" />
          ) : !selectedVariant || selectedVariant?.stock < 1 ? (
            <Text style={[styles.addToCartText, { color: '#8B9690' }]}>Out of Stock</Text>
          ) : (
            <Text style={styles.addToCartText}>Add to Cart</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
  container: { flex: 1, backgroundColor: '#FFF' },
  header: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4,
  },
  imageContainer: {
    width: '100%', height: 350, backgroundColor: '#F7FAF8',
    alignItems: 'center', justifyContent: 'center',
  },
  mainImage: { width: '80%', height: '80%' },
  infoContainer: { padding: 20 },
  categoryBadge: { alignSelf: 'flex-start', backgroundColor: '#EAF8F0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 12 },
  categoryText: { fontSize: 12, fontWeight: '600', color: '#66736B' },
  title: { fontSize: 24, fontWeight: '800', color: '#122018', marginBottom: 4 },
  shopName: { fontSize: 14, color: '#66736B', marginBottom: 16 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  price: { fontSize: 28, fontWeight: '800', color: PRIMARY },
  inStockBadge: { backgroundColor: '#EAF8F0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  inStockText: { color: '#008F3C', fontSize: 12, fontWeight: '700' },
  
  variantsContainer: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#122018', marginBottom: 12 },
  variantBox: { borderWidth: 1, borderColor: '#E5EBE7', borderRadius: 12, padding: 12, minWidth: 100, alignItems: 'center' },
  variantBoxActive: { borderColor: PRIMARY, backgroundColor: '#F3FAF5' },
  variantText: { fontSize: 14, fontWeight: '600', color: '#66736B', marginBottom: 4 },
  variantTextActive: { color: PRIMARY },
  variantPrice: { fontSize: 16, fontWeight: '700', color: '#122018' },
  variantPriceActive: { color: PRIMARY },

  descriptionContainer: { marginTop: 8 },
  description: { fontSize: 15, lineHeight: 24, color: '#66736B' },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFF',
    borderTopWidth: 1, borderTopColor: '#EAF8F0',
    paddingHorizontal: 20, paddingTop: 16,
    flexDirection: 'row', gap: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 10,
  },
  qtyControls: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F7FAF8', borderRadius: 16,
    paddingHorizontal: 8,
  },
  qtyBtn: { padding: 12 },
  qtyText: { fontSize: 18, fontWeight: '700', color: '#122018', minWidth: 24, textAlign: 'center' },
  addToCartBtn: {
    flex: 1, backgroundColor: PRIMARY,
    borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  addToCartText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  reviewsContainer: { marginTop: 32 },
  reviewCard: { backgroundColor: '#F7FAF8', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#EAF8F0' },
  reviewAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E5EBE7', alignItems: 'center', justifyContent: 'center' },
  reviewAvatarText: { fontSize: 14, fontWeight: '700', color: '#66736B' },
  reviewName: { fontSize: 14, fontWeight: '700', color: '#122018' },
  reviewDate: { fontSize: 12, color: '#8B9690', fontWeight: '500' },
  reviewComment: { fontSize: 14, color: '#66736B', marginTop: 8, lineHeight: 20 },
  noReviewsBox: { alignItems: 'center', paddingVertical: 32, backgroundColor: '#F7FAF8', borderRadius: 16, borderWidth: 1, borderColor: '#EAF8F0', borderStyle: 'dashed' },
  noReviewsText: { fontSize: 15, fontWeight: '700', color: '#66736B', marginTop: 12 },
  noReviewsSub: { fontSize: 13, color: '#8B9690', marginTop: 4 },
});
