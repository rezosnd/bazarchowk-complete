import { Text as AppText } from '@/components/TranslatedText';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import api from '@/services/api';
import { socketService } from '@/services/socket';
import { Header } from '@/components/Header';
import { PressableScale } from '@/components/PressableScale';
import Animated, { FadeInUp, FadeInDown, withRepeat, withSequence, withTiming, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

const PRIMARY = '#00B140';

const PulsingDot = () => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  
  useEffect(() => {
    scale.value = withRepeat(withSequence(withTiming(1.2, { duration: 1000 }), withTiming(1, { duration: 1000 })), -1, true);
    opacity.value = withRepeat(withSequence(withTiming(0.6, { duration: 1000 }), withTiming(1, { duration: 1000 })), -1, true);
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.unreadDot, style]} />;
};

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
      const { data } = await api.get('/notifications');
      setNotifications(data);
    } catch (error) {
      console.warn('Failed to fetch notifications', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      await api.patch(`/notifications/${id}/read`);
    } catch (error) {
      console.warn('Failed to mark as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      await api.patch('/notifications/read-all');
    } catch (error) {
      console.warn('Failed to clear notifications');
    }
  };

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'ORDER': return { color: '#3B82F6', bg: '#EFF6FF' };
      case 'DELIVERY': return { color: '#00B140', bg: '#EAF8F0' };
      case 'PROMOTION': return { color: '#FF8A00', bg: '#FFF1DF' };
      case 'SYSTEM': return { color: '#66736B', bg: '#F1F5F9' };
      default: return { color: PRIMARY, bg: '#EAF8F0' };
    }
  };

  const getIconName = (type: string) => {
    switch (type) {
      case 'ORDER': return 'receipt';
      case 'DELIVERY': return 'bicycle';
      case 'PROMOTION': return 'pricetag';
      case 'SYSTEM': return 'settings';
      default: return 'notifications';
    }
  };

  const RightAction = () => {
    if (!notifications.some(n => !n.isRead)) return null;
    return (
      <PressableScale onPress={markAllAsRead} style={styles.clearBtn}>
        <AppText style={styles.clearText}>Mark All Read</AppText>
      </PressableScale>
    );
  };

  return (
    <View style={styles.root}>
      <Header 
        title="Notifications" 
        rightAction={
          <View style={{ width: 120, alignItems: 'flex-end', paddingRight: 8 }}>
            <RightAction />
          </View>
        } 
      />

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={PRIMARY} /></View>
      ) : (
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, 16) + 40 }]} showsVerticalScrollIndicator={false}>
          {notifications.length === 0 ? (
            <Animated.View entering={FadeInUp.springify().damping(18)} style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="notifications-outline" size={48} color="#00B140" />
              </View>
              <AppText style={styles.emptyText}>You're all caught up!</AppText>
              <AppText style={styles.emptySub}>No new notifications right now.</AppText>
            </Animated.View>
          ) : (
            notifications.map((notif, index) => {
              const typeStyle = getTypeStyle(notif.type || 'SYSTEM');
              return (
                <Animated.View key={notif.id} entering={FadeInDown.delay(index * 40).springify().damping(15)}>
                  <PressableScale 
                    style={[styles.card, !notif.isRead && styles.cardUnread]}
                    onPress={() => {
                      if (!notif.isRead) markAsRead(notif.id);
                      if (notif.linkUrl) router.push(notif.linkUrl as any);
                    }}
                    scaleTo={0.96}
                  >
                    <View style={[styles.iconBox, { backgroundColor: typeStyle.bg }]}>
                      <Ionicons name={getIconName(notif.type || 'SYSTEM')} size={22} color={typeStyle.color} />
                    </View>
                    
                    <View style={styles.content}>
                      <AppText style={[styles.notifTitle, !notif.isRead && styles.textUnread]}>{notif.title}</AppText>
                      <AppText style={styles.notifMessage} numberOfLines={3}>{notif.message}</AppText>
                      
                      {notif.imageUrl && (
                        <Image source={{ uri: notif.imageUrl }} style={styles.richImg} contentFit="cover" />
                      )}

                      <AppText style={styles.time}>
                        {new Date(notif.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </AppText>
                    </View>

                    {!notif.isRead && <PulsingDot />}
                  </PressableScale>
                </Animated.View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7FBF8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  clearBtn: { backgroundColor: '#EAF8F0', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  clearText: { color: '#008F3C', fontSize: 13, fontWeight: '700' },
  
  scroll: { padding: 16 },
  
  emptyState: { alignItems: 'center', marginTop: '40%' },
  emptyIconWrap: { width: 96, height: 96, borderRadius: 32, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAF8F0', shadowColor: '#00B140', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyText: { fontSize: 20, fontWeight: '800', color: '#122018', marginTop: 16, letterSpacing: -0.2 },
  emptySub: { fontSize: 14, color: '#66736B', marginTop: 8 },
  
  card: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#FFFFFF', padding: 16, borderRadius: 20, marginBottom: 12,
    borderWidth: 1, borderColor: '#E5EBE7', shadowColor: '#00B140', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 12, elevation: 2
  },
  cardUnread: { backgroundColor: '#F0FDF4', borderColor: '#EAF8F0' },
  iconBox: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, marginLeft: 16, paddingRight: 8 },
  notifTitle: { fontSize: 15, fontWeight: '700', color: '#4B5563', marginBottom: 4 },
  textUnread: { color: '#122018', fontWeight: '800' },
  notifMessage: { fontSize: 14, color: '#66736B', lineHeight: 22 },
  time: { fontSize: 12, color: '#8B9690', marginTop: 10, fontWeight: '600' },
  richImg: { width: '100%', height: 140, borderRadius: 12, marginTop: 12, backgroundColor: '#F7FBF8' },
  unreadDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: PRIMARY, marginTop: 16 },
});
