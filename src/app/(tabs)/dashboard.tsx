/**
 * Dashboard Screen
 * 
 * Displays financial overview:
 * - Total balance across all wallets (derived)
 * - Monthly income, expense, and net cashflow
 * - Recent transactions
 * 
 * Balance is DERIVED ONLY (never stored, never mutated).
 * All data from local SQLite only.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/features/auth';
import { getDashboardSummary } from '@/features/dashboard';
import { formatRupiah } from '@/lib/utils/money';
import { formatIndonesianDate } from '@/lib/utils/date';
import type { DashboardSummary } from '@/features/dashboard';

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  /**
   * Load dashboard data
   */
  const loadDashboard = useCallback(async () => {
    if (!user) return;

    try {
      const result = await getDashboardSummary(user.id);

      if (result.success && result.data) {
        setDashboard(result.data);
      } else {
        Alert.alert('Error', result.error || 'Failed to load dashboard');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load dashboard');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  /**
   * Initial load
   */
  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  /**
   * Reload when screen comes into focus
   */
  useFocusEffect(
    useCallback(() => {
      if (!isLoading) {
        loadDashboard();
      }
    }, [loadDashboard, isLoading])
  );

  /**
   * Handle pull-to-refresh
   */
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadDashboard();
  }, [loadDashboard]);

  /**
   * Render total balance card
   */
  const renderTotalBalanceCard = () => {
    if (!dashboard) return null;

    return (
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Total Balance</Text>
        <Text style={styles.balanceAmount}>{formatRupiah(dashboard.totalBalance)}</Text>
        <Text style={styles.balanceHint}>Across all wallets</Text>
      </View>
    );
  };

  /**
   * Render monthly summary card
   */
  const renderMonthlySummaryCard = () => {
    if (!dashboard) return null;

    const now = new Date();
    const monthNames = [
      'Januari',
      'Februari',
      'Maret',
      'April',
      'Mei',
      'Juni',
      'Juli',
      'Agustus',
      'September',
      'Oktober',
      'November',
      'Desember',
    ];
    const currentMonth = monthNames[now.getMonth()];

    return (
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>{currentMonth} Summary</Text>

        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Income</Text>
            <Text style={[styles.summaryAmount, styles.incomeText]}>
              {formatRupiah(dashboard.monthlyIncome)}
            </Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Expense</Text>
            <Text style={[styles.summaryAmount, styles.expenseText]}>
              {formatRupiah(dashboard.monthlyExpense)}
            </Text>
          </View>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Net Cashflow</Text>
          <Text
            style={[
              styles.summaryAmount,
              styles.netCashflowText,
              dashboard.netCashflow >= 0 ? styles.incomeText : styles.expenseText,
            ]}
          >
            {formatRupiah(dashboard.netCashflow)}
          </Text>
        </View>
      </View>
    );
  };

  /**
   * Render recent transaction card
   */
  const renderTransactionCard = (transaction: any) => {
    const isIncome = transaction.type === 'income';
    const isExpense = transaction.type === 'expense';
    const isTransfer = transaction.type === 'transfer';

    const typeColor = isIncome ? '#10B981' : isExpense ? '#EF4444' : '#2563EB';
    const typeIcon = isIncome ? '↑' : isExpense ? '↓' : '⇄';

    const displayLabel = isTransfer
      ? `Transfer: ${transaction.wallet_name || '(Deleted)'} → ${
          transaction.destination_wallet_name || '(Deleted)'
        }`
      : transaction.category_name || '(Deleted Category)';

    return (
      <TouchableOpacity
        key={transaction.id}
        style={styles.transactionCard}
        onPress={() => router.push(`/transactions/${transaction.id}`)}
      >
        <View style={styles.transactionContent}>
          <View style={styles.transactionLeft}>
            <Text style={[styles.typeIcon, { color: typeColor }]}>{typeIcon}</Text>
            <View style={styles.transactionInfo}>
              <Text style={styles.transactionLabel} numberOfLines={1}>
                {displayLabel}
              </Text>
              <Text style={styles.transactionDate}>
                {formatIndonesianDate(transaction.transaction_date).split(',')[0]}
              </Text>
            </View>
          </View>

          <Text style={[styles.transactionAmount, { color: typeColor }]}>
            {formatRupiah(transaction.amount)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  /**
   * Render recent transactions section
   */
  const renderRecentTransactions = () => {
    if (!dashboard || dashboard.recentTransactions.length === 0) {
      return (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No transactions yet</Text>
            <Text style={styles.emptyStateHint}>
              Add your first transaction to start tracking
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <TouchableOpacity onPress={() => router.push('/transactions')}>
            <Text style={styles.viewAllButton}>View All</Text>
          </TouchableOpacity>
        </View>
        {dashboard.recentTransactions.map((transaction) => renderTransactionCard(transaction))}
      </View>
    );
  };

  /**
   * Render empty state (no data)
   */
  const renderEmptyState = () => (
    <View style={styles.centered}>
      <Text style={styles.emptyStateTitle}>Get Started</Text>
      <Text style={styles.emptyStateText}>
        Add your first transaction to see your financial overview
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
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  if (!dashboard) {
    return renderEmptyState();
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={['#2563EB']} />
        }
      >
        {renderTotalBalanceCard()}
        {renderMonthlySummaryCard()}
        {renderRecentTransactions()}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/transactions/new')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
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
    paddingBottom: 80,
  },
  balanceCard: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#EFF6FF',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  balanceHint: {
    fontSize: 12,
    color: '#BFDBFE',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  viewAllButton: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '500',
  },
  transactionCard: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
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
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: '#64748B',
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    paddingVertical: 20,
    alignItems: 'center',
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
    marginBottom: 8,
  },
  emptyStateHint: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
  emptyStateButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 16,
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
