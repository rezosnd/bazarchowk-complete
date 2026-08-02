import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks';
import { Spacing, FontSize, FontWeight, BorderRadius } from '@/theme';
import api from '@/services/api';
import { Card, Button } from '@/components/ui';

const CATEGORIES = [
  { id: 'ORDER_ISSUE', label: 'Order Issue' },
  { id: 'PAYMENT_ISSUE', label: 'Payment / Refund Issue' },
  { id: 'ACCOUNT_ISSUE', label: 'Account Issue' },
  { id: 'GENERAL_INQUIRY', label: 'General Inquiry' },
];

export default function NewTicketScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0].id);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!subject.trim()) {
      Alert.alert('Error', 'Please enter a subject for your ticket.');
      return;
    }
    
    setSubmitting(true);
    try {
      await api.post('/support/tickets', {
        subject: subject.trim(),
        category,
        initialMessage: message.trim() || undefined,
      });
      Alert.alert('Success', 'Your support ticket has been created.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Failed to create ticket:', error);
      Alert.alert('Error', 'Could not create support ticket. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Create Ticket',
          headerTitleStyle: { color: theme.text, fontSize: FontSize.lg },
          headerStyle: { backgroundColor: theme.background },
          headerShadowVisible: false,
          headerTintColor: theme.text,
        }}
      />

      <ScrollView 
        contentContainerStyle={{ padding: Spacing.base, paddingBottom: insets.bottom + 80 }}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.card} shadow="sm">
          <Text style={[styles.label, { color: theme.text }]}>Subject <Text style={{ color: 'red' }}>*</Text></Text>
          <TextInput
            style={[styles.input, { borderColor: theme.border, color: theme.text }]}
            placeholder="e.g., Order not delivered"
            placeholderTextColor={theme.textTertiary}
            value={subject}
            onChangeText={setSubject}
          />

          <Text style={[styles.label, { color: theme.text, marginTop: Spacing.md }]}>Category <Text style={{ color: 'red' }}>*</Text></Text>
          <View style={styles.categoryContainer}>
            {CATEGORIES.map((cat) => {
              const isSelected = category === cat.id;
              return (
                <Button
                  key={cat.id}
                  title={cat.label}
                  variant={isSelected ? undefined : 'outline'}
                  onPress={() => setCategory(cat.id)}
                  style={styles.categoryBtn}
                />
              );
            })}
          </View>

          <Text style={[styles.label, { color: theme.text, marginTop: Spacing.md }]}>Message (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea, { borderColor: theme.border, color: theme.text }]}
            placeholder="Describe your issue in detail..."
            placeholderTextColor={theme.textTertiary}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        </Card>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.base, backgroundColor: theme.background, borderTopColor: theme.border }]}>
        <Button
          title={submitting ? "Submitting..." : "Submit Ticket"}
          onPress={handleSubmit}
          disabled={submitting}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    padding: Spacing.md,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    fontSize: FontSize.base,
  },
  textArea: {
    height: 120,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  categoryBtn: {
    marginBottom: Spacing.xs,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.base,
    borderTopWidth: 1,
  },
});
