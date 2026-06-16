/**
 * Settings Screen
 * 
 * User settings and account management.
 * Currently shows user info and logout functionality.
 * Phase 10E: Manual convergence sync and user-facing status/retry states
 * More settings will be added in Phase 12.
 * 
 * Requirements: REQ-AUTH-003
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/features/auth';
import { manualSyncService } from '@/features/sync';
import type { ManualSyncOutcome, ManualSyncStatus } from '@/features/sync';
import { getNetworkService } from '@/lib/network/network.service';
import { formatIndonesianDateTime } from '@/lib/utils/date';
import { logger } from '@/lib/utils/logger';
import { SyncStatusBadge } from '@/components/finance/SyncStatusBadge';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [syncStatus, setSyncStatus] = useState<ManualSyncStatus>({
    isOnline: true,
    lastSyncAt: null,
    pendingCount: 0,
    failedCount: 0,
  });
  const [isLoadingSyncStatus, setIsLoadingSyncStatus] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncOutcome, setSyncOutcome] = useState<ManualSyncOutcome | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const syncRunGuard = useRef(false);

  /** Load current-user sync status from local SQLite. */
  const loadSyncStatus = useCallback(async () => {
    if (!user) {
      setIsLoadingSyncStatus(false);
      return;
    }

    try {
      setSyncStatus(await manualSyncService.getStatus(user.id));
    } catch {
      logger.warn('Failed to load sync status', { code: 'STATUS_LOAD_FAILED' });
    } finally {
      setIsLoadingSyncStatus(false);
    }
  }, [user]);

  /**
   * Subscribe to network state (Phase 8)
   */
  useEffect(() => {
    const networkService = getNetworkService();

    // Subscribe to network state changes
    const unsubscribe = networkService.subscribeToNetworkState((isOnline) => {
      setSyncStatus((current) => ({ ...current, isOnline }));
    });

    return unsubscribe;
  }, []);

  /**
   * Initial load
   */
  useEffect(() => {
    loadSyncStatus();
  }, [loadSyncStatus]);

  /**
   * Reload sync status when screen comes into focus
   */
  useFocusEffect(
    useCallback(() => {
      loadSyncStatus();
    }, [loadSyncStatus])
  );

  /**
   * Handle logout with confirmation
   */
  async function handleLogout() {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);

            const result = await signOut();

            if (result.error) {
              Alert.alert('Error', result.error);
              setIsLoggingOut(false);
              return;
            }

            // Success - navigation handled by auth context
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  }

  async function handleSyncNow() {
    if (!user || syncRunGuard.current) return;

    syncRunGuard.current = true;
    setIsSyncing(true);
    setSyncOutcome(null);
    setSyncMessage(null);
    try {
      const result = await manualSyncService.syncNow(user.id);
      setSyncStatus(result.status);
      setSyncOutcome(result.outcome);
      setSyncMessage(result.message);
      Alert.alert('Sync Status', result.message);
    } catch {
      const message = 'Sync could not be completed. Please try again.';
      logger.warn('Manual sync UI failed', { code: 'MANUAL_SYNC_FAILED' });
      setSyncOutcome('failed');
      setSyncMessage(message);
      Alert.alert('Sync Status', message);
      await loadSyncStatus();
    } finally {
      syncRunGuard.current = false;
      setIsSyncing(false);
    }
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user?.email}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>User ID</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {user?.id}
              </Text>
            </View>
          </View>
        </View>

        {/* Sync Status Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sync Status</Text>
          
          <View style={styles.card}>
            {isLoadingSyncStatus ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#2563EB" />
              </View>
            ) : (
              <>
                {/* Network Status */}
                <View style={styles.syncRow}>
                  <Text style={styles.syncLabel}>Network</Text>
                  <SyncStatusBadge
                    status={syncStatus.isOnline ? 'online' : 'offline'}
                    size="small"
                    showLabel={true}
                  />
                </View>

                <View style={styles.separator} />

                <View style={styles.syncRow}>
                  <Text style={styles.syncLabel}>Last successful sync</Text>
                  <Text style={styles.syncValue}>
                    {syncStatus.lastSyncAt
                      ? formatIndonesianDateTime(syncStatus.lastSyncAt)
                      : 'Never synced'}
                  </Text>
                </View>

                <View style={styles.separator} />

                {/* Pending Items */}
                <View style={styles.syncRow}>
                  <Text style={styles.syncLabel}>Pending local queue</Text>
                  <Text style={styles.syncValue}>
                    {syncStatus.pendingCount}{' '}
                    {syncStatus.pendingCount === 1 ? 'item' : 'items'}
                  </Text>
                </View>

                <View style={styles.separator} />

                {/* Failed Items */}
                <View style={styles.syncRow}>
                  <Text style={styles.syncLabel}>Failed</Text>
                  <Text
                    style={[
                      styles.syncValue,
                      syncStatus.failedCount > 0 && styles.syncValueFailed,
                    ]}
                  >
                    {syncStatus.failedCount}{' '}
                    {syncStatus.failedCount === 1 ? 'item' : 'items'}
                  </Text>
                </View>

                <Text style={styles.syncHint}>
                  Queue counts are device-local for this account.
                </Text>

                {(isSyncing || syncMessage) && (
                  <View
                    style={[
                      styles.syncResult,
                      syncOutcome === 'success' && styles.syncResultSuccess,
                      syncOutcome === 'partial' && styles.syncResultPartial,
                      (syncOutcome === 'failed' || syncOutcome === 'auth_required')
                        && styles.syncResultFailed,
                      syncOutcome === 'offline' && styles.syncResultOffline,
                    ]}
                  >
                    <Text style={styles.syncResultText}>
                      {isSyncing ? 'Syncing...' : syncMessage}
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[
                    styles.syncButton,
                    isSyncing && styles.syncButtonDisabled,
                  ]}
                  onPress={handleSyncNow}
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.syncButtonText}>Sync Now</Text>
                  )}
                </TouchableOpacity>

              </>
            )}
          </View>
        </View>

        {/* App Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>
          
          <View style={styles.card}>
            {/* Manage Categories Button */}
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => router.push('/settings/categories')}
            >
              <View style={styles.settingRowContent}>
                <Text style={styles.settingLabel}>Manage Categories</Text>
                <Text style={styles.settingDescription}>Income & expense categories</Text>
              </View>
              <Text style={styles.settingChevron}>›</Text>
            </TouchableOpacity>

            <View style={styles.separator} />

            {/* Future Settings Placeholder */}
            <Text style={styles.placeholderText}>
              Additional settings coming in Phase 12:
            </Text>
            <Text style={styles.placeholderItem}>• Export data (CSV)</Text>
            <Text style={styles.placeholderItem}>• App lock (PIN/biometric)</Text>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={[styles.logoutButton, isLoggingOut && styles.logoutButtonDisabled]}
          onPress={handleLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.logoutButtonText}>Sign Out</Text>
          )}
        </TouchableOpacity>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>Finance Tracker v1.0.0</Text>
          <Text style={styles.appInfoText}>Offline-First Financial Management</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#0F172A',
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  syncRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  syncLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  syncValue: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
  },
  syncValueFailed: {
    color: '#EF4444',
  },
  syncHint: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
    marginTop: 12,
  },
  syncResult: {
    marginTop: 16,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    padding: 12,
  },
  syncResultSuccess: {
    backgroundColor: '#F0FDF4',
  },
  syncResultPartial: {
    backgroundColor: '#FFFBEB',
  },
  syncResultFailed: {
    backgroundColor: '#FEF2F2',
  },
  syncResultOffline: {
    backgroundColor: '#F1F5F9',
  },
  syncResultText: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '500',
  },
  syncButton: {
    marginTop: 16,
    borderRadius: 8,
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  syncButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingRowContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: '#64748B',
  },
  settingChevron: {
    fontSize: 24,
    color: '#94A3B8',
    marginLeft: 8,
  },
  separator: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 8,
  },
  placeholderText: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 12,
  },
  placeholderItem: {
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 6,
  },
  logoutButton: {
    backgroundColor: '#DC2626',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  logoutButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  appInfoText: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4,
  },
});
