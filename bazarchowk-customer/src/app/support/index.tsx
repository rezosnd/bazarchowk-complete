import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
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
      case 'OPEN': return { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: 'alert-circle' };
      case 'IN_PROGRESS': return { bg: 'bg-amber-100', text: 'text-amber-700', icon: 'clock' };
      case 'RESOLVED': return { bg: 'bg-blue-100', text: 'text-blue-700', icon: 'check-circle' };
      case 'CLOSED': return { bg: 'bg-gray-100', text: 'text-gray-600', icon: 'lock' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-600', icon: 'info' };
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
        className="bg-white rounded-3xl p-5 mb-4 shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-gray-100"
      >
        <View className="flex-row justify-between items-start mb-3">
          <View className={`flex-row items-center px-2.5 py-1 rounded-lg ${status.bg}`}>
            <Feather name={status.icon as any} size={12} color={status.text.replace('text-', '')} />
            <Text className={`text-[10px] font-black uppercase ml-1 tracking-wider ${status.text}`}>
              {item.status.replace('_', ' ')}
            </Text>
          </View>
          <Text className="text-gray-400 font-bold text-xs">#{item.ticketNumber}</Text>
        </View>
        
        <Text className="text-[17px] font-extrabold text-gray-900 mb-4 tracking-tight leading-6" numberOfLines={2}>
          {item.subject}
        </Text>
        
        <View className="flex-row items-center justify-between border-t border-gray-100 pt-4">
          <View className="flex-row items-center">
            <View className="w-8 h-8 rounded-full bg-gray-50 items-center justify-center mr-2">
              <Feather name={catIcon as any} size={14} color="#6B7280" />
            </View>
            <Text className="text-gray-600 text-xs font-bold uppercase tracking-wider">
              {item.category.replace('_', ' ')}
            </Text>
          </View>
          <Text className="text-gray-400 text-xs font-medium">
            {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-[#F8F9FB]">
      <Stack.Screen
        options={{
          headerShown: true,
          title: '',
          headerStyle: { backgroundColor: '#F8F9FB' },
          headerShadowVisible: false,
          headerTintColor: '#111827',
        }}
      />

      <View className="px-5 pb-2">
        <Text className="text-[28px] font-extrabold text-gray-900 tracking-tight">Support</Text>
        <Text className="text-gray-500 text-sm mt-1 font-medium">Get help with your orders and account</Text>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#00B140" />
        </View>
      ) : tickets.length === 0 ? (
        <View className="flex-1 justify-center items-center py-10 px-8">
          <View className="w-24 h-24 bg-white rounded-full items-center justify-center mb-6 shadow-[0_8px_30px_rgba(0,177,64,0.1)]">
            <Ionicons name="chatbubbles-outline" size={40} color="#00B140" />
          </View>
          <Text className="text-2xl font-black text-gray-900 tracking-tight text-center">How can we help?</Text>
          <Text className="text-gray-500 text-center mt-2 font-medium leading-5">
            You don't have any active support tickets. If you need help, feel free to start a conversation.
          </Text>
        </View>
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(item) => item.id}
          renderItem={renderTicket}
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Floating Action Button */}
      <View className="absolute bottom-0 left-0 right-0 p-5" style={{ paddingBottom: Math.max(insets.bottom, 20) }}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/support/new' as any)}
          className="bg-[#00B140] w-full flex-row items-center justify-center py-4 rounded-2xl shadow-[0_8px_20px_rgba(0,177,64,0.3)]"
        >
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text className="text-white font-bold text-[16px] ml-2 tracking-wide">Start New Ticket</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
