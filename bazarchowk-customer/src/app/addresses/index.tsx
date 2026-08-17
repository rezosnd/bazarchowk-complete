import { Text as AppText } from '@/components/TranslatedText';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAddresses, useSetDefaultAddress, useDeleteAddress } from '@/hooks';
import { Header } from '@/components/Header';
import { PressableScale } from '@/components/PressableScale';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';

export default function AddressesScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  
  const { data: addresses, isLoading, error } = useAddresses();
  const setDefaultMutation = useSetDefaultAddress();
  const deleteMutation = useDeleteAddress();

  if (isLoading) {
    return (
      <View style={styles.root}>
        <Header title="Saved Addresses" showBack={true} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#00B140" />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.root}>
        <Header title="Saved Addresses" showBack={true} />
        <View style={styles.center}>
          <AppText style={{ color: '#EF4444' }}>Failed to load addresses</AppText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Header title="Saved Addresses" showBack={true} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {addresses?.length === 0 ? (
          <Animated.View entering={FadeInUp.springify().damping(18)} style={styles.emptyState}>
            <View style={styles.emptyIconBg}>
              <Ionicons name="location-outline" size={48} color="#00B140" />
            </View>
            <AppText style={styles.emptyText}>No saved addresses found.</AppText>
            <AppText style={styles.emptySub}>Add a new address to get started.</AppText>
          </Animated.View>
        ) : (
          addresses?.map((address, index) => (
            <Animated.View key={address.id} entering={FadeInDown.delay(index * 50).springify().damping(15)}>
              <PressableScale
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
                  address.isDefault && styles.addressCardDefault
                ]}
                scaleTo={0.97}
              >
                <View style={styles.addressHeader}>
                  <View style={styles.titleRow}>
                    <Ionicons name={address.isDefault ? "checkmark-circle" : "location-outline"} size={22} color={address.isDefault ? '#00B140' : '#8B9690'} />
                    <AppText style={[styles.addressTitle, { color: address.isDefault ? '#00B140' : '#122018' }]}>{address.title}</AppText>
                    {address.isDefault && (
                      <View style={styles.defaultBadge}>
                        <AppText style={styles.defaultText}>Delivery Location</AppText>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.addressBody}>
                  <AppText style={styles.addressDetail}>
                    {address.addressLine1}
                    {address.addressLine2 ? `, ${address.addressLine2}` : ''}
                  </AppText>
                  <AppText style={styles.addressDetail}>
                    {address.city}, {address.state} {address.pincode}
                  </AppText>
                </View>

                <View style={styles.actionsRow}>
                  <View style={{ flex: 1 }} />
                  <PressableScale
                    onPress={() => deleteMutation.mutate(address.id)}
                    style={styles.actionBtn}
                  >
                    <Ionicons name="trash-outline" size={20} color="#DC2626" />
                  </PressableScale>
                </View>
              </PressableScale>
            </Animated.View>
          ))
        )}
      </ScrollView>

      {/* Footer Add Button */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <PressableScale style={styles.addBtn} onPress={() => router.push('/addresses/new')}>
          <AppText style={styles.addBtnText}>+ Add New Address</AppText>
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7FBF8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, gap: 16, paddingBottom: 100 },
  
  emptyState: { alignItems: 'center', marginTop: '40%' },
  emptyIconBg: { width: 96, height: 96, borderRadius: 32, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAF8F0', shadowColor: '#00B140', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  emptyText: { fontSize: 20, fontWeight: '800', color: '#122018', marginBottom: 8, letterSpacing: -0.2 },
  emptySub: { fontSize: 14, color: '#66736B' },

  addressCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5EBE7',
    backgroundColor: '#FFFFFF',
    padding: 20,
    shadowColor: '#00B140',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
  },
  addressCardDefault: {
    backgroundColor: '#F0FDF4',
    borderColor: '#00B140',
    borderWidth: 1.5,
  },
  addressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addressTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  defaultBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: '#EAF8F0', marginLeft: 8 },
  defaultText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', color: '#008F3C', letterSpacing: 0.5 },
  
  addressBody: { paddingLeft: 30 },
  addressDetail: { fontSize: 14, lineHeight: 22, color: '#66736B', marginBottom: 4, fontWeight: '500' },
  
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F5F2',
  },
  actionBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FEE2E2' },
  
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5EBE7',
    shadowColor: '#00B140',
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 12,
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
    fontWeight: '800',
  }
});
