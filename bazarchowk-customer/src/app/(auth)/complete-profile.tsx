import { Text as AppText } from '@/components/TranslatedText';
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store';
import api from '@/services/api';

const EMERALD = '#00B140';

export default function CompleteProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore(state => state.user);
  const setUser = useAuthStore(state => state.setUser);
  
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSavePhone = async () => {
    if (phone.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      // Assuming a generic PATCH endpoint exists for updating profile
      const response = await api.patch('/users/me', { phone });
      
      // Update local store
      if (user) {
        setUser({ ...user, phone });
      }
      
      // Phone is saved, redirect to the main app
      router.replace('/(tabs)');
    } catch (err: any) {
      setError('Failed to save mobile number. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={{ flex: 1, backgroundColor: '#FFFFFF' }}
    >
      <StatusBar style="dark" />
      <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
        
        <View style={{ alignItems: 'center', marginBottom: 40 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center', marginBottom: 24, padding: 20 }}>
            <Ionicons name="call" size={40} color={EMERALD} />
          </View>
          <AppText style={{ fontSize: 28, fontWeight: '900', color: '#111827', textAlign: 'center' }}>
            Action Required
          </AppText>
          <AppText style={{ fontSize: 16, color: '#6B7280', textAlign: 'center', marginTop: 12, lineHeight: 24 }}>
            For security and delivery purposes, you must attach a verified mobile number to your account before entering BazarChowk.
          </AppText>
        </View>

        <View style={{ marginBottom: 24 }}>
          <AppText style={{ fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 8, marginLeft: 4 }}>
            Mobile Number
          </AppText>
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            borderWidth: 2, 
            borderColor: error ? '#EF4444' : '#E5E7EB', 
            borderRadius: 16, 
            paddingHorizontal: 16,
            height: 60,
            backgroundColor: '#F9FAFB'
          }}>
            <AppText style={{ fontSize: 18, fontWeight: '700', color: '#9CA3AF', marginRight: 12 }}>+91</AppText>
            <View style={{ width: 1, height: 24, backgroundColor: '#E5E7EB', marginRight: 12 }} />
            <TextInput
              style={{ flex: 1, fontSize: 18, fontWeight: '700', color: '#111827' }}
              placeholder="99999 00000"
              placeholderTextColor="#D1D5DB"
              keyboardType="phone-pad"
              maxLength={10}
              value={phone}
              onChangeText={(text) => {
                setPhone(text.replace(/[^0-9]/g, ''));
                if (error) setError('');
              }}
            />
          </View>
          {error ? <AppText style={{ color: '#EF4444', fontSize: 12, fontWeight: '600', marginTop: 8, marginLeft: 4 }}>{error}</AppText> : null}
        </View>

        <TouchableOpacity 
          onPress={handleSavePhone}
          disabled={loading}
          style={{
            backgroundColor: EMERALD,
            height: 60,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: EMERALD,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 16,
            elevation: 8,
          }}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <AppText style={{ color: '#FFF', fontSize: 18, fontWeight: '800' }}>Save & Continue</AppText>
          )}
        </TouchableOpacity>

      </View>
    </KeyboardAvoidingView>
  );
}
