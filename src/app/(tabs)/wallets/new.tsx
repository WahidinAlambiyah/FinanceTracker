/**
 * Add Wallet Screen
 * 
 * Form to create a new wallet.
 * Opening balance is editable on creation.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/features/auth';
import { createWallet } from '@/features/wallets';
import { parseRupiahInput } from '@/lib/utils/money';
import type { WalletType, CreateWalletInput } from '@/features/wallets';

export default function AddWalletScreen() {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState<WalletType>('cash');
  const [openingBalance, setOpeningBalance] = useState('');

  /**
   * Handle form submission
   */
  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!user) return;

    // Basic client-side validation
    if (!name.trim()) {
      Alert.alert('Check wallet details', 'Enter a wallet name before saving.');
      return;
    }

    if (!openingBalance.trim()) {
      Alert.alert('Check wallet details', 'Enter an opening balance before saving.');
      return;
    }

    // Parse opening balance
    const parsedBalance = parseRupiahInput(openingBalance);
    if (parsedBalance === null) {
      Alert.alert('Check wallet details', 'Use a valid opening balance, such as 1000000 or 1jt.');
      return;
    }

    setIsSubmitting(true);

    try {
      const input: CreateWalletInput = {
        name: name.trim(),
        type,
        opening_balance: parsedBalance,
      };

      const result = await createWallet(user.id, input);

      if (result.success) {
        Alert.alert('Wallet created', 'Your wallet has been saved.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('Could not create wallet', result.error || 'Please check the wallet details and try again.');
      }
    } catch (error) {
      Alert.alert('Could not create wallet', 'Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Render wallet type selector
   */
  const renderTypeSelector = () => {
    const types: { value: WalletType; label: string }[] = [
      { value: 'cash', label: 'Cash' },
      { value: 'bank', label: 'Bank' },
      { value: 'ewallet', label: 'E-Wallet' },
      { value: 'other', label: 'Other' },
    ];

    return (
      <View style={styles.typeSelector}>
        {types.map((t) => (
          <TouchableOpacity
            key={t.value}
            style={[
              styles.typeButton,
              type === t.value && styles.typeButtonActive,
            ]}
            onPress={() => setType(t.value)}
          >
            <Text
              style={[
                styles.typeButtonText,
                type === t.value && styles.typeButtonTextActive,
              ]}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
          {/* Wallet Name */}
          <View style={styles.field}>
            <Text style={styles.label}>Wallet Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Cash, BCA Main"
              value={name}
              onChangeText={setName}
              maxLength={100}
              editable={!isSubmitting}
            />
          </View>

          {/* Wallet Type */}
          <View style={styles.field}>
            <Text style={styles.label}>Wallet Type *</Text>
            {renderTypeSelector()}
          </View>

          {/* Opening Balance */}
          <View style={styles.field}>
            <Text style={styles.label}>Opening Balance *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 1000000 or 1jt"
              value={openingBalance}
              onChangeText={setOpeningBalance}
              keyboardType="numeric"
              editable={!isSubmitting}
            />
            <Text style={styles.helperText}>
              Supports: 10000, 10k, 1.5jt, 1,5jt
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={() => router.back()}
          disabled={isSubmitting}
        >
          <Text style={styles.buttonSecondaryText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonPrimaryText}>Create Wallet</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    minHeight: 80,
  },
  helperText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    gap: 8,
  },
  typeButton: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  typeButtonActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  typeButtonTextActive: {
    color: '#2563EB',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  button: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#2563EB',
  },
  buttonPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  buttonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
});
