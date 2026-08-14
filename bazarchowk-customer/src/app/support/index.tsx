import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, Linking } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '@/services/api';

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  status: string;
  createdAt: string;
}

export default function SupportIndexScreen() {
  const insets = useSafeAreaInsets();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const res = await api.get('/support/tickets');
      setTickets(res.data);
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'OPEN': return { bg: '#D1FAE5', text: '#047857', icon: 'alert-circle' };
      case 'IN_PROGRESS': return { bg: '#FEF3C7', text: '#B45309', icon: 'clock' };
      case 'RESOLVED': return { bg: '#DBEAFE', text: '#1D4ED8', icon: 'check-circle' };
      case 'CLOSED': return { bg: '#F3F4F6', text: '#4B5563', icon: 'lock' };
      default: return { bg: '#F3F4F6', text: '#4B5563', icon: 'info' };
    }
  };

  const getCategoryIcon = (category: string) => {
    if (category.includes('ORDER')) return 'shopping-bag';
    if (category.includes('PAYMENT')) return 'credit-card';
    if (category.includes('ACCOUNT')) return 'user';
    return 'help-circle';
  };

  const renderTicket = ({ item }: { item: Ticket }) => {
    const status = getStatusConfig(item.status);
    const catIcon = getCategoryIcon(item.category);
    
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => router.push(`/support/${item.id}` as any)}
        style={styles.card}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.badge, { backgroundColor: status.bg }]}>
            <Feather name={status.icon as any} size={12} color={status.text} />
            <Text style={[styles.badgeText, { color: status.text }]}>
              {item.status.replace('_', ' ')}
            </Text>
          </View>
          <Text style={styles.ticketId}>#{item.ticketNumber}</Text>
        </View>
        
        <Text style={styles.subject} numberOfLines={2}>
          {item.subject}
        </Text>
        
        <View style={styles.cardFooter}>
          <View style={styles.categoryRow}>
            <View style={styles.catIconWrap}>
              <Feather name={catIcon as any} size={14} color="#6B7280" />
            </View>
            <Text style={styles.categoryText}>
              {item.category.replace('_', ' ')}
            </Text>
          </View>
          <Text style={styles.dateText}>
            {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: '',
          headerStyle: { backgroundColor: '#F8F9FB' },
          headerShadowVisible: false,
          headerTintColor: '#111827',
        }}
      />

      <View style={styles.header}>
        <Text style={styles.title}>Support</Text>
        <Text style={styles.subtitle}>Get help with your orders and account</Text>
        
        <TouchableOpacity 
          style={{ marginTop: 16, backgroundColor: '#DCFCE7', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }} 
          onPress={() => Linking.openURL('tel:8709442363')}
        >
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#BBF7D0', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="call" size={20} color="#166534" />
          </View>
          <View style={{ marginLeft: 12 }}>
            <Text style={{ color: '#166534', fontWeight: 'bold', fontSize: 16 }}>Call Support Team</Text>
            <Text style={{ color: '#15803D', fontWeight: '500', fontSize: 13, marginTop: 2 }}>+91 8709442363</Text>
          </View>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#00B140" />
        </View>
      ) : tickets.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="chatbubbles-outline" size={40} color="#00B140" />
          </View>
          <Text style={styles.emptyTitle}>How can we help?</Text>
          <Text style={styles.emptySubtitle}>
            You don't have any active support tickets. If you need help, feel free to start a conversation.
          </Text>
        </View>
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(item) => item.id}
          renderItem={renderTicket}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Floating Action Button */}
      <View style={[styles.fabContainer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/support/new' as any)}
          style={styles.fabBtn}
        >
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text style={styles.fabText}>Start New Ticket</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 },
  subtitle: { color: '#64748B', fontSize: 14, fontWeight: '500', marginTop: 4 },
  
  card: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 20, elevation: 4, borderWidth: 1, borderColor: '#F1F5F9' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', marginLeft: 4, letterSpacing: 0.5 },
  ticketId: { color: '#94A3B8', fontWeight: 'bold', fontSize: 12 },
  
  subject: { fontSize: 17, fontWeight: '900', color: '#0F172A', marginBottom: 16, lineHeight: 24 },
  
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 16 },
  categoryRow: { flexDirection: 'row', alignItems: 'center' },
  catIconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  categoryText: { color: '#475569', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  dateText: { color: '#94A3B8', fontSize: 12, fontWeight: '500' },
  
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40, paddingHorizontal: 32 },
  emptyIconWrap: { width: 96, height: 96, backgroundColor: '#FFF', borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 24, shadowColor: '#00B140', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 30, elevation: 10 },
  emptyTitle: { fontSize: 24, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5, textAlign: 'center' },
  emptySubtitle: { color: '#64748B', textAlign: 'center', marginTop: 8, fontWeight: '500', lineHeight: 20 },
  
  listContent: { padding: 20 },
  
  fabContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20 },
  fabBtn: { backgroundColor: '#00B140', width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, shadowColor: '#00B140', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  fabText: { color: '#FFF', fontWeight: 'bold', fontSize: 16, marginLeft: 8, letterSpacing: 0.5 }
});
