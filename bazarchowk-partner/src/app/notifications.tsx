import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { socketService } from '@/services/socket';

const PRIMARY = '#00B140';
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://bazarchowk-complete.vercel.app';

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
    
    socketService.connect();
    
    const handleNewNotification = (notification: any) => {
      setNotifications(prev => {
        if (prev.some(n => n.id === notification.id)) return prev;
        return [notification, ...prev];
      });
    };
    
    socketService.on('new_notification', handleNewNotification);
    
    return () => {
      socketService.off('new_notification', handleNewNotification);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = await SecureStore.getItemAsync('partner_token');
      if (!token) return;

      const res = await fetch(`${API_BASE}/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (error) {
      console.warn('Failed to fetch notifications', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      const token = await SecureStore.getItemAsync('partner_token');
      await fetch(`${API_BASE}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (error) {}
  };

  const markAllAsRead = async () => {
    try {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      const token = await SecureStore.getItemAsync('partner_token');
      await fetch(`${API_BASE}/notifications/read-all`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (error) {}
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'ORDER': return <Ionicons name="receipt" size={24} color="#3B82F6" />;
      case 'PROMO': return <Ionicons name="pricetag" size={24} color="#EAB308" />;
      case 'SYSTEM': return <Ionicons name="settings" size={24} color="#64748B" />;
      case 'ALERT': return <Ionicons name="warning" size={24} color="#EF4444" />;
      default: return <Ionicons name="notifications" size={24} color={PRIMARY} />;
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={PRIMARY} /></View>;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.title}>Notifications</Text>
        </View>
        
        {notifications.some(n => !n.isRead) && (
          <TouchableOpacity onPress={markAllAsRead} style={styles.clearBtn}>
            <Text style={styles.clearText}>Mark All Read</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyText}>You're all caught up!</Text>
            <Text style={styles.emptySub}>No new notifications right now.</Text>
          </View>
        ) : (
          notifications.map((notif) => (
            <TouchableOpacity 
              key={notif.id} 
              style={[styles.card, !notif.isRead && styles.cardUnread]}
              onPress={() => markAsRead(notif.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBox, !notif.isRead && styles.iconBoxUnread]}>
                {getIcon(notif.type)}
              </View>
              
              <View style={styles.content}>
                <Text style={[styles.notifTitle, !notif.isRead && styles.textUnread]}>{notif.title}</Text>
                <Text style={styles.notifMessage} numberOfLines={3}>{notif.message}</Text>
                <Text style={styles.time}>{new Date(notif.createdAt).toLocaleString()}</Text>
              </View>

              {!notif.isRead && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF',
    borderBottomWidth: 1, borderColor: '#E2E8F0',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginLeft: 4 },
  clearBtn: { backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  clearText: { color: '#475569', fontSize: 12, fontWeight: '700' },
  
  scroll: { padding: 16, paddingBottom: 100 },
  
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginTop: 16 },
  emptySub: { fontSize: 14, color: '#64748B', marginTop: 8 },
  
  card: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#FFF', padding: 16, borderRadius: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  cardUnread: { backgroundColor: '#F0FDF4', borderColor: '#DCFCE7' },
  iconBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' },
  iconBoxUnread: { backgroundColor: '#FFF' },
  content: { flex: 1, marginLeft: 16, paddingRight: 8 },
  notifTitle: { fontSize: 15, fontWeight: '700', color: '#334155', marginBottom: 4 },
  textUnread: { color: '#0F172A', fontWeight: '800' },
  notifMessage: { fontSize: 14, color: '#475569', lineHeight: 20 },
  time: { fontSize: 12, color: '#94A3B8', marginTop: 8, fontWeight: '500' },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: PRIMARY, marginTop: 6 },
});
