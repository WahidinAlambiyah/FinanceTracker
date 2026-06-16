/**
 * Category Management Screen
 * 
 * Manage income and expense categories.
 * Seeds default categories on first load if none exist.
 * Allows creating, editing, and deleting custom categories.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/features/auth';
import { logger } from '@/lib/utils/logger';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  seedDefaultCategories,
} from '@/features/categories';
import type { Category, CategoryType, CreateCategoryInput, UpdateCategoryInput } from '@/features/categories';

export default function CategoriesScreen() {
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<CategoryType>('income');
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal state
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  // Form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<CategoryType>('income');
  const [formIcon, setFormIcon] = useState('');
  const [formColor, setFormColor] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Seed default categories if needed
   * 
   * Always calls seeder on first load.
   * Seeder is idempotent: inserts only missing defaults.
   * Protects against partial-seed failures.
   */
  const checkAndSeedDefaults = useCallback(async () => {
    if (!user) return;

    try {
      setIsSeeding(true);
      const seedResult = await seedDefaultCategories(user.id);
      
      if (!seedResult.success) {
        Alert.alert(
          'Warning',
          'Failed to load default categories. You can still create custom categories.'
        );
      }
    } catch (error) {
      logger.error('Seeding check failed', error);
      Alert.alert(
        'Warning',
        'Failed to load default categories. You can still create custom categories.'
      );
    } finally {
      setIsSeeding(false);
    }
  }, [user]);

  /**
   * Load categories from local database
   */
  const loadCategories = useCallback(async () => {
    if (!user) return;

    try {
      const result = await getCategories(user.id, selectedType);

      if (result.success && result.data) {
        setCategories(result.data);
      } else {
        Alert.alert('Error', result.error || 'Failed to load categories');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load categories');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user, selectedType]);

  /**
   * Initial load: seed defaults if needed, then load categories
   */
  useEffect(() => {
    async function initialize() {
      setIsLoading(true);
      await checkAndSeedDefaults();
      await loadCategories();
    }

    initialize();
  }, [checkAndSeedDefaults, loadCategories]);

  /**
   * Reload categories when screen comes into focus or type changes
   */
  useFocusEffect(
    useCallback(() => {
      if (!isLoading && !isSeeding) {
        loadCategories();
      }
    }, [loadCategories, isLoading, isSeeding])
  );

  /**
   * Handle pull-to-refresh
   */
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadCategories();
  }, [loadCategories]);

  /**
   * Open add category modal
   */
  const handleAddCategory = () => {
    setModalMode('create');
    setFormName('');
    setFormType(selectedType);
    setFormIcon('');
    setFormColor('');
    setEditingCategory(null);
    setIsModalVisible(true);
  };

  /**
   * Open edit category modal
   */
  const handleEditCategory = (category: Category) => {
    setModalMode('edit');
    setFormName(category.name);
    setFormType(category.type);
    setFormIcon(category.icon || '');
    setFormColor(category.color || '');
    setEditingCategory(category);
    setIsModalVisible(true);
  };

  /**
   * Handle form submission (create or update)
   */
  const handleSubmit = async () => {
    if (!user) return;

    if (!formName.trim()) {
      Alert.alert('Validation Error', 'Category name is required');
      return;
    }

    setIsSubmitting(true);

    try {
      if (modalMode === 'create') {
        const input: CreateCategoryInput = {
          name: formName.trim(),
          type: formType,
          icon: formIcon.trim() || null,
          color: formColor.trim() || null,
        };

        const result = await createCategory(user.id, input);

        if (result.success) {
          setIsModalVisible(false);
          loadCategories();
        } else {
          Alert.alert('Error', result.error || 'Failed to create category');
        }
      } else {
        if (!editingCategory) return;

        const input: UpdateCategoryInput = {
          name: formName.trim(),
          icon: formIcon.trim() || null,
          color: formColor.trim() || null,
        };

        const result = await updateCategory(user.id, editingCategory.id, input);

        if (result.success) {
          setIsModalVisible(false);
          loadCategories();
        } else {
          Alert.alert('Error', result.error || 'Failed to update category');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle category deletion with confirmation
   */
  const handleDeleteCategory = (category: Category) => {
    const defaultWarning = category.is_default ? ' (This is a default category)' : '';
    
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${category.name}"?${defaultWarning}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;

            const result = await deleteCategory(user.id, category.id);

            if (result.success) {
              loadCategories();
            } else {
              Alert.alert('Error', result.error || 'Failed to delete category');
            }
          },
        },
      ]
    );
  };

  /**
   * Render type selector toggle
   */
  const renderTypeSelector = () => (
    <View style={styles.typeSelector}>
      <TouchableOpacity
        style={[styles.typeButton, selectedType === 'income' && styles.typeButtonActive]}
        onPress={() => setSelectedType('income')}
      >
        <Text style={[styles.typeButtonText, selectedType === 'income' && styles.typeButtonTextActive]}>
          Income
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.typeButton, selectedType === 'expense' && styles.typeButtonActive]}
        onPress={() => setSelectedType('expense')}
      >
        <Text style={[styles.typeButtonText, selectedType === 'expense' && styles.typeButtonTextActive]}>
          Expense
        </Text>
      </TouchableOpacity>
    </View>
  );

  /**
   * Render category card
   */
  const renderCategoryCard = ({ item }: { item: Category }) => {
    const accentColor = item.type === 'income' ? '#10B981' : '#EF4444';
    
    return (
      <TouchableOpacity
        style={styles.categoryCard}
        onPress={() => handleEditCategory(item)}
        onLongPress={() => handleDeleteCategory(item)}
      >
        <View style={styles.categoryCardContent}>
          {item.color && (
            <View style={[styles.colorCircle, { backgroundColor: item.color }]} />
          )}
          <View style={styles.categoryInfo}>
            <View style={styles.categoryHeader}>
              <Text style={styles.categoryName}>{item.name}</Text>
              {item.is_default && (
                <View style={styles.defaultBadge}>
                  <Text style={styles.defaultBadgeText}>Default</Text>
                </View>
              )}
            </View>
            {item.icon && <Text style={styles.categoryIcon}>{item.icon}</Text>}
          </View>
        </View>
        {item.sync_status === 'pending' && (
          <View style={[styles.syncBadge, { backgroundColor: '#F59E0B' }]}>
            <Text style={styles.syncBadgeText}>Pending</Text>
          </View>
        )}
        {item.sync_status === 'failed' && (
          <View style={[styles.syncBadge, { backgroundColor: '#DC2626' }]}>
            <Text style={styles.syncBadgeText}>Failed</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  /**
   * Render empty state
   */
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>
        No {selectedType} categories yet
      </Text>
      <Text style={styles.emptyStateText}>
        Add your first custom {selectedType} category
      </Text>
      <TouchableOpacity style={styles.emptyStateButton} onPress={handleAddCategory}>
        <Text style={styles.emptyStateButtonText}>Add Category</Text>
      </TouchableOpacity>
    </View>
  );

  /**
   * Render category form modal
   */
  const renderModal = () => (
    <Modal
      visible={isModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => !isSubmitting && setIsModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            {modalMode === 'create' ? 'Add Category' : 'Edit Category'}
          </Text>

          {/* Category Name */}
          <View style={styles.formField}>
            <Text style={styles.formLabel}>Category Name *</Text>
            <TextInput
              style={styles.formInput}
              placeholder="e.g., Groceries"
              value={formName}
              onChangeText={setFormName}
              maxLength={50}
              editable={!isSubmitting}
            />
          </View>

          {/* Category Type */}
          <View style={styles.formField}>
            <Text style={styles.formLabel}>Type *</Text>
            {modalMode === 'create' ? (
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[styles.typeButton, formType === 'income' && styles.typeButtonActive]}
                  onPress={() => setFormType('income')}
                >
                  <Text style={[styles.typeButtonText, formType === 'income' && styles.typeButtonTextActive]}>
                    Income
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeButton, formType === 'expense' && styles.typeButtonActive]}
                  onPress={() => setFormType('expense')}
                >
                  <Text style={[styles.typeButtonText, formType === 'expense' && styles.typeButtonTextActive]}>
                    Expense
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.readOnlyField}>
                  <Text style={styles.readOnlyValue}>
                    {formType === 'income' ? 'Income' : 'Expense'}
                  </Text>
                </View>
                <Text style={styles.helperText}>
                  Category type cannot be changed
                </Text>
              </>
            )}
          </View>

          {/* Icon (Optional) */}
          <View style={styles.formField}>
            <Text style={styles.formLabel}>Icon (Optional)</Text>
            <TextInput
              style={styles.formInput}
              placeholder="e.g., shopping-bag"
              value={formIcon}
              onChangeText={setFormIcon}
              editable={!isSubmitting}
            />
            <Text style={styles.helperText}>Icon name (displayed as text for now)</Text>
          </View>

          {/* Color (Optional) */}
          <View style={styles.formField}>
            <Text style={styles.formLabel}>Color (Optional)</Text>
            <TextInput
              style={styles.formInput}
              placeholder="e.g., #10B981"
              value={formColor}
              onChangeText={setFormColor}
              editable={!isSubmitting}
            />
            <Text style={styles.helperText}>Hex color code (e.g., #10B981)</Text>
          </View>

          {/* Actions */}
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonSecondary]}
              onPress={() => setIsModalVisible(false)}
              disabled={isSubmitting}
            >
              <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonPrimary]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.modalButtonPrimaryText}>
                  {modalMode === 'create' ? 'Create' : 'Save'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (isLoading || isSeeding) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>
          {isSeeding ? 'Loading default categories...' : 'Loading categories...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderTypeSelector()}
      
      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        renderItem={renderCategoryCard}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={categories.length === 0 ? styles.emptyContainer : styles.listContent}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
      />

      {categories.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={handleAddCategory}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}

      {renderModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  typeSelector: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  typeButtonTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginRight: 8,
  },
  categoryIcon: {
    fontSize: 12,
    color: '#64748B',
  },
  defaultBadge: {
    backgroundColor: '#EFF6FF',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  defaultBadgeText: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '500',
  },
  syncBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  syncBadgeText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyStateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: '300',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 20,
  },
  formField: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  readOnlyField: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
  },
  readOnlyValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  helperText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: '#2563EB',
  },
  modalButtonPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalButtonSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalButtonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
});
