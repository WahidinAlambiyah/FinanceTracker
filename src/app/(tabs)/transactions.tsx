/**
 * Transactions Screen (Placeholder)
 * 
 * Temporary placeholder for transactions management.
 * Will be fully implemented in Phase 6.
 */

import { View, Text, StyleSheet } from 'react-native';

export default function TransactionsScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>💸 Transactions</Text>
        <Text style={styles.text}>
          Transaction management coming in Phase 6
        </Text>
        <Text style={styles.item}>• Add income/expense/transfer</Text>
        <Text style={styles.item}>• View transaction history</Text>
        <Text style={styles.item}>• Filter by month/type</Text>
        <Text style={styles.item}>• Edit and delete transactions</Text>
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
