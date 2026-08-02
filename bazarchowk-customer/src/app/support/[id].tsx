import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks';
import { Spacing, FontSize, FontWeight, BorderRadius } from '@/theme';
import api from '@/services/api';
import { useAuthStore } from '@/store';

interface SupportMessage {
  id: string;
  content: string;
  senderType: 'USER' | 'ADMIN' | 'SYSTEM';
  createdAt: string;
}

interface TicketDetail {
  id: string;
  ticketNumber: string;
  subject: string;
  status: string;
  createdAt: string;
  messages: SupportMessage[];
}

export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    fetchTicketDetails();
  }, [id]);

  const fetchTicketDetails = async () => {
    try {
      const res = await api.get(`/support/tickets/${id}`);
      setTicket(res.data);
    } catch (error) {
      console.error('Failed to fetch ticket details:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || sending) return;
    
    setSending(true);
    try {
      await api.post(`/support/tickets/${id}/messages`, {
        content: message.trim()
      });
      setMessage('');
      fetchTicketDetails(); // Refresh messages
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: SupportMessage }) => {
    const isMe = item.senderType === 'USER';
    const isSystem = item.senderType === 'SYSTEM';

    if (isSystem) {
      return (
        <View style={styles.systemMessageWrap}>
          <Text style={[styles.systemMessage, { color: theme.textSecondary }]}>
            {item.content}
          </Text>
          <Text style={[styles.messageTime, { color: theme.textTertiary, textAlign: 'center' }]}>
            {new Date(item.createdAt).toLocaleString()}
          </Text>
        </View>
      );
    }

    return (
      <View style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowThem]}>
        {!isMe && (
          <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
            <Ionicons name="headset" size={16} color="#fff" />
          </View>
        )}
        
        <View style={[
          styles.messageBubble, 
          isMe ? { backgroundColor: theme.primary } : { backgroundColor: theme.card }
        ]}>
          <Text style={[styles.messageText, isMe ? { color: '#fff' } : { color: theme.text }]}>
            {item.content}
          </Text>
          <Text style={[styles.messageTime, isMe ? { color: 'rgba(255,255,255,0.7)' } : { color: theme.textTertiary }]}>
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!ticket) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.text }}>Ticket not found</Text>
      </View>
    );
  }

  const isClosed = ticket.status === 'CLOSED' || ticket.status === 'RESOLVED';

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          title: `Ticket #${ticket.ticketNumber}`,
          headerTitleStyle: { color: theme.text, fontSize: FontSize.lg },
          headerStyle: { backgroundColor: theme.background },
          headerShadowVisible: false,
          headerTintColor: theme.text,
        }}
      />

      <View style={[styles.headerBanner, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <Text style={[styles.subjectText, { color: theme.text }]} numberOfLines={1}>
          {ticket.subject}
        </Text>
        <Text style={[styles.statusText, { color: theme.textSecondary }]}>
          Status: {ticket.status}
        </Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={ticket.messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={{ padding: Spacing.base, paddingBottom: Spacing.xl }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {isClosed ? (
        <View style={[styles.closedBanner, { paddingBottom: insets.bottom + Spacing.base, backgroundColor: theme.card, borderTopColor: theme.border }]}>
          <Text style={[styles.closedText, { color: theme.textSecondary }]}>
            This ticket has been marked as {ticket.status.toLowerCase()}. You cannot reply to it anymore.
          </Text>
        </View>
      ) : (
        <View style={[styles.inputContainer, { paddingBottom: insets.bottom || Spacing.sm, backgroundColor: theme.card, borderTopColor: theme.border }]}>
          <TextInput
            style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
            placeholder="Type your message..."
            placeholderTextColor={theme.textTertiary}
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity 
            style={[styles.sendBtn, (!message.trim() || sending) && { opacity: 0.5 }, { backgroundColor: theme.primary }]}
            disabled={!message.trim() || sending}
            onPress={sendMessage}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerBanner: {
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  subjectText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
  },
  statusText: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
    alignItems: 'flex-end',
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  messageRowThem: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  messageText: {
    fontSize: FontSize.base,
  },
  messageTime: {
    fontSize: FontSize.xs,
    marginTop: Spacing.xs,
    alignSelf: 'flex-end',
  },
  systemMessageWrap: {
    marginVertical: Spacing.md,
    alignItems: 'center',
  },
  systemMessage: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: Spacing.sm,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    marginRight: Spacing.sm,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closedBanner: {
    padding: Spacing.md,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  closedText: {
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
});
