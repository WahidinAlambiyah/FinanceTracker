/**
 * Edit Wallet Screen
 * 
 * Form to edit an existing wallet.
 * Opening balance is READ-ONLY (cannot be changed after creation).
 */

import React, { useState, useEffect } from 'react';
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
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/features/auth';
import { getWalletById, updateWallet } from '@/features/wallets';
import { formatRupiah } from '@/lib/utils/money';
import type { Wallet, WalletType, UpdateWalletInput } from '@/features/wallets';

export default function EditWalletScreen() {
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wallet, setWallet] = useState<Wallet | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState<WalletType>('cash');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);

  /**
   * Load wallet data on mount
   */
  useEffect(() => {
    if (!user || !id) return;

    async function loadWallet() {
      try {
        const result = await getWalletById(user!.id, id!);

        if (result.success && result.data) {
          const w = result.data;
          setWallet(w);
          setName(w.name);
          setType(w.type);
          setNotes(w.notes || '');
          setIsActive(w.is_active);
        } else {
          Alert.alert('Error', result.error || 'Failed to load wallet', [
            { text: 'OK', onPress: () => router.back() },
          ]);
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to load wallet', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } finally {
        setIsLoading(false);
      }
    }

    loadWallet();
  }, [user, id]);

  /**
   * Handle form submission
   */
  const handleSubmit = async () => {
    if (!user || !wallet) return;

    // Basic client-side validation
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Wallet name is required');
      return;
    }

    setIsSubmitting(true);

    try {
      const input: UpdateWalletInput = {
        name: name.trim(),
        type,
        notes: notes.trim() || null,
        is_active: isActive,
      };

      const result = await updateWallet(user.id, wallet.id, input);

      if (result.success) {
        Alert.alert('Success', 'Wallet updated successfully', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('Error', result.error || 'Failed to update wallet');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
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
      { value: 'investment', label: 'Investment' },
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
            disabled={isSubmitting}
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

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading wallet...</Text>
      </View>
    );
  }

  if (!wallet) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Wallet not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

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

          {/* Opening Balance (READ-ONLY) */}
          <View style={styles.field}>
            <Text style={styles.label}>Opening Balance</Text>
            <View style={styles.readOnlyField}>
              <Text style={styles.readOnlyValue}>
                {formatRupiah(wallet.opening_balance)}
              </Text>
            </View>
            <Text style={styles.helperText}>
              Opening balance cannot be changed after wallet creation. Future transactions will affect wallet balance.
            </Text>
          </View>

          {/* Current Balance (READ-ONLY) */}
          <View style={styles.field}>
            <Text style={styles.label}>Current Balance</Text>
            <View style={styles.readOnlyField}>
              <Text style={styles.readOnlyValue}>
                {formatRupiah(wallet.balance)}
              </Text>
            </View>
            <Text style={styles.helperText}>
              Updated by transactions
            </Text>
          </View>

          {/* Notes */}
          <View style={styles.field}>
            <Text style={styles.label}>Notes (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Additional notes"
              value={notes}
              onChangeText={setNotes}
              maxLength={500}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              editable={!isSubmitting}
            />
          </View>

          {/* Active Status Toggle */}
          <View style={styles.field}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLabel}>
                <Text style={styles.label}>Active Wallet</Text>
                <Text style={styles.helperText}>
                  Inactive wallets are hidden from main views
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.toggle,
                  isActive && styles.toggleActive,
                ]}
                onPress={() => setIsActive(!isActive)}
                disabled={isSubmitting}
              >
                <View
                  style={[
                    styles.toggleThumb,
                    isActive && styles.toggleThumbActive,
                  ]}
                />
              </TouchableOpacity>
            </View>
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
            <Text style={styles.buttonPrimaryText}>Save Changes</Text>
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
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
  readOnlyField: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
  },
  readOnlyValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
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
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: {
    flex: 1,
  },
  toggle: {
    width: 52,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: '#2563EB',
  },
  toggleThumb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
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
