import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks';
import { FontSize, FontWeight, Spacing } from '@/theme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAddresses, useSetDefaultAddress, useDeleteAddress } from '@/hooks';
import { Button } from '@/components/ui';

export default function AddressesScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  
  const { data: addresses, isLoading, error } = useAddresses();
  const setDefaultMutation = useSetDefaultAddress();
  const deleteMutation = useDeleteAddress();

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: '#F7FAF8' }]}>
        <Text style={{ color: '#EF4444' }}>Failed to load addresses</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F7FAF8' }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#122018" />
        </TouchableOpacity>
        <Text style={styles.title}>Saved Addresses</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {addresses?.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconBg}>
              <Ionicons name="location-outline" size={48} color="#00B140" />
            </View>
            <Text style={styles.emptyText}>No saved addresses found.</Text>
          </View>
        ) : (
          addresses?.map((address) => (
            <TouchableOpacity
              key={address.id}
              activeOpacity={0.8}
              onPress={() => {
                if (!address.isDefault) {
                  setDefaultMutation.mutate(address.id, {
                    onSuccess: () => router.back()
                  });
                } else {
                  router.back();
                }
              }}
              style={[
                styles.addressCard,
                {
                  backgroundColor: address.isDefault ? '#F0FDF4' : theme.background,
                  borderColor: address.isDefault ? theme.primary : theme.border,
                  borderWidth: address.isDefault ? 2 : 1
                }
              ]}
            >
              <View style={styles.addressHeader}>
                <View style={styles.titleRow}>
                  <Ionicons name={address.isDefault ? "checkmark-circle" : "home-outline"} size={20} color={address.isDefault ? '#00B140' : '#8B9690'} />
                  <Text style={[styles.addressTitle, { color: address.isDefault ? '#00B140' : '#122018' }]}>{address.title}</Text>
                  {address.isDefault && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultText}>Delivery Location</Text>
                    </View>
                  )}
                </View>
              </View>

              <Text style={styles.addressDetail}>
                {address.addressLine1}
                {address.addressLine2 ? `, ${address.addressLine2}` : ''}
              </Text>
              <Text style={styles.addressDetail}>
                {address.city}, {address.state} {address.pincode}
              </Text>

              <View style={styles.actionsRow}>
                <View style={{ flex: 1 }} />
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    deleteMutation.mutate(address.id);
                  }}
                  style={styles.actionBtn}
                >
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Footer Add Button */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24), backgroundColor: '#FFFFFF' }]}>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/addresses/new')}>
          <Text style={styles.addBtnText}>+ Add New Address</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: { padding: 4, marginRight: 12 },
  title: { fontSize: 22, fontWeight: '700', color: '#122018' },
  content: { padding: 16, gap: 16, paddingBottom: 100 },
  emptyState: { alignItems: 'center', marginTop: 100, gap: 16 },
  emptyIconBg: { width: 80, height: 80, borderRadius: 24, backgroundColor: '#EAF8F0', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#66736B' },
  addressCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#00B140',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  addressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addressTitle: { fontSize: 16, fontWeight: '700' },
  defaultBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: '#EAF8F0', marginLeft: 8 },
  defaultText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', color: '#008F3C' },
  addressDetail: { fontSize: 14, lineHeight: 22, color: '#66736B', marginBottom: 2 },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5EBE7',
  },
  actionBtn: { padding: 4 },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5EBE7',
    shadowColor: '#00B140',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 10,
  },
  addBtn: {
    backgroundColor: '#00B140',
    paddingHorizontal: 28,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  }
});
