/**
 * Sync Status Badge Component (Phase 8)
 * 
 * Displays sync status with color-coded indicator.
 * Used in dashboard header and settings screen.
 * 
 * Phase 8: Visual only (no interaction)
 * Phase 12: Add interaction (tap to retry, show details)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export type SyncStatus = 'online' | 'synced' | 'pending' | 'failed' | 'offline';

interface SyncStatusBadgeProps {
  status: SyncStatus;
  size?: 'small' | 'medium';
  showLabel?: boolean;
}

/**
 * Sync Status Badge
 * 
 * Color coding:
 * - online: green (#10B981)
 * - synced: green (#10B981)
 * - pending: amber (#F59E0B)
 * - failed: red (#EF4444)
 * - offline: gray (#6B7280)
 */
export function SyncStatusBadge({
  status,
  size = 'small',
  showLabel = false,
}: SyncStatusBadgeProps) {
  const getStatusColor = (): string => {
    switch (status) {
      case 'online':
        return '#10B981'; // green
      case 'synced':
        return '#10B981'; // green
      case 'pending':
        return '#F59E0B'; // amber
      case 'failed':
        return '#EF4444'; // red
      case 'offline':
        return '#6B7280'; // gray
      default:
        return '#6B7280';
    }
  };

  const getStatusLabel = (): string => {
    switch (status) {
      case 'online':
        return 'Online';
      case 'synced':
        return 'Synced';
      case 'pending':
        return 'Pending';
      case 'failed':
        return 'Failed';
      case 'offline':
        return 'Offline';
      default:
        return 'Unknown';
    }
  };

  const dotSize = size === 'small' ? 8 : 12;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.dot,
          {
            width: dotSize,
            height: dotSize,
            backgroundColor: getStatusColor(),
          },
        ]}
      />
      {showLabel && (
        <Text style={[styles.label, size === 'small' && styles.labelSmall]}>
          {getStatusLabel()}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    borderRadius: 999,
  },
  label: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
  },
  labelSmall: {
    fontSize: 12,
  },
});
