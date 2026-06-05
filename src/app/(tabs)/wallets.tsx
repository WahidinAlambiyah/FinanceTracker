/**
 * Wallets Screen (Placeholder)
 * 
 * Temporary placeholder for wallet management.
 * Will be fully implemented in Phase 4.
 */

import { View, Text, StyleSheet } from 'react-native';

export default function WalletsScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>👛 Wallets</Text>
        <Text style={styles.text}>
          Wallet management coming in Phase 4
        </Text>
        <Text style={styles.item}>• Create cash/bank/e-wallet accounts</Text>
        <Text style={styles.item}>• View wallet balances</Text>
        <Text style={styles.item}>• Edit and delete wallets</Text>
        <Text style={styles.item}>• Track opening balance</Text>
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
