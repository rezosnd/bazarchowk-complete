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
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={{ color: '#EF4444' }}>Failed to load addresses</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Saved Addresses</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {addresses?.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="location-outline" size={64} color={theme.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No saved addresses found.
            </Text>
          </View>
        ) : (
          addresses?.map((address) => (
            <View key={address.id} style={[styles.addressCard, { backgroundColor: theme.background, borderColor: address.isDefault ? theme.primary : theme.border }]}>
              <View style={styles.addressHeader}>
                <View style={styles.titleRow}>
                  <Ionicons name="home" size={20} color={theme.textSecondary} />
                  <Text style={[styles.addressTitle, { color: theme.text }]}>{address.title}</Text>
                  {address.isDefault && (
                    <View style={[styles.defaultBadge, { backgroundColor: theme.primarySurface }]}>
                      <Text style={[styles.defaultText, { color: theme.primary }]}>Default</Text>
                    </View>
                  )}
                </View>
              </View>

              <Text style={[styles.addressDetail, { color: theme.textSecondary }]}>
                {address.addressLine1}
                {address.addressLine2 ? `, ${address.addressLine2}` : ''}
              </Text>
              <Text style={[styles.addressDetail, { color: theme.textSecondary }]}>
                {address.city}, {address.state} {address.pincode}
              </Text>

              <View style={[styles.actionsRow, { borderTopColor: theme.divider }]}>
                {!address.isDefault && (
                  <TouchableOpacity
                    onPress={() => setDefaultMutation.mutate(address.id)}
                    style={styles.actionBtn}
                  >
                    <Text style={[styles.actionText, { color: theme.primary }]}>Set Default</Text>
                  </TouchableOpacity>
                )}
                <View style={{ flex: 1 }} />
                <TouchableOpacity
                  onPress={() => deleteMutation.mutate(address.id)}
                  style={styles.actionBtn}
                >
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Footer Add Button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom || Spacing.lg, backgroundColor: theme.background }]}>
        <Button
          title="+ Add New Address"
          onPress={() => router.push('/addresses/new')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: { padding: Spacing.xs, marginRight: Spacing.sm },
  title: { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  content: { padding: Spacing.base, gap: Spacing.base },
  emptyState: { alignItems: 'center', marginTop: 80, gap: Spacing.md },
  emptyText: { fontSize: FontSize.base },
  addressCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  addressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  addressTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  defaultBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  defaultText: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  addressDetail: { fontSize: FontSize.sm, lineHeight: 20 },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  actionBtn: { padding: Spacing.xs },
  actionText: { fontSize: FontSize.sm, fontWeight: 'bold' },
  footer: {
    padding: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 10,
  },
});
