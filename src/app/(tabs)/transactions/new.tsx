/**
 * Add Transaction Screen
 * 
 * Form to create a new transaction (income, expense, or transfer).
 * Dynamic fields based on transaction type.
 * Offline-first: writes to SQLite with sync queue integration.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/features/auth';
import { createTransaction } from '@/features/transactions';
import { getWallets } from '@/features/wallets';
import { getCategories } from '@/features/categories';
import { parseRupiahInput, formatRupiah } from '@/lib/utils/money';
import { getCurrentTimestamp, formatIndonesianDate } from '@/lib/utils/date';
import type { TransactionType, CreateTransactionInput } from '@/features/transactions';
import type { Wallet } from '@/features/wallets';
import type { Category, CategoryType } from '@/features/categories';

export default function AddTransactionScreen() {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Transaction type state
  const [type, setType] = useState<TransactionType>('expense');

  // Form state
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  const [selectedDestinationWallet, setSelectedDestinationWallet] = useState<Wallet | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [transactionDate, setTransactionDate] = useState(getCurrentTimestamp());

  // Data state
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Modal state
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showDestinationWalletModal, setShowDestinationWalletModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  /**
   * Load wallets and categories
   */
  useEffect(() => {
    async function loadData() {
      if (!user) return;

      try {
        // Load wallets
        const walletsResult = await getWallets(user.id);
        if (walletsResult.success && walletsResult.data) {
          setWallets(walletsResult.data);
        }

        // Load categories (only for income/expense, not transfer)
        if (type !== 'transfer') {
          const categoriesResult = await getCategories(user.id, type);
          if (categoriesResult.success && categoriesResult.data) {
            setCategories(categoriesResult.data);
          }
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to load wallets and categories');
      } finally {
        setIsLoadingData(false);
      }
    }

    loadData();
  }, [user, type]);

  /**
   * Handle type change
   */
  const handleTypeChange = useCallback(async (newType: TransactionType) => {
    setType(newType);
    setSelectedCategory(null);

    // Load appropriate categories for new type (only for income/expense)
    if (newType !== 'transfer' && user) {
      const categoriesResult = await getCategories(user.id, newType);
      if (categoriesResult.success && categoriesResult.data) {
        setCategories(categoriesResult.data);
      }
    } else {
      // Clear categories for transfer type
      setCategories([]);
    }
  }, [user]);

  /**
   * Handle wallet selection
   */
  const handleWalletSelect = (wallet: Wallet) => {
    setSelectedWallet(wallet);
    setShowWalletModal(false);
  };

  /**
   * Handle destination wallet selection
   */
  const handleDestinationWalletSelect = (wallet: Wallet) => {
    setSelectedDestinationWallet(wallet);
    setShowDestinationWalletModal(false);
  };

  /**
   * Handle category selection
   */
  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
    setShowCategoryModal(false);
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async () => {
    if (!user) return;

    // Validation
    if (!selectedWallet) {
      Alert.alert('Validation Error', 'Please select a wallet');
      return;
    }

    if (type === 'transfer' && !selectedDestinationWallet) {
      Alert.alert('Validation Error', 'Please select a destination wallet');
      return;
    }

    if ((type === 'income' || type === 'expense') && !selectedCategory) {
      Alert.alert('Validation Error', `Please select a ${type} category`);
      return;
    }

    if (!amount.trim()) {
      Alert.alert('Validation Error', 'Please enter an amount');
      return;
    }

    // Parse amount
    const parsedAmount = parseRupiahInput(amount);
    if (parsedAmount === null || parsedAmount <= 0) {
      Alert.alert('Validation Error', 'Invalid amount format');
      return;
    }

    setIsSubmitting(true);

    try {
      const input: CreateTransactionInput = {
        type,
        wallet_id: selectedWallet.id,
        destination_wallet_id: type === 'transfer' ? selectedDestinationWallet!.id : null,
        category_id: type !== 'transfer' ? selectedCategory!.id : null,
        amount: parsedAmount,
        note: note.trim() || null,
        transaction_date: transactionDate,
      };

      const result = await createTransaction(user.id, input);

      if (result.success) {
        Alert.alert('Success', 'Transaction added successfully', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('Error', result.error || 'Failed to create transaction');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Render wallet selection modal
   */
  const renderWalletModal = (
    visible: boolean,
    onClose: () => void,
    onSelect: (wallet: Wallet) => void,
    title: string,
    excludeWalletId?: string
  ) => {
    const availableWallets = excludeWalletId
      ? wallets.filter((w) => w.id !== excludeWalletId)
      : wallets;

    return (
      <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{title}</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {availableWallets.length === 0 ? (
              <View style={styles.emptyModalState}>
                <Text style={styles.emptyModalText}>No wallets available</Text>
              </View>
            ) : (
              <FlatList
                data={availableWallets}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => onSelect(item)}
                  >
                    <Text style={styles.modalItemText}>{item.name}</Text>
                    <Text style={styles.modalItemSubtext}>{item.type}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    );
  };

  /**
   * Render category selection modal
   */
  const renderCategoryModal = () => (
    <Modal
      visible={showCategoryModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowCategoryModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Category</Text>
            <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          {categories.length === 0 ? (
            <View style={styles.emptyModalState}>
              <Text style={styles.emptyModalText}>
                No {type} categories available
              </Text>
            </View>
          ) : (
            <FlatList
              data={categories}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => handleCategorySelect(item)}
                >
                  <View style={styles.modalItemContent}>
                    {item.color && (
                      <View style={[styles.colorCircle, { backgroundColor: item.color }]} />
                    )}
                    <Text style={styles.modalItemText}>{item.name}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );

  /**
   * Render type selector
   */
  const renderTypeSelector = () => {
    const types: { value: TransactionType; label: string; color: string }[] = [
      { value: 'income', label: 'Income', color: '#10B981' },
      { value: 'expense', label: 'Expense', color: '#EF4444' },
      { value: 'transfer', label: 'Transfer', color: '#2563EB' },
    ];

    return (
      <View style={styles.typeSelector}>
        {types.map((t) => (
          <TouchableOpacity
            key={t.value}
            style={[
              styles.typeButton,
              type === t.value && { backgroundColor: t.color, borderColor: t.color },
            ]}
            onPress={() => handleTypeChange(t.value)}
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

  if (isLoadingData) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Check if wallets exist
  if (wallets.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyStateTitle}>No wallets yet</Text>
        <Text style={styles.emptyStateText}>
          Please create a wallet first before adding transactions
        </Text>
        <TouchableOpacity
          style={styles.emptyStateButton}
          onPress={() => router.replace('/wallets/new')}
        >
          <Text style={styles.emptyStateButtonText}>Create Wallet</Text>
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
          {/* Transaction Type */}
          <View style={styles.field}>
            <Text style={styles.label}>Transaction Type *</Text>
            {renderTypeSelector()}
          </View>

          {/* Source Wallet */}
          <View style={styles.field}>
            <Text style={styles.label}>
              {type === 'transfer' ? 'From Wallet' : 'Wallet'} *
            </Text>
            <TouchableOpacity
              style={styles.selectInput}
              onPress={() => setShowWalletModal(true)}
            >
              <Text style={selectedWallet ? styles.selectValue : styles.selectPlaceholder}>
                {selectedWallet ? selectedWallet.name : 'Select wallet'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Destination Wallet (Transfer only) */}
          {type === 'transfer' && (
            <View style={styles.field}>
              <Text style={styles.label}>To Wallet *</Text>
              <TouchableOpacity
                style={styles.selectInput}
                onPress={() => setShowDestinationWalletModal(true)}
              >
                <Text
                  style={
                    selectedDestinationWallet ? styles.selectValue : styles.selectPlaceholder
                  }
                >
                  {selectedDestinationWallet
                    ? selectedDestinationWallet.name
                    : 'Select destination wallet'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Category (Income/Expense only) */}
          {type !== 'transfer' && (
            <View style={styles.field}>
              <Text style={styles.label}>Category *</Text>
              <TouchableOpacity
                style={styles.selectInput}
                onPress={() => setShowCategoryModal(true)}
              >
                <Text style={selectedCategory ? styles.selectValue : styles.selectPlaceholder}>
                  {selectedCategory ? selectedCategory.name : `Select ${type} category`}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Amount */}
          <View style={styles.field}>
            <Text style={styles.label}>Amount *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 50000 or 50k"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              editable={!isSubmitting}
            />
            <Text style={styles.helperText}>Supports: 50000, 50k, 1.5jt, 1,5jt</Text>
          </View>

          {/* Note */}
          <View style={styles.field}>
            <Text style={styles.label}>Note (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Add a note..."
              value={note}
              onChangeText={setNote}
              maxLength={500}
              multiline
              editable={!isSubmitting}
            />
          </View>

          {/* Date */}
          <View style={styles.field}>
            <Text style={styles.label}>Date</Text>
            <View style={styles.dateDisplay}>
              <Text style={styles.dateValue}>
                {formatIndonesianDate(transactionDate)}
              </Text>
            </View>
            <Text style={styles.helperText}>
              Default: current date/time (editing date in future phase)
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
            <Text style={styles.buttonPrimaryText}>Add Transaction</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Modals */}
      {renderWalletModal(
        showWalletModal,
        () => setShowWalletModal(false),
        handleWalletSelect,
        type === 'transfer' ? 'Select Source Wallet' : 'Select Wallet'
      )}
      {type === 'transfer' &&
        renderWalletModal(
          showDestinationWalletModal,
          () => setShowDestinationWalletModal(false),
          handleDestinationWalletSelect,
          'Select Destination Wallet',
          selectedWallet?.id
        )}
      {type !== 'transfer' && renderCategoryModal()}
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
    paddingHorizontal: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
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
    textAlignVertical: 'top',
  },
  selectInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  selectValue: {
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '500',
  },
  selectPlaceholder: {
    fontSize: 16,
    color: '#94A3B8',
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
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  typeButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  dateDisplay: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
  },
  dateValue: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
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
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyStateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
  },
  modalCloseText: {
    fontSize: 24,
    color: '#64748B',
  },
  modalItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalItemText: {
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '500',
  },
  modalItemSubtext: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  colorCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 12,
  },
  emptyModalState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyModalText: {
    fontSize: 14,
    color: '#64748B',
  },
});
