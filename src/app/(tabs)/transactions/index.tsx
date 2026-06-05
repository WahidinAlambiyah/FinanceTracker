/**
 * Transaction List Screen
 * 
 * Displays transactions for selected month with monthly summary.
 * Supports month navigation, empty states, and transaction management.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/features/auth';
import { logger } from '@/lib/utils/logger';
import { formatRupiah } from '@/lib/utils/money';
import { formatIndonesianDate } from '@/lib/utils/date';
import {
  getTransactionsWithNames,
  getMonthlySummary,
  deleteTransaction,
} from '@/features/transactions';
import type { TransactionWithNames, MonthlySummary } from '@/features/transactions';

export default function TransactionsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  // Current month state
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1); // 1-12

  // Data state
  const [transactions, setTransactions] = useState<TransactionWithNames[]>([]);
  const [summary, setSummary] = useState<MonthlySummary>({
    income: 0,
    expense: 0,
    netCashflow: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  /**
   * Load transactions and summary for current month
   */
  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      // Load transactions with names
      const transactionsResult = await getTransactionsWithNames(
        user.id,
        currentYear,
        currentMonth
      );

      if (transactionsResult.success && transactionsResult.data) {
        setTransactions(transactionsResult.data);
      } else {
        Alert.alert('Error', transactionsResult.error || 'Failed to load transactions');
      }

      // Load monthly summary
      const summaryResult = await getMonthlySummary(user.id, currentYear, currentMonth);

      if (summaryResult.success && summaryResult.data) {
        setSummary(summaryResult.data);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load transactions');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user, currentYear, currentMonth]);

  /**
   * Initial load
   */
  useEffect(() => {
    loadData();
  }, [loadData]);

  /**
   * Reload when screen comes into focus
   */
  useFocusEffect(
    useCallback(() => {
      if (!isLoading) {
        loadData();
      }
    }, [loadData, isLoading])
  );

  /**
   * Handle pull-to-refresh
   */
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadData();
  }, [loadData]);

  /**
   * Navigate to previous month
   */
  const handlePreviousMonth = () => {
    if (currentMonth === 1) {
      setCurrentYear(currentYear - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  /**
   * Navigate to next month
   */
  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentYear(currentYear + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  /**
   * Format month display
   */
  const getMonthDisplay = () => {
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${monthNames[currentMonth - 1]} ${currentYear}`;
  };

  /**
   * Handle transaction tap (navigate to edit)
   */
  const handleTransactionTap = (transactionId: string) => {
    router.push(`/transactions/${transactionId}`);
  };

  /**
   * Handle transaction long press (delete confirmation)
   */
  const handleTransactionLongPress = (transaction: TransactionWithNames) => {
    const typeLabel = transaction.type === 'transfer' 
      ? 'Transfer'
      : transaction.category_name || transaction.type;

    Alert.alert(
      'Delete Transaction',
      `Are you sure you want to delete this transaction?\n\n${typeLabel}\n${formatRupiah(transaction.amount)}\n${formatIndonesianDate(transaction.transaction_date)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;

            const result = await deleteTransaction(user.id, transaction.id);

            if (result.success) {
              loadData();
            } else {
              Alert.alert('Error', result.error || 'Failed to delete transaction');
            }
          },
        },
      ]
    );
  };

  /**
   * Render monthly summary card
   */
  const renderSummaryCard = () => (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>{getMonthDisplay()} Summary</Text>
      
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Income</Text>
          <Text style={[styles.summaryAmount, styles.incomeText]}>
            {formatRupiah(summary.income)}
          </Text>
        </View>

        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Expense</Text>
          <Text style={[styles.summaryAmount, styles.expenseText]}>
            {formatRupiah(summary.expense)}
          </Text>
        </View>
      </View>

      <View style={styles.summaryDivider} />

      <View style={styles.summaryItem}>
        <Text style={styles.summaryLabel}>Net Cashflow</Text>
        <Text style={[
          styles.summaryAmount,
          styles.netCashflowText,
          summary.netCashflow >= 0 ? styles.incomeText : styles.expenseText
        ]}>
          {formatRupiah(summary.netCashflow)}
        </Text>
      </View>
    </View>
  );

  /**
   * Render month navigation
   */
  const renderMonthNavigation = () => (
    <View style={styles.monthNavigation}>
      <TouchableOpacity 
        style={styles.monthButton} 
        onPress={handlePreviousMonth}
      >
        <Text style={styles.monthButtonText}>←</Text>
      </TouchableOpacity>

      <Text style={styles.monthDisplay}>{getMonthDisplay()}</Text>

      <TouchableOpacity 
        style={styles.monthButton} 
        onPress={handleNextMonth}
      >
        <Text style={styles.monthButtonText}>→</Text>
      </TouchableOpacity>
    </View>
  );

  /**
   * Render transaction card
   */
  const renderTransactionCard = ({ item }: { item: TransactionWithNames }) => {
    const isIncome = item.type === 'income';
    const isExpense = item.type === 'expense';
    const isTransfer = item.type === 'transfer';

    const typeColor = isIncome 
      ? '#10B981' 
      : isExpense 
      ? '#EF4444' 
      : '#2563EB';

    const typeIcon = isIncome ? '↑' : isExpense ? '↓' : '⇄';

    const displayLabel = isTransfer
      ? `Transfer: ${item.wallet_name || '(Deleted)'} → ${item.destination_wallet_name || '(Deleted)'}`
      : item.category_name || '(Deleted Category)';

    const walletInfo = !isTransfer ? item.wallet_name || '(Deleted Wallet)' : '';

    return (
      <TouchableOpacity
        style={styles.transactionCard}
        onPress={() => handleTransactionTap(item.id)}
        onLongPress={() => handleTransactionLongPress(item)}
      >
        <View style={styles.transactionContent}>
          <View style={styles.transactionLeft}>
            <Text style={[styles.typeIcon, { color: typeColor }]}>
              {typeIcon}
            </Text>
            <View style={styles.transactionInfo}>
              <Text style={styles.transactionLabel}>{displayLabel}</Text>
              <Text style={styles.transactionMeta}>
                {walletInfo && `${walletInfo} • `}
                {formatIndonesianDate(item.transaction_date).split(',')[0]}
              </Text>
              {item.note && (
                <Text style={styles.transactionNote} numberOfLines={1}>
                  {item.note}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.transactionRight}>
            <Text style={[styles.transactionAmount, { color: typeColor }]}>
              {formatRupiah(item.amount)}
            </Text>
            {item.sync_status === 'pending' && (
              <View style={[styles.syncBadge, styles.syncPending]}>
                <Text style={styles.syncBadgeText}>Pending</Text>
              </View>
            )}
            {item.sync_status === 'failed' && (
              <View style={[styles.syncBadge, styles.syncFailed]}>
                <Text style={styles.syncBadgeText}>Failed</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  /**
   * Render empty state
   */
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>No transactions yet</Text>
      <Text style={styles.emptyStateText}>
        Add your first transaction to start tracking your finances
      </Text>
      <TouchableOpacity 
        style={styles.emptyStateButton}
        onPress={() => router.push('/transactions/new')}
      >
        <Text style={styles.emptyStateButtonText}>Add Transaction</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading transactions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderMonthNavigation()}
      {renderSummaryCard()}

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={renderTransactionCard}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={
          transactions.length === 0 ? styles.emptyContainer : styles.listContent
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#2563EB']}
          />
        }
      />

      {transactions.length > 0 && (
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => router.push('/transactions/new')}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
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
  monthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  monthButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  monthButtonText: {
    fontSize: 24,
    color: '#2563EB',
    fontWeight: '600',
  },
  monthDisplay: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },
  incomeText: {
    color: '#10B981',
  },
  expenseText: {
    color: '#EF4444',
  },
  netCashflowText: {
    fontSize: 18,
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  emptyContainer: {
    flex: 1,
  },
  transactionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  transactionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  transactionLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIcon: {
    fontSize: 24,
    fontWeight: 'bold',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  transactionMeta: {
    fontSize: 12,
    color: '#64748B',
  },
  transactionNote: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
    marginTop: 4,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  syncBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  syncPending: {
    backgroundColor: '#F59E0B',
  },
  syncFailed: {
    backgroundColor: '#DC2626',
  },
  syncBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
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
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: '300',
  },
});
