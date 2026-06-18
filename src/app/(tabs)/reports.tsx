/**
 * Reports Screen
 * 
 * Displays financial reports:
 * - Monthly overview (income, expense, net cashflow)
 * - Expense by category breakdown
 * - Income by category breakdown
 * - Wallet balances (derived)
 * 
 * All data from local SQLite only.
 * Transfer transactions excluded from category breakdowns.
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
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/features/auth';
import { getMonthlyReport } from '@/features/reports';
import { formatRupiah } from '@/lib/utils/money';
import type { MonthlyReport } from '@/features/reports';

export default function ReportsScreen() {
  const { user } = useAuth();

  // Current month state
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1); // 1-12

  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  /**
   * Load monthly report
   */
  const loadReport = useCallback(async () => {
    if (!user) return;

    try {
      const result = await getMonthlyReport(user.id, currentYear, currentMonth);

      if (result.success && result.data) {
        setReport(result.data);
      } else {
        Alert.alert('Could not load report', 'Please pull to refresh or try another month.');
      }
    } catch (error) {
      Alert.alert('Could not load report', 'Please pull to refresh or try another month.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user, currentYear, currentMonth]);

  /**
   * Initial load
   */
  useEffect(() => {
    loadReport();
  }, [loadReport]);

  /**
   * Reload when screen comes into focus
   */
  useFocusEffect(
    useCallback(() => {
      if (!isLoading) {
        loadReport();
      }
    }, [loadReport, isLoading])
  );

  /**
   * Handle pull-to-refresh
   */
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadReport();
  }, [loadReport]);

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
    return `${monthNames[currentMonth - 1]} ${currentYear}`;
  };

  /**
   * Render month navigation
   */
  const renderMonthNavigation = () => (
    <View style={styles.monthNavigation}>
      <TouchableOpacity style={styles.monthButton} onPress={handlePreviousMonth}>
        <Text style={styles.monthButtonText}>←</Text>
      </TouchableOpacity>

      <Text style={styles.monthDisplay}>{getMonthDisplay()}</Text>

      <TouchableOpacity style={styles.monthButton} onPress={handleNextMonth}>
        <Text style={styles.monthButtonText}>→</Text>
      </TouchableOpacity>
    </View>
  );

  /**
   * Render monthly overview card
   */
  const renderOverviewCard = () => {
    if (!report) return null;

    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Monthly Overview</Text>

        <View style={styles.overviewRow}>
          <View style={styles.overviewItem}>
            <Text style={styles.overviewLabel}>Income</Text>
            <Text style={[styles.overviewAmount, styles.incomeText]}>
              {formatRupiah(report.overview.income)}
            </Text>
          </View>

          <View style={styles.overviewItem}>
            <Text style={styles.overviewLabel}>Expense</Text>
            <Text style={[styles.overviewAmount, styles.expenseText]}>
              {formatRupiah(report.overview.expense)}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.overviewItem}>
          <Text style={styles.overviewLabel}>Net Cashflow</Text>
          <Text
            style={[
              styles.overviewAmount,
              styles.netAmount,
              report.overview.netCashflow >= 0 ? styles.incomeText : styles.expenseText,
            ]}
          >
            {formatRupiah(report.overview.netCashflow)}
          </Text>
        </View>
      </View>
    );
  };

  /**
   * Render horizontal bar for category breakdown
   */
  const renderCategoryBar = (percentage: number, color: string) => (
    <View style={styles.barContainer}>
      <View style={[styles.barFill, { width: `${percentage}%`, backgroundColor: color }]} />
    </View>
  );

  /**
   * Render expense by category
   */
  const renderExpenseByCategory = () => {
    if (!report || report.expenseByCategory.length === 0) {
      return (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Expense by Category</Text>
          <Text style={styles.emptyText}>
            No expense data yet. Add expense transactions to see category insights.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Expense by Category</Text>
        {report.expenseByCategory.map((item) => (
          <View key={item.category_id} style={styles.categoryItem}>
            <View style={styles.categoryHeader}>
              <View style={styles.categoryLeft}>
                {item.category_color && (
                  <View style={[styles.colorDot, { backgroundColor: item.category_color }]} />
                )}
                <Text style={styles.categoryName} numberOfLines={1} ellipsizeMode="tail">
                  {item.category_name}
                </Text>
              </View>
              <Text
                style={[styles.categoryAmount, styles.expenseText]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {formatRupiah(item.total)}
              </Text>
            </View>
            {renderCategoryBar(item.percentage, item.category_color || '#EF4444')}
            <Text style={styles.categoryMeta}>
              {item.count} {item.count === 1 ? 'transaction' : 'transactions'} •{' '}
              {item.percentage.toFixed(1)}%
            </Text>
          </View>
        ))}
      </View>
    );
  };

  /**
   * Render income by category
   */
  const renderIncomeByCategory = () => {
    if (!report || report.incomeByCategory.length === 0) {
      return (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Income by Category</Text>
          <Text style={styles.emptyText}>
            No income data yet. Add income transactions to see category insights.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Income by Category</Text>
        {report.incomeByCategory.map((item) => (
          <View key={item.category_id} style={styles.categoryItem}>
            <View style={styles.categoryHeader}>
              <View style={styles.categoryLeft}>
                {item.category_color && (
                  <View style={[styles.colorDot, { backgroundColor: item.category_color }]} />
                )}
                <Text style={styles.categoryName} numberOfLines={1} ellipsizeMode="tail">
                  {item.category_name}
                </Text>
              </View>
              <Text
                style={[styles.categoryAmount, styles.incomeText]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {formatRupiah(item.total)}
              </Text>
            </View>
            {renderCategoryBar(item.percentage, item.category_color || '#10B981')}
            <Text style={styles.categoryMeta}>
              {item.count} {item.count === 1 ? 'transaction' : 'transactions'} •{' '}
              {item.percentage.toFixed(1)}%
            </Text>
          </View>
        ))}
      </View>
    );
  };

  /**
   * Render wallet balances
   */
  const renderWalletBalances = () => {
    if (!report || report.walletBalances.length === 0) {
      return (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Wallet Balances</Text>
          <Text style={styles.emptyText}>
            No wallet balances yet. Create a wallet to start tracking your money.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Wallet Balances</Text>
        {report.walletBalances.map((wallet) => (
          <View key={wallet.wallet_id} style={styles.walletItem}>
            <View style={styles.walletDetails}>
              <Text style={styles.walletName} numberOfLines={1} ellipsizeMode="tail">
                {wallet.wallet_name}
              </Text>
              <Text style={styles.walletType}>{wallet.wallet_type}</Text>
            </View>
            <Text style={styles.walletBalance} numberOfLines={1} ellipsizeMode="tail">
              {formatRupiah(wallet.balance)}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading monthly report...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderMonthNavigation()}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={['#2563EB']} />
        }
      >
        {renderOverviewCard()}
        {renderExpenseByCategory()}
        {renderIncomeByCategory()}
        {renderWalletBalances()}
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
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
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 12,
  },
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  overviewItem: {
    flex: 1,
  },
  overviewLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  overviewAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
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
  netAmount: {
    fontSize: 18,
  },
  categoryItem: {
    marginBottom: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
    flexShrink: 1,
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 12,
    flexShrink: 0,
  },
  barContainer: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    marginBottom: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  categoryMeta: {
    fontSize: 12,
    color: '#64748B',
  },
  walletItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  walletDetails: {
    flex: 1,
    minWidth: 0,
    marginRight: 12,
  },
  walletName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
    marginBottom: 2,
    flexShrink: 1,
  },
  walletType: {
    fontSize: 12,
    color: '#64748B',
    textTransform: 'capitalize',
  },
  walletBalance: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
    flexShrink: 0,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    paddingVertical: 12,
  },
});
