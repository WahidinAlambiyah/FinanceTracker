/**
 * Reports Screen (Placeholder)
 * 
 * Temporary placeholder for reports and analytics.
 * Will be fully implemented in Phase 7.
 */

import { View, Text, StyleSheet } from 'react-native';

export default function ReportsScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>📈 Reports</Text>
        <Text style={styles.text}>
          Reports and analytics coming in Phase 7
        </Text>
        <Text style={styles.item}>• Monthly income/expense summary</Text>
        <Text style={styles.item}>• Expense breakdown by category</Text>
        <Text style={styles.item}>• Balance by wallet</Text>
        <Text style={styles.item}>• Month selector</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 12,
  },
  text: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16,
  },
  item: {
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 8,
  },
});
