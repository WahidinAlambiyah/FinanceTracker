/**
 * Network Service (Phase 8)
 * 
 * Detects online/offline network state using @react-native-community/netinfo.
 * Used to display network status in dashboard/settings.
 * 
 * Phase 8: Network detection only (no sync processing)
 * Phase 10: Sync processing will use network state
 */

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { logger } from '@/lib/utils/logger';

/**
 * Network Service
 * 
 * Provides network state detection and subscription.
 */
export class NetworkService {
  /**
   * Check if device is currently online
   * 
   * @returns true if online, false if offline
   */
  async isOnline(): Promise<boolean> {
    try {
      const state = await NetInfo.fetch();
      return state.isConnected ?? false;
    } catch (error) {
      logger.error('Failed to fetch network state', error);
      return false; // Assume offline on error
    }
  }

  /**
   * Subscribe to network state changes
   * 
   * @param callback - Called when network state changes
   * @returns Unsubscribe function
   */
  subscribeToNetworkState(callback: (isOnline: boolean) => void): () => void {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const isOnline = state.isConnected ?? false;
      logger.debug('Network state changed', { isOnline, type: state.type });
      callback(isOnline);
    });

    return unsubscribe;
  }

  /**
   * Get current network type
   * 
   * @returns Network type string ('wifi', 'cellular', 'none', etc.)
   */
  async getCurrentNetworkType(): Promise<string> {
    try {
      const state = await NetInfo.fetch();
      return state.type || 'unknown';
    } catch (error) {
      logger.error('Failed to get network type', error);
      return 'unknown';
    }
  }
}

/**
 * Singleton instance
 */
let networkServiceInstance: NetworkService | null = null;

/**
 * Get or create network service instance
 * 
 * @returns NetworkService singleton
 */
export function getNetworkService(): NetworkService {
  if (!networkServiceInstance) {
    networkServiceInstance = new NetworkService();
  }
  return networkServiceInstance;
}
