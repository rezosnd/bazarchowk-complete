import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://bazarchowk-complete.vercel.app';

export default function AddProductScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);

  // Core Product
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [categoryId, setCategoryId] = useState(''); // Would typically be a dropdown Picker
  const [searchTerms, setSearchTerms] = useState('');
  const [isPublished, setIsPublished] = useState(true);

  // Variant 1 (Default)
  const [sku, setSku] = useState('');
  const [variantName, setVariantName] = useState('Default');
  const [variantPrice, setVariantPrice] = useState('');
  const [stock, setStock] = useState('10');

  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE}/categories`);
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (e) {
      console.warn('Failed to fetch categories');
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!name || !basePrice || !categoryId || !sku || !variantPrice) {
      alert('Please fill all required fields and select a category');
      return;
    }

    setLoading(true);
    try {
      const shopId = await SecureStore.getItemAsync('bazar_shop_id');
      const token = await SecureStore.getItemAsync('partner_token');
      if (!shopId || !token) throw new Error('Missing session or auth token');

      const productPayload = {
        shopId,
        categoryId,
        name,
        description,
        basePrice: parseFloat(basePrice),
        searchTerms,
        isPublished,
      };

      const productRes = await fetch(`${API_BASE}/products`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(productPayload),
      });

      if (!productRes.ok) {
        const errStr = await productRes.text();
        throw new Error(`Failed to create product: ${errStr}`);
      }
      const product = await productRes.json();

      const variantPayload = {
        sku,
        name: variantName,
        price: parseFloat(variantPrice),
        stock: parseInt(stock, 10),
      };

      const varRes = await fetch(`${API_BASE}/products/${product.id}/variants`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(variantPayload),
      });
      if (!varRes.ok) {
        const errStr = await varRes.text();
        throw new Error(`Failed to create variant: ${errStr}`);
      }
      const variant = await varRes.json();

      // Initialize inventory ledger
      await fetch(`${API_BASE}/inventory/init?productVariantId=${variant.id}&shopId=${shopId}&initialQuantity=${variant.stock}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // Upload Image if present
      if (imageUri) {
        try {
          const formData = new FormData();
          const filename = imageUri.split('/').pop() || 'image.jpg';
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : `image`;

          formData.append('file', {
            uri: imageUri,
            name: filename,
            type,
          } as any);
          formData.append('folder', 'products');

          const uploadRes = await fetch(`${API_BASE}/upload`, {
            method: 'POST',
            body: formData,
            headers: {
              'Content-Type': 'multipart/form-data',
              'Authorization': `Bearer ${token}`,
            },
          });

          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            const uploadedUrl = uploadData.url || uploadData.secure_url;
            // Attach image to product
            await fetch(`${API_BASE}/products/${product.id}/images`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                imageUrl: uploadedUrl,
                isPrimary: true
              }),
            });
          }
        } catch (imgError) {
          console.error('Failed to upload image', imgError);
        }
      }

      alert('Product Added Successfully!');
      router.back();
    } catch (e: any) {
      alert(e.message || 'Error saving product. Ensure valid categoryId.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Product</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Basic Information</Text>

          <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.pickedImage} contentFit="cover" />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="camera-outline" size={32} color="#94A3B8" />
                <Text style={styles.imagePickerText}>Add Product Image</Text>
              </View>
            )}
          </TouchableOpacity>
          
          <Text style={styles.label}>Product Name *</Text>
          <TextInput style={styles.input} placeholder="e.g. Organic Tomatoes" value={name} onChangeText={setName} />

          <Text style={styles.label}>Category *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setCategoryId(cat.id)}
                style={[
                  styles.categoryChip,
                  categoryId === cat.id && styles.categoryChipSelected
                ]}
              >
                <Text style={[
                  styles.categoryChipText,
                  categoryId === cat.id && styles.categoryChipTextSelected
                ]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
            {categories.length === 0 && <Text style={{ color: '#94A3B8' }}>Loading categories...</Text>}
          </ScrollView>

          <Text style={styles.label}>Base Price (₹) *</Text>
          <TextInput style={styles.input} placeholder="100" keyboardType="numeric" value={basePrice} onChangeText={setBasePrice} />

          <Text style={styles.label}>Description</Text>
          <TextInput 
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]} 
            placeholder="Describe the product..." 
            value={description} onChangeText={setDescription} multiline 
          />

          <Text style={styles.label}>Search Keywords (comma separated)</Text>
          <TextInput style={styles.input} placeholder="tomato, veg, fresh" value={searchTerms} onChangeText={setSearchTerms} />

          <View style={styles.row}>
            <Text style={styles.label}>Publish immediately?</Text>
            <Switch
              value={isPublished}
              onValueChange={setIsPublished}
              trackColor={{ false: '#E2E8F0', true: '#DCFCE7' }}
              thumbColor={isPublished ? '#00B140' : '#FFF'}
            />
          </View>
        </View>

        {/* Initial Variant */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Default Variant & Stock</Text>
          
          <Text style={styles.label}>SKU (Barcode/Identifier) *</Text>
          <TextInput style={styles.input} placeholder="TOM-ORG-1KG" value={sku} onChangeText={setSku} autoCapitalize="characters" />

          <Text style={styles.label}>Variant Name (e.g. 1kg, 500g)</Text>
          <TextInput style={styles.input} placeholder="1kg" value={variantName} onChangeText={setVariantName} />

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Price (₹) *</Text>
              <TextInput style={styles.input} placeholder="100" keyboardType="numeric" value={variantPrice} onChangeText={setVariantPrice} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Stock Quantity *</Text>
              <TextInput style={styles.input} placeholder="10" keyboardType="numeric" value={stock} onChangeText={setStock} />
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.btn} onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Save Product</Text>}
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16,
    backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E2E8F0',
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#0F172A', marginLeft: 8 },
  scroll: { padding: 20, gap: 20, paddingBottom: 100 },
  card: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#64748B', marginBottom: 8 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: '#0F172A', marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  btn: { backgroundColor: '#00B140', height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#00B140', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  categoryChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#F1F5F9', marginRight: 10, borderWidth: 1, borderColor: 'transparent' },
  categoryChipSelected: { backgroundColor: '#DCFCE7', borderColor: '#00B140' },
  categoryChipText: { fontSize: 14, color: '#64748B', fontWeight: '600' },
  categoryChipTextSelected: { color: '#00B140', fontWeight: '700' },
  imagePicker: { alignSelf: 'center', marginBottom: 24 },
  imagePlaceholder: { width: 120, height: 120, borderRadius: 16, backgroundColor: '#F1F5F9', borderWidth: 2, borderColor: '#E2E8F0', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  imagePickerText: { fontSize: 12, color: '#64748B', marginTop: 8, fontWeight: '600', textAlign: 'center' },
  pickedImage: { width: 120, height: 120, borderRadius: 16 }
});
