import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export default function ShopDocumentsScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<any[]>([]);

  // Add document form
  const [documentType, setDocumentType] = useState('FSSAI');
  const [documentUrl, setDocumentUrl] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const token = await SecureStore.getItemAsync('partner_token');
      if (!token) throw new Error('Auth token missing');
      
      const res = await fetch(`${API_BASE}/shops/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (e) {
      console.warn('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDocument = async () => {
    if (!documentType || !documentUrl) {
      alert('Please provide both Type and URL');
      return;
    }
    setAdding(true);
    try {
      const token = await SecureStore.getItemAsync('partner_token');
      const shopId = await SecureStore.getItemAsync('bazar_shop_id');
      if (!token || !shopId) throw new Error('Missing session data');

      const payload = { documentType, documentUrl };

      const res = await fetch(`${API_BASE}/shops/${shopId}/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert('Document uploaded successfully for review');
        setDocumentUrl('');
        fetchDocuments();
      } else {
        alert('Failed to add document');
      }
    } catch (e) {
      alert('Network Error');
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#00B140" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verification Documents</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Uploaded Documents</Text>
          {documents.length === 0 ? (
            <Text style={styles.hint}>No documents uploaded yet. Upload FSSAI or Trade License to get your shop verified.</Text>
          ) : (
            documents.map((doc) => (
              <View key={doc.id} style={styles.docRow}>
                <View style={styles.docIcon}>
                  <Ionicons name="document-text" size={24} color="#00B140" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.docType}>{doc.documentType}</Text>
                  <Text style={styles.docUrl} numberOfLines={1}>{doc.documentUrl}</Text>
                </View>
                <View style={styles.statusBadge}>
                  {doc.isVerified ? (
                    <Ionicons name="checkmark-circle" size={20} color="#00B140" />
                  ) : (
                    <Ionicons name="time" size={20} color="#F59E0B" />
                  )}
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Add New Document</Text>
          
          <Text style={styles.label}>Document Type *</Text>
          <TextInput 
            style={styles.input} 
            placeholder="e.g. FSSAI, GST, Trade License" 
            value={documentType} 
            onChangeText={setDocumentType} 
          />

          <Text style={styles.label}>Document Image/PDF URL *</Text>
          <TextInput 
            style={styles.input} 
            placeholder="https://..." 
            value={documentUrl} 
            onChangeText={setDocumentUrl} 
          />

          <TouchableOpacity style={styles.btn} onPress={handleAddDocument} disabled={adding}>
            {adding ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Upload Document</Text>}
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
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
  hint: { fontSize: 13, color: '#64748B', lineHeight: 20 },
  docRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  docIcon: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  docType: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  docUrl: { fontSize: 12, color: '#64748B', marginTop: 2 },
  statusBadge: { marginLeft: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#64748B', marginBottom: 8 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: '#0F172A', marginBottom: 16 },
  btn: { backgroundColor: '#00B140', height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
