import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useEffect, useState } from 'react';
import { getDatabase, getExecutedMigrations, isDatabaseOpen } from '../lib/db';

/**
 * Home Screen - Phase 1 Development Screen
 * 
 * NOTE: This is a temporary development screen showing database status.
 * This will be replaced by the actual Dashboard screen in Phase 7.
 */
export default function HomeScreen() {
  const [migrations, setMigrations] = useState<{ name: string; executed_at: string }[]>([]);
  const [dbStatus, setDbStatus] = useState<string>('Checking...');

  useEffect(() => {
    async function loadDbInfo() {
      if (isDatabaseOpen()) {
        setDbStatus('Connected');
        const db = getDatabase();
        const executedMigrations = await getExecutedMigrations(db);
        setMigrations(executedMigrations);
      } else {
        setDbStatus('Not connected');
      }
    }
    loadDbInfo();
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Finance Tracker</Text>
      <Text style={styles.subtitle}>Offline-First Financial Management</Text>
      
      <View style={styles.statusCard}>
        <Text style={styles.statusTitle}>📊 Project Status</Text>
        <StatusItem label="Phase 0 (Setup)" status="✓ Complete" />
        <StatusItem label="Phase 1 (Database)" status="✓ Complete" />
        <StatusItem label="Database Status" status={dbStatus} />
      </View>

      {migrations.length > 0 && (
        <View style={styles.migrationCard}>
          <Text style={styles.migrationTitle}>🔄 Migrations Applied</Text>
          {migrations.map((migration, index) => (
            <View key={index} style={styles.migrationItem}>
              <Text style={styles.migrationName}>
                {index + 1}. {migration.name}
              </Text>
              <Text style={styles.migrationDate}>
                {new Date(migration.executed_at).toLocaleString()}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>✨ Features Ready</Text>
        <Text style={styles.infoItem}>• SQLite local database</Text>
        <Text style={styles.infoItem}>• Migration system</Text>
        <Text style={styles.infoItem}>• Offline-first architecture</Text>
        <Text style={styles.infoItem}>• UUID generation</Text>
        <Text style={styles.infoText}>Ready for Phase 2 (Core Utilities)</Text>
      </View>
    </ScrollView>
  );
}

interface StatusItemProps {
  label: string;
  status: string;
}

function StatusItem({ label, status }: StatusItemProps) {
  return (
    <View style={styles.statusItem}>
      <Text style={styles.statusLabel}>{label}:</Text>
      <Text style={styles.statusValue}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4CAF50',
  },
  migrationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  migrationTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  migrationItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  migrationName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  migrationDate: {
    fontSize: 12,
    color: '#999',
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#1976D2',
  },
  infoItem: {
    fontSize: 14,
    color: '#333',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    color: '#1976D2',
    marginTop: 12,
    fontWeight: '500',
  },
});
