import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Switch, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://bazarchowk-complete.vercel.app';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function ShopTimingsScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);

  // Default state: 9 AM to 9 PM, Open every day
  const [schedule, setSchedule] = useState(
    DAYS.map((day, index) => ({
      dayOfWeek: index,
      openTime: '09:00',
      closeTime: '21:00',
      isClosed: false,
    }))
  );

  useEffect(() => {
    fetchTimings();
  }, []);

  const fetchTimings = async () => {
    try {
      const shopId = await SecureStore.getItemAsync('bazar_shop_id');
      if (!shopId) return;
      
      const res = await fetch(`${API_BASE}/shops/${shopId}/timings`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          // Merge fetched data with default skeleton (in case some days are missing)
          const newSchedule = [...schedule];
          data.forEach((timing: any) => {
            const idx = newSchedule.findIndex(s => s.dayOfWeek === timing.dayOfWeek);
            if (idx !== -1) {
              newSchedule[idx] = {
                dayOfWeek: timing.dayOfWeek,
                openTime: timing.openTime,
                closeTime: timing.closeTime,
                isClosed: timing.isClosed
              };
            }
          });
          setSchedule(newSchedule);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch timings', e);
    }
  };

  const toggleDay = (index: number) => {
    const newSchedule = [...schedule];
    newSchedule[index].isClosed = !newSchedule[index].isClosed;
    setSchedule(newSchedule);
  };

  const updateTime = (index: number, field: 'openTime' | 'closeTime', value: string) => {
    const newSchedule = [...schedule];
    newSchedule[index][field] = value;
    setSchedule(newSchedule);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('partner_token');
      const shopId = await SecureStore.getItemAsync('bazar_shop_id');
      
      if (!token) throw new Error('Authentication token missing.');
      if (!shopId) throw new Error('Shop ID not found in session');

      // Format time strings (e.g. "9:00" -> "09:00")
      const formattedSchedule = schedule.map(t => {
        let openTime = t.openTime;
        let closeTime = t.closeTime;
        
        if (openTime.includes(':')) {
          const [h, m] = openTime.split(':');
          openTime = `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
        }
        if (closeTime.includes(':')) {
          const [h, m] = closeTime.split(':');
          closeTime = `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
        }
        
        return { ...t, openTime, closeTime };
      });

      const payload = { timings: formattedSchedule };

      const res = await fetch(`${API_BASE}/shops/${shopId}/timings/bulk`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        alert('Weekly Schedule Saved Successfully!');
        router.push('/');
      } else {
        const err = await res.json();
        const msg = err.message || 'Validation error';
        alert(`Error: ${Array.isArray(msg) ? msg[0] : msg}`);
      }
    } catch (e) {
      alert('Network Error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Weekly Schedule</Text>
        <Text style={styles.subtitle}>Step 2: Set Operating Hours</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.hint}>Configure when customers can place orders from your shop.</Text>
          
          {schedule.map((day, idx) => (
            <View key={idx} style={styles.dayRow}>
              <View style={styles.dayInfo}>
                <Text style={styles.dayName}>{DAYS[idx]}</Text>
                <Text style={[styles.status, day.isClosed ? { color: '#EF4444' } : { color: '#00B140' }]}>
                  {day.isClosed ? 'Closed' : 'Open'}
                </Text>
              </View>

              {!day.isClosed && (
                <View style={styles.timeWrap}>
                  <View style={styles.timeBox}>
                    <TextInput 
                      style={styles.timeInput}
                      value={day.openTime}
                      onChangeText={(val) => updateTime(idx, 'openTime', val)}
                      placeholder="09:00"
                      keyboardType="numeric"
                      maxLength={5}
                    />
                  </View>
                  <Text style={{ color: '#94A3B8' }}>-</Text>
                  <View style={styles.timeBox}>
                    <TextInput 
                      style={styles.timeInput}
                      value={day.closeTime}
                      onChangeText={(val) => updateTime(idx, 'closeTime', val)}
                      placeholder="21:00"
                      keyboardType="numeric"
                      maxLength={5}
                    />
                  </View>
                </View>
              )}

              <View style={{ flex: 1 }} />
              
              <Switch
                value={!day.isClosed}
                onValueChange={() => toggleDay(idx)}
                trackColor={{ false: '#E2E8F0', true: '#DCFCE7' }}
                thumbColor={!day.isClosed ? '#00B140' : '#FFF'}
              />
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.btn} onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Save Schedule</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E2E8F0' },
  title: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
  subtitle: { fontSize: 14, color: '#00B140', fontWeight: '600', marginTop: 4 },
  scroll: { padding: 20, gap: 20, paddingBottom: 100 },
  card: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  hint: { fontSize: 14, color: '#64748B', marginBottom: 24 },
  dayRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  dayInfo: { width: 100 },
  dayName: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  status: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  timeWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 8 },
  timeBox: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8 },
  timeInput: { paddingHorizontal: 12, paddingVertical: 6, fontSize: 14, fontWeight: '600', color: '#334155', minWidth: 60, textAlign: 'center' },
  btn: { backgroundColor: '#00B140', height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#00B140', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
