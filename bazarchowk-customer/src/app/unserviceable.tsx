import React, { useEffect, useState } from 'react';
import {
  View, StyleSheet, TouchableOpacity, Dimensions, Modal,
  Text, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { useCurrentLocation } from '@/hooks';
import { HomeService } from '@/services/home.service';
import api from '@/services/api';

const SOON_IMG = require('../../assets/images/soon.png');
const { width, height } = Dimensions.get('window');

const PRIMARY = '#00B140';

export default function UnserviceableScreen() {
  const insets = useSafeAreaInsets();
  const location = useCurrentLocation();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', location: '', marketName: '' });
  const [submitting, setSubmitting] = useState(false);

  // If the user changes location and a market becomes available, auto-redirect to Home
  const { data: markets = [] } = useQuery({
    queryKey: ['markets', location?.lat, location?.lng],
    queryFn: () => HomeService.getMarkets(location?.lat, location?.lng),
    enabled: !!location?.lat
  });

  useEffect(() => {
    if (location?.lat && markets.length > 0) {
      router.replace('/');
    }
  }, [markets.length, location?.lat]);

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.location.trim()) {
      Alert.alert('Please fill in all required fields.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/notifications/notify-interest', {
        name: form.name.trim(),
        email: form.email.trim(),
        location: form.location.trim(),
        marketName: form.marketName.trim() || 'Not specified',
      });
      setShowModal(false);
      setForm({ name: '', email: '', location: '', marketName: '' });
      Alert.alert('🎉 Thank You!', 'We\'ll notify you as soon as BazarChowk launches in your area!');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: '#F0FDF4' }]}>
      <Image source={SOON_IMG} style={styles.fullImage} contentFit="contain" />

      {/* Notify Me button — positioned at the area in image where the button text is */}
      <TouchableOpacity
        style={[styles.notifyBtn, { bottom: insets.bottom + height * 0.18 }]}
        onPress={() => setShowModal(true)}
        activeOpacity={0.7}
      />

      {/* Change Location button — positioned at the bottom */}
      <TouchableOpacity
        style={[styles.changeLocBtn, { bottom: insets.bottom + height * 0.06 }]}
        onPress={() => router.push('/addresses')}
        activeOpacity={0.5}
      />

      {/* Notify Me Form Modal */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.overlay}>
            <View style={styles.sheet}>
              {/* Handle */}
              <View style={styles.handle} />

              <Text style={styles.sheetTitle}>Notify Me 🔔</Text>
              <Text style={styles.sheetSub}>
                We'll send you an email the moment BazarChowk launches in your area!
              </Text>

              <Text style={styles.label}>Your Name <Text style={{ color: '#EF4444' }}>*</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Rahul Sharma"
                placeholderTextColor="#94A3B8"
                value={form.name}
                onChangeText={(v) => setForm(f => ({ ...f, name: v }))}
              />

              <Text style={styles.label}>Email Address <Text style={{ color: '#EF4444' }}>*</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. rahul@gmail.com"
                placeholderTextColor="#94A3B8"
                value={form.email}
                onChangeText={(v) => setForm(f => ({ ...f, email: v }))}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.label}>Your Location / Area <Text style={{ color: '#EF4444' }}>*</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Sector 15, Noida"
                placeholderTextColor="#94A3B8"
                value={form.location}
                onChangeText={(v) => setForm(f => ({ ...f, location: v }))}
              />

              <Text style={styles.label}>Nearest Market Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Bazar Chowk, Main Market"
                placeholderTextColor="#94A3B8"
                value={form.marketName}
                onChangeText={(v) => setForm(f => ({ ...f, marketName: v }))}
              />

              <TouchableOpacity
                style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting
                  ? <ActivityIndicator color="#FFF" />
                  : <Text style={styles.submitBtnText}>Send Notification Request</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fullImage: { width: '100%', height: '100%' },

  notifyBtn: {
    position: 'absolute',
    width: width * 0.55,
    height: 52,
    alignSelf: 'center',
    borderRadius: 26,
    // Debug: backgroundColor: 'rgba(0,177,64,0.3)',
  },
  changeLocBtn: {
    position: 'absolute',
    width: width * 0.7,
    height: 48,
    alignSelf: 'center',
    borderRadius: 24,
    // Debug: backgroundColor: 'rgba(255,0,0,0.3)',
  },

  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
  },
  handle: {
    width: 40, height: 4, backgroundColor: '#E2E8F0',
    borderRadius: 2, alignSelf: 'center', marginBottom: 20,
  },
  sheetTitle: { fontSize: 22, fontWeight: '900', color: '#0F172A', marginBottom: 6 },
  sheetSub: { fontSize: 14, color: '#64748B', marginBottom: 24, lineHeight: 20 },

  label: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 6 },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#0F172A',
    marginBottom: 16,
  },
  submitBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  cancelBtn: { alignItems: 'center', marginTop: 14 },
  cancelBtnText: { fontSize: 14, color: '#94A3B8', fontWeight: '600' },
});
