/**
 * Wallets Feature Module
 * 
 * Barrel export for wallet feature.
 */

// Types
export type {
  Wallet,
  WalletType,
  SyncStatus,
  CreateWalletInput,
  UpdateWalletInput,
  ValidationError,
  ValidationResult,
  WalletResult,
} from './wallet.types';

// Validation
export { validateCreateWalletInput, validateUpdateWalletInput } from './wallet.validation';

// Repository
export { WalletRepository, getWalletRepository } from './wallet.repository';

// Service
export {
  createWallet,
  updateWallet,
  deleteWallet,
  getWallets,
  getWalletById,
  getWalletCount,
} from './wallet.service';
