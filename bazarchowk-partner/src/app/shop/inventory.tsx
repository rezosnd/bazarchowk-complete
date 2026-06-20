import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://bazarchowkapi.veritasco.tech';

export default function ShopInventoryScreen() {
  const insets = useSafeAreaInsets();
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [newStock, setNewStock] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const token = await SecureStore.getItemAsync('partner_token');
      const shopId = await SecureStore.getItemAsync('bazar_shop_id');
      if (!shopId || !token) throw new Error('Missing session data');
      
      const res = await fetch(`${API_BASE}/inventory/shop/${shopId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setInventoryList(data);
      }
    } catch (error) {
      console.error('Failed to fetch inventory ledgers');
    } finally {
      setLoading(false);
    }
  };

  const openAdjustModal = (item: any) => {
    setSelectedItem(item);
    setNewStock(String(item.quantity));
  };

  const handleUpdateStock = async () => {
    if (!selectedItem) return;
    setUpdating(true);
    try {
      const token = await SecureStore.getItemAsync('partner_token');
      const res = await fetch(`${API_BASE}/inventory/${selectedItem.id}/set`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          quantity: parseInt(newStock, 10),
          reason: 'Partner manual adjustment via App',
        }),
      });

      if (res.ok) {
        setSelectedItem(null);
        fetchInventory(); // Refresh list
      } else {
        alert('Failed to update stock');
      }
    } catch (e) {
      alert('Network Error');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
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
        <Text style={styles.title}>Inventory Ledger</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Analytics Card */}
        <View style={styles.analyticsCard}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total SKUs</Text>
            <Text style={styles.statValue}>{inventoryList.length}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Low Stock Alerts</Text>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>
              {inventoryList.filter(i => i.quantity <= i.lowStockThreshold).length}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Stock Management</Text>

        {inventoryList.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyText}>No inventory ledgers yet.</Text>
            <Text style={styles.emptySub}>Ledgers auto-create when you add products.</Text>
          </View>
        ) : (
          inventoryList.map((item) => {
            const isLowStock = item.quantity <= item.lowStockThreshold;

            return (
              <View key={item.id} style={[styles.card, isLowStock && styles.lowStockCard]}>
                <View style={styles.info}>
                  <Text style={styles.skuText}>SKU: {item.productVariant?.sku}</Text>
                  <Text style={styles.variantName} numberOfLines={1}>
                    {item.productVariant?.product?.name} - {item.productVariant?.name}
                  </Text>
                  
                  <View style={styles.metaRow}>
                    <Text style={styles.thresholdText}>Threshold: {item.lowStockThreshold}</Text>
                    {isLowStock && (
                      <View style={styles.alertBadge}>
                        <Ionicons name="warning" size={12} color="#DC2626" />
                        <Text style={styles.alertText}>Low Stock</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.rightSide}>
                  <Text style={styles.qtyText}>{item.quantity}</Text>
                  <TouchableOpacity style={styles.adjustBtn} onPress={() => openAdjustModal(item)}>
                    <Text style={styles.adjustText}>Adjust</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Adjust Modal */}
      {selectedItem && (
        <Modal transparent visible animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Adjust Stock Level</Text>
              <Text style={styles.modalSub}>{selectedItem.productVariant?.sku}</Text>

              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={newStock}
                onChangeText={setNewStock}
                placeholder="New quantity..."
              />

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setSelectedItem(null)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleUpdateStock} disabled={updating}>
                  {updating ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveText}>Save Stock</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E2E8F0',
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginLeft: 8 },
  scroll: { padding: 16, paddingBottom: 100 },
  analyticsCard: {
    flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 16, padding: 20,
    marginBottom: 24, borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  statBox: { flex: 1, alignItems: 'center' },
  divider: { width: 1, backgroundColor: '#E2E8F0', marginHorizontal: 16 },
  statLabel: { fontSize: 13, color: '#64748B', fontWeight: '600', marginBottom: 4 },
  statValue: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 16 },
  emptyState: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginTop: 12 },
  emptySub: { fontSize: 13, color: '#64748B', marginTop: 6 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', padding: 16, borderRadius: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0',
  },
  lowStockCard: { borderColor: '#FECACA', backgroundColor: '#FEF2F2' },
  info: { flex: 1, paddingRight: 12 },
  skuText: { fontSize: 11, fontWeight: '700', color: '#64748B', marginBottom: 4, letterSpacing: 0.5 },
  variantName: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thresholdText: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  alertBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  alertText: { fontSize: 10, fontWeight: '800', color: '#DC2626' },
  rightSide: { alignItems: 'flex-end' },
  qtyText: { fontSize: 24, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
  adjustBtn: { backgroundColor: '#F1F5F9', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8 },
  adjustText: { fontSize: 13, fontWeight: '700', color: '#00B140' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: '#FFF', padding: 24, borderRadius: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  modalSub: { fontSize: 13, color: '#64748B', marginBottom: 20 },
  input: { height: 56, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 16, fontSize: 18, color: '#0F172A', backgroundColor: '#F8FAFC', marginBottom: 24 },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, height: 48, backgroundColor: '#F1F5F9', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: '#64748B', fontWeight: '700' },
  saveBtn: { flex: 1, height: 48, backgroundColor: '#00B140', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: '#FFF', fontWeight: '700' },
});
