/**
 * Settings Screen
 * 
 * User settings and account management.
 * Currently shows user info and logout functionality.
 * Phase 8: Added sync status display (network state, queue counts)
 * More settings will be added in Phase 12.
 * 
 * Requirements: REQ-AUTH-003
 */

import { useState, useEffect, useCallback } from 'react';
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
import { getDatabase } from '@/lib/db';
import { getSyncQueueRepository, pushSyncService } from '@/features/sync';
import { getNetworkService } from '@/lib/network/network.service';
import { SyncStatusBadge } from '@/components/finance/SyncStatusBadge';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [isLoadingSyncStatus, setIsLoadingSyncStatus] = useState(true);
  const [isDevPushRunning, setIsDevPushRunning] = useState(false);

  /**
   * Load sync status from local SQLite (Phase 8)
   */
  const loadSyncStatus = useCallback(async () => {
    try {
      const db = await getDatabase();
      const syncQueueRepo = getSyncQueueRepository(db);

      const pending = await syncQueueRepo.countByStatus('pending');
      const failed = await syncQueueRepo.countByStatus('failed');

      setPendingCount(pending);
      setFailedCount(failed);

      const networkService = getNetworkService();
      const online = await networkService.isOnline();
      setIsOnline(online);
    } catch (error) {
      console.error('Failed to load sync status:', error);
    } finally {
      setIsLoadingSyncStatus(false);
    }
  }, []);

  /**
   * Subscribe to network state (Phase 8)
   */
  useEffect(() => {
    const networkService = getNetworkService();

    // Subscribe to network state changes
    const unsubscribe = networkService.subscribeToNetworkState(setIsOnline);

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

  /** Temporary local-only Phase 10B manual verification trigger. */
  async function handleDevPushPendingChanges() {
    if (isDevPushRunning) return;

    setIsDevPushRunning(true);
    try {
      const result = await pushSyncService.pushPendingChanges();
      console.log('DEV push pending changes result', result);
      Alert.alert(
        'DEV Push Result',
        `Pushed: ${result.pushedCount}\nSkipped: ${result.skippedCount}\nFailed: ${result.failedCount}`
      );
      await loadSyncStatus();
    } catch (error) {
      console.error('DEV push pending changes failed', error);
      Alert.alert('DEV Push Failed', 'Push verification could not be completed.');
    } finally {
      setIsDevPushRunning(false);
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

        {/* Sync Status Section (Phase 8) */}
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
                    status={isOnline ? 'online' : 'offline'}
                    size="small"
                    showLabel={true}
                  />
                </View>

                <View style={styles.separator} />

                {/* Last Sync (Placeholder for Phase 10) */}
                <View style={styles.syncRow}>
                  <Text style={styles.syncLabel}>Last Sync</Text>
                  <Text style={styles.syncValue}>Never synced</Text>
                </View>

                <View style={styles.separator} />

                {/* Pending Items */}
                <View style={styles.syncRow}>
                  <Text style={styles.syncLabel}>Pending local queue</Text>
                  <Text style={styles.syncValue}>
                    {pendingCount} {pendingCount === 1 ? 'item' : 'items'}
                  </Text>
                </View>

                <View style={styles.separator} />

                {/* Failed Items */}
                <View style={styles.syncRow}>
                  <Text style={styles.syncLabel}>Failed</Text>
                  <Text style={[styles.syncValue, failedCount > 0 && styles.syncValueFailed]}>
                    {failedCount} {failedCount === 1 ? 'item' : 'items'}
                  </Text>
                </View>

                <Text style={styles.syncHint}>
                  Queue counts are device-local and not user-filtered yet.
                </Text>

                <TouchableOpacity
                  style={[
                    styles.devPushButton,
                    isDevPushRunning && styles.devPushButtonDisabled,
                  ]}
                  onPress={handleDevPushPendingChanges}
                  disabled={isDevPushRunning}
                >
                  {isDevPushRunning ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.devPushButtonText}>DEV: Push pending changes</Text>
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
            <Text style={styles.placeholderItem}>• Manual sync button</Text>
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
  devPushButton: {
    marginTop: 16,
    borderRadius: 8,
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  devPushButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  devPushButtonText: {
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
