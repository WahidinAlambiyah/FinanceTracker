/**
 * Wallets List Screen
 * 
 * Displays all active wallets for the current user.
 * Allows navigation to add/edit wallet screens.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/features/auth';
import { getWallets, deleteWallet } from '@/features/wallets';
import { getWalletBalances } from '@/features/dashboard';
import { formatRupiah } from '@/lib/utils/money';
import type { Wallet } from '@/features/wallets';

export default function WalletsScreen() {
  const { user } = useAuth();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [walletBalances, setWalletBalances] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  /**
   * Load wallets from local database
   */
  const loadWallets = useCallback(async () => {
    if (!user) return;

    try {
      const [result, balancesResult] = await Promise.all([
        getWallets(user.id),
        getWalletBalances(user.id),
      ]);

      if (result.success && result.data) {
        setWallets(result.data);
        if (balancesResult.success && balancesResult.data) {
          const balancesByWalletId = balancesResult.data.reduce<Record<string, number>>(
            (acc, walletBalance) => {
              acc[walletBalance.wallet_id] = walletBalance.balance;
              return acc;
            },
            {}
          );
          setWalletBalances(balancesByWalletId);
        } else {
          setWalletBalances({});
        }
      } else {
        Alert.alert('Could not load wallets', 'Please pull to refresh or reopen the app.');
      }
    } catch (error) {
      Alert.alert('Could not load wallets', 'Please pull to refresh or reopen the app.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  /**
   * Reload wallets when screen comes into focus
   */
  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      loadWallets();
    }, [loadWallets])
  );

  /**
   * Handle pull-to-refresh
   */
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadWallets();
  }, [loadWallets]);

  /**
   * Navigate to add wallet screen
   */
  const handleAddWallet = () => {
    router.push('/wallets/new');
  };

  /**
   * Navigate to edit wallet screen
   */
  const handleEditWallet = (walletId: string) => {
    router.push(`/wallets/${walletId}`);
  };

  /**
   * Handle wallet deletion with confirmation
   */
  const handleDeleteWallet = (wallet: Wallet) => {
    Alert.alert(
      'Delete Wallet',
      `Are you sure you want to delete "${wallet.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;

            const result = await deleteWallet(user.id, wallet.id);

            if (result.success) {
              // Reload wallets
              loadWallets();
            } else {
              Alert.alert('Could not delete wallet', 'Please try again.');
            }
          },
        },
      ]
    );
  };

  /**
   * Render wallet type badge
   */
  const renderWalletTypeBadge = (type: string) => {
    const typeLabels: Record<string, string> = {
      cash: 'Cash',
      bank: 'Bank',
      ewallet: 'E-Wallet',
      other: 'Other',
    };

    return (
      <View style={styles.typeBadge}>
        <Text style={styles.typeBadgeText}>{typeLabels[type] || type}</Text>
      </View>
    );
  };

  /**
   * Render sync status indicator
   */
  const renderSyncStatus = (syncStatus: string) => {
    if (syncStatus === 'synced') return null;

    const statusColors: Record<string, string> = {
      pending: '#F59E0B',
      failed: '#DC2626',
    };

    return (
      <View
        style={[
          styles.syncBadge,
          { backgroundColor: statusColors[syncStatus] || '#6B7280' },
        ]}
      >
        <Text style={styles.syncBadgeText}>
          {syncStatus === 'pending' ? 'Sync Pending' : 'Sync Failed'}
        </Text>
      </View>
    );
  };

  /**
   * Render wallet card
   */
  const renderWalletCard = ({ item }: { item: Wallet }) => {
    const currentBalance = walletBalances[item.id] ?? item.opening_balance;

    return (
      <TouchableOpacity
        style={styles.walletCard}
        onPress={() => handleEditWallet(item.id)}
        onLongPress={() => handleDeleteWallet(item)}
      >
        <View style={styles.walletCardHeader}>
          <View style={styles.walletCardTitle}>
            <Text style={styles.walletName} numberOfLines={1} ellipsizeMode="tail">
              {item.name}
            </Text>
            {renderWalletTypeBadge(item.type)}
          </View>
          {renderSyncStatus(item.sync_status)}
        </View>

        <Text style={styles.walletBalance} numberOfLines={1} ellipsizeMode="tail">
          {formatRupiah(currentBalance)}
        </Text>

        <Text style={styles.walletHelper}>
          Current balance is calculated from transactions.
        </Text>
      </TouchableOpacity>
    );
  };

  /**
   * Render empty state
   */
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>No wallets yet</Text>
      <Text style={styles.emptyStateText}>
        Create a wallet to start tracking your cash, bank, or e-wallet balance.
      </Text>
      <TouchableOpacity style={styles.emptyStateButton} onPress={handleAddWallet}>
        <Text style={styles.emptyStateButtonText}>Add Wallet</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading your wallets...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={wallets}
        keyExtractor={(item) => item.id}
        renderItem={renderWalletCard}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={wallets.length === 0 ? styles.emptyContainer : styles.listContent}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
      />

      {wallets.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={handleAddWallet}>
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
  listContent: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
  },
  walletCard: {
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
  walletCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  walletCardTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  walletName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginRight: 8,
    flexShrink: 1,
  },
  typeBadge: {
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  typeBadgeText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '500',
  },
  syncBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  syncBadgeText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  walletBalance: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
    flexShrink: 1,
  },
  walletHelper: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
    marginTop: 4,
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
