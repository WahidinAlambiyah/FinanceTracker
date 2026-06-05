/**
 * Dashboard Screen (Placeholder)
 * 
 * Temporary placeholder for the main dashboard.
 * Will be fully implemented in Phase 7.
 * 
 * Shows:
 * - Welcome message with user email
 * - Placeholder for future dashboard metrics
 * 
 * Requirements: REQ-DASH-001, REQ-DASH-002 (to be implemented in Phase 7)
 */

import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '@/features/auth';

export default function DashboardScreen() {
  const { user } = useAuth();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Welcome Section */}
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>Welcome!</Text>
          <Text style={styles.welcomeText}>{user?.email}</Text>
        </View>

        {/* Placeholder Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>📊 Dashboard Coming Soon</Text>
          <Text style={styles.infoText}>
            The dashboard will show:
          </Text>
          <Text style={styles.infoItem}>• Total balance across all wallets</Text>
          <Text style={styles.infoItem}>• Monthly income and expenses</Text>
          <Text style={styles.infoItem}>• Net cashflow</Text>
          <Text style={styles.infoItem}>• Recent transactions</Text>
          <Text style={styles.infoItem}>• Sync status</Text>
          <Text style={styles.infoFooter}>
            Coming in Phase 7
          </Text>
        </View>

        {/* Status Card */}
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>✅ Phase 3 Complete</Text>
          <Text style={styles.statusItem}>• Authentication working</Text>
          <Text style={styles.statusItem}>• Protected navigation active</Text>
          <Text style={styles.statusItem}>• Secure session storage</Text>
          <Text style={styles.statusItem}>• Offline access enabled</Text>
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
  welcomeCard: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 16,
    color: '#EFF6FF',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 12,
  },
  infoItem: {
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 6,
  },
  infoFooter: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '600',
    marginTop: 12,
  },
  statusCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#16A34A',
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 12,
  },
  statusItem: {
    fontSize: 14,
    color: '#166534',
    marginBottom: 6,
  },
});
