import React, { useState } from 'react';
import {
  ScrollView, StyleSheet, Text, View,
  Dimensions, ActivityIndicator, TextInput
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useCategories } from '@/hooks';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import api from '@/services/api';
import { useAuthStore } from '@/store';
import { Header } from '@/components/Header';
import { PressableScale } from '@/components/PressableScale';

const { width: W } = Dimensions.get('window');
const PADDING_H = 16;
const PRIMARY = '#00B140';

export default function CategoriesScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuthStore();
  const [search, setSearch] = useState('');

  const { data: addresses = [] } = useQuery({
    queryKey: ['addresses'],
    queryFn: async () => { const res = await api.get('/addresses'); return res.data; },
    enabled: isAuthenticated,
  });

  const defaultAddress = addresses.find((a: any) => a.isDefault) || addresses[0];

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
        <PressableScale
          onPress={() => router.push(`/category/${item.id}?name=${encodeURIComponent(item.name || 'Category')}` as any)}
          style={styles.card}
          scaleTo={0.94}
        >
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: item.imageUrl || PLACEHOLDER }}
              style={styles.categoryImage}
              contentFit="cover"
              transition={200}
            />
          </View>
          <Text style={styles.categoryName} numberOfLines={2}>
            {item.name}
          </Text>
        </PressableScale>
      </Animated.View>
    );
  };

  return (
    <View style={styles.root}>
      <Header title="All Categories" showBack={false} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 80 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInUp.delay(50).springify().damping(18)} style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#00B140" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search categories..."
              placeholderTextColor="#8B9690"
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <PressableScale onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={20} color="#8B9690" />
              </PressableScale>
            )}
          </View>
        </Animated.View>

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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7FBF8' },
  searchContainer: {
    paddingHorizontal: PADDING_H,
    paddingVertical: 16,
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 16,
    paddingHorizontal: 16, height: 50,
    borderWidth: 1, borderColor: '#E5EBE7',
    shadowColor: '#00B140', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04, shadowRadius: 12, elevation: 2,
    gap: 12,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#122018', fontWeight: '500' },

  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10 },
  gridItem: { width: (W - 20) / 3, padding: 6, marginBottom: 12 },
  card: { 
    alignItems: 'center', 
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EAF8F0',
    shadowColor: '#00B140', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03, shadowRadius: 8, elevation: 2,
    width: '100%',
    minHeight: 120,
  },
  imageContainer: {
    width: 64, height: 64, borderRadius: 16, backgroundColor: '#F7FBF8',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  categoryImage: { width: 44, height: 44 },
  categoryName: { fontSize: 13, fontWeight: '700', color: '#122018', textAlign: 'center', lineHeight: 18 },

  centered: { alignItems: 'center', paddingVertical: 80, paddingHorizontal: 20 },
  loadingText: { marginTop: 16, color: '#66736B', fontWeight: '600', fontSize: 15 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#122018', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#66736B', fontWeight: '500', marginTop: 4, textAlign: 'center' },
});
