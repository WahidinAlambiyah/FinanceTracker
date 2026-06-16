/**
 * Protected Tabs Layout
 * 
 * Main tab navigation for authenticated users.
 * Redirects to login if not authenticated.
 * 
 * Tabs: Dashboard, Transactions, Wallets, Reports, Settings
 * 
 * Requirements: REQ-AUTH-004
 */

import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useAuth } from '@/features/auth';

export default function TabsLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  // Show tabs if authenticated
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E2E8F0',
          borderTopWidth: 1,
        },
        headerStyle: {
          backgroundColor: '#2563EB',
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: () => null, // Icons can be added later with icon library
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Transactions',
          tabBarIcon: () => null,
        }}
      />
      <Tabs.Screen
        name="wallets"
        options={{
          title: 'Wallets',
          tabBarIcon: () => null,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarIcon: () => null,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: () => null,
        }}
      />

      {/* Hide nested routes from bottom tab bar */}
      <Tabs.Screen
        name="transactions/new"
        options={{
          href: null,
          title: 'Add Transaction',
        }}
      />
      <Tabs.Screen
        name="transactions/[id]"
        options={{
          href: null,
          title: 'Edit Transaction',
        }}
      />
      <Tabs.Screen
        name="wallets/new"
        options={{
          href: null,
          title: 'Add Wallet',
        }}
      />
      <Tabs.Screen
        name="wallets/[id]"
        options={{
          href: null,
          title: 'Edit Wallet',
        }}
      />
      <Tabs.Screen
        name="settings/categories"
        options={{
          href: null,
          title: 'Manage Categories',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
});
