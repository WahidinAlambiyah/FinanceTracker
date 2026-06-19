/**
 * Edit Transaction Screen
 * 
 * Form to edit an existing transaction.
 * Transaction type is READ-ONLY (cannot be changed after creation).
 * User must delete and recreate if type change is needed.
 */

import React, { useState, useEffect, useCallback } from 'react';
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
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/features/auth';
import {
  getTransactionById,
  updateTransaction,
  deleteTransaction,
} from '@/features/transactions';
import { getWallets } from '@/features/wallets';
import { getCategories } from '@/features/categories';
import { parseRupiahInput, formatRupiah } from '@/lib/utils/money';
import { formatIndonesianDate } from '@/lib/utils/date';
import type { Transaction, UpdateTransactionInput, TransactionType } from '@/features/transactions';
import type { Wallet } from '@/features/wallets';
import type { Category, CategoryType } from '@/features/categories';

export default function EditTransactionScreen() {
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transaction, setTransaction] = useState<Transaction | null>(null);

  // Form state
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  const [selectedDestinationWallet, setSelectedDestinationWallet] = useState<Wallet | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  // Data state
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Modal state
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showDestinationWalletModal, setShowDestinationWalletModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  /**
   * Load transaction data on mount
   */
  useEffect(() => {
    if (!user || !id) return;

    async function loadTransaction() {
      try {
        // Load transaction
        const txResult = await getTransactionById(user!.id, id!);
        if (!txResult.success || !txResult.data) {
          Alert.alert('Error', txResult.error || 'Failed to load transaction', [
            { text: 'OK', onPress: () => router.back() },
          ]);
          return;
        }

        const tx = txResult.data;
        setTransaction(tx);
        setAmount(tx.amount.toString());
        setNote(tx.note || '');

        // Load wallets
        const walletsResult = await getWallets(user!.id);
        if (walletsResult.success && walletsResult.data) {
          const walletsList = walletsResult.data;
          setWallets(walletsList);

          // Set selected wallets
          const sourceWallet = walletsList.find((w) => w.id === tx.wallet_id);
          setSelectedWallet(sourceWallet || null);

          if (tx.destination_wallet_id) {
            const destWallet = walletsList.find((w) => w.id === tx.destination_wallet_id);
            setSelectedDestinationWallet(destWallet || null);
          }
        }

        // Load categories if not transfer
        if (tx.type !== 'transfer') {
          const categoriesResult = await getCategories(user!.id, tx.type);
          if (categoriesResult.success && categoriesResult.data) {
            const categoriesList = categoriesResult.data;
            setCategories(categoriesList);

            // Set selected category
            if (tx.category_id) {
              const category = categoriesList.find((c) => c.id === tx.category_id);
              setSelectedCategory(category || null);
            }
          }
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to load transaction', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } finally {
        setIsLoading(false);
      }
    }

    loadTransaction();
  }, [user, id]);

  /**
   * Handle wallet selection
   */
  const handleWalletSelect = (wallet: Wallet) => {
    setSelectedWallet(wallet);
    if (transaction?.type === 'transfer' && selectedDestinationWallet?.id === wallet.id) {
      setSelectedDestinationWallet(null);
    }
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
   * Handle delete with confirmation
   */
  const handleDelete = () => {
    if (isSubmitting) return;
    if (!transaction || !user) return;

    const typeLabel =
      transaction.type === 'transfer' ? 'Transfer' : selectedCategory?.name || transaction.type;

    Alert.alert(
      'Delete Transaction',
      `Are you sure you want to delete this transaction?\n\n${typeLabel}\n${formatRupiah(
        transaction.amount
      )}\n${formatIndonesianDate(transaction.transaction_date)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsSubmitting(true);
            const result = await deleteTransaction(user.id, transaction.id);

            if (result.success) {
              Alert.alert('Success', 'Transaction deleted successfully', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } else {
              Alert.alert('Error', result.error || 'Failed to delete transaction');
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!user || !transaction) return;

    // Validation
    if (!selectedWallet) {
      Alert.alert('Check transaction details', 'Select the wallet for this transaction.');
      return;
    }

    if (transaction.type === 'transfer' && !selectedDestinationWallet) {
      Alert.alert('Check transaction details', 'Select the destination wallet for this transfer.');
      return;
    }

    if (transaction.type === 'transfer' && selectedDestinationWallet?.id === selectedWallet.id) {
      Alert.alert('Check transaction details', 'Choose a different destination wallet for this transfer.');
      return;
    }

    if ((transaction.type === 'income' || transaction.type === 'expense') && !selectedCategory) {
      Alert.alert('Check transaction details', `Select a ${transaction.type} category for this transaction.`);
      return;
    }

    if (!amount.trim()) {
      Alert.alert('Check transaction details', 'Enter an amount before saving.');
      return;
    }

    // Parse amount
    const parsedAmount = parseRupiahInput(amount);
    if (parsedAmount === null || parsedAmount <= 0) {
      Alert.alert('Check transaction details', 'Use a valid amount greater than zero, such as 50000 or 50k.');
      return;
    }

    setIsSubmitting(true);

    try {
      const input: UpdateTransactionInput = {
        wallet_id: selectedWallet.id !== transaction.wallet_id ? selectedWallet.id : undefined,
        destination_wallet_id:
          transaction.type === 'transfer'
            ? selectedDestinationWallet!.id !== transaction.destination_wallet_id
              ? selectedDestinationWallet!.id
              : undefined
            : undefined,
        category_id:
          transaction.type !== 'transfer'
            ? selectedCategory!.id !== transaction.category_id
              ? selectedCategory!.id
              : undefined
            : undefined,
        amount: parsedAmount !== transaction.amount ? parsedAmount : undefined,
        note: note.trim() !== (transaction.note || '') ? note.trim() || null : undefined,
      };

      // Check if any fields changed
      const hasChanges = Object.values(input).some((value) => value !== undefined);
      if (!hasChanges) {
        Alert.alert('No changes to save', 'Update at least one field before saving.');
        setIsSubmitting(false);
        return;
      }

      const result = await updateTransaction(user.id, transaction.id, input);

      if (result.success) {
        Alert.alert('Transaction updated', 'Your transaction changes have been saved.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('Could not update transaction', result.error || 'Please check the transaction details and try again.');
      }
    } catch (error) {
      Alert.alert('Could not update transaction', 'Please try again.');
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
                  <TouchableOpacity style={styles.modalItem} onPress={() => onSelect(item)}>
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
                No {transaction?.type} categories available
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

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading transaction...</Text>
      </View>
    );
  }

  if (!transaction) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Transaction not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const typeLabel =
    transaction.type === 'income' ? 'Income' : transaction.type === 'expense' ? 'Expense' : 'Transfer';
  const typeColor =
    transaction.type === 'income' ? '#10B981' : transaction.type === 'expense' ? '#EF4444' : '#2563EB';

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
          {/* Transaction Type (READ-ONLY) */}
          <View style={styles.field}>
            <Text style={styles.label}>Transaction Type</Text>
            <View style={[styles.readOnlyField, { borderColor: typeColor }]}>
              <Text style={[styles.readOnlyValue, { color: typeColor }]}>{typeLabel}</Text>
            </View>
            <Text style={styles.helperText}>
              Type cannot be changed. Delete and recreate if you need to change type.
            </Text>
          </View>

          {/* Source Wallet */}
          <View style={styles.field}>
            <Text style={styles.label}>
              {transaction.type === 'transfer' ? 'From Wallet' : 'Wallet'} *
            </Text>
            <TouchableOpacity style={styles.selectInput} onPress={() => setShowWalletModal(true)}>
              <Text style={selectedWallet ? styles.selectValue : styles.selectPlaceholder}>
                {selectedWallet ? selectedWallet.name : 'Select wallet'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Destination Wallet (Transfer only) */}
          {transaction.type === 'transfer' && (
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
          {transaction.type !== 'transfer' && (
            <View style={styles.field}>
              <Text style={styles.label}>Category *</Text>
              <TouchableOpacity
                style={styles.selectInput}
                onPress={() => setShowCategoryModal(true)}
              >
                <Text style={selectedCategory ? styles.selectValue : styles.selectPlaceholder}>
                  {selectedCategory ? selectedCategory.name : `Select ${transaction.type} category`}
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

          {/* Date (READ-ONLY for now) */}
          <View style={styles.field}>
            <Text style={styles.label}>Date</Text>
            <View style={styles.readOnlyField}>
              <Text style={styles.readOnlyValue}>
                {formatIndonesianDate(transaction.transaction_date)}
              </Text>
            </View>
            <Text style={styles.helperText}>
              Date is set automatically for now.
            </Text>
          </View>
        </View>

        {/* Delete Button */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          disabled={isSubmitting}
        >
          <Text style={styles.deleteButtonText}>Delete Transaction</Text>
        </TouchableOpacity>
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

      {/* Modals */}
      {renderWalletModal(
        showWalletModal,
        () => setShowWalletModal(false),
        handleWalletSelect,
        transaction.type === 'transfer' ? 'Select Source Wallet' : 'Select Wallet'
      )}
      {transaction.type === 'transfer' &&
        renderWalletModal(
          showDestinationWalletModal,
          () => setShowDestinationWalletModal(false),
          handleDestinationWalletSelect,
          'Select Destination Wallet',
          selectedWallet?.id
        )}
      {transaction.type !== 'transfer' && renderCategoryModal()}
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
    marginBottom: 16,
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
  deleteButton: {
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
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
