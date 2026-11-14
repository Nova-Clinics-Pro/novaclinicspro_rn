/**
 * Clients List Screen
 * Displays list of all clients/patients for the clinic
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import { useAuth } from '../../../auth/presentation/hooks/useAuth';
import { useDebounce } from '../../../../core/hooks/useDebounce';
import { t, ErrorTokens } from '../../../../core/localization';
import {
  useClientsListQuery,
  useCreateClientMutation,
} from '../../data/repositories/clients.repository.impl';
import { ClientResponse, ClientCreate, ClientUpdate } from '../../data/models/clients.dtos';
import { ClientListItem } from '../components/ClientListItem';
import { ClientForm } from '../components/ClientForm';
import { ApiErrorState } from '../../../../core/components/ui/ApiErrorState';

// Debounce delay in milliseconds
const DEBOUNCE_DELAY = 300;

export const ClientsListScreen: React.FC = () => {
  const router = useRouter();
  const { currentUser } = useAuth();
  const tenantId = currentUser?.tenantId || '';

  // State - raw input value for controlled input
  const [searchInput, setSearchInput] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Debounce search input - delays filtering until user stops typing
  const debouncedSearchQuery = useDebounce(searchInput, DEBOUNCE_DELAY);

  // Always load the full list (up to 100) — search is done client-side
  const listQuery = useClientsListQuery(
    tenantId, 
    { limit: 100 },
    { enabled: !!tenantId }
  );

  // Client-side filtering using the debounced value (prevents jumping on every keystroke)
  const filteredClients = useMemo(() => {
    const clients = listQuery.data?.items || [];
    if (debouncedSearchQuery.length === 0) return clients;
    const lowerQuery = debouncedSearchQuery.toLowerCase();
    return clients.filter(c =>
      c.full_name.toLowerCase().includes(lowerQuery) ||
      c.email?.toLowerCase().includes(lowerQuery) ||
      (c.phone && c.phone.includes(debouncedSearchQuery))
    );
  }, [listQuery.data?.items, debouncedSearchQuery]);

  const isLoading = listQuery.isLoading;
  const isError = listQuery.isError;
  const error = listQuery.error;
  const isRefetching = listQuery.isRefetching;
  const refetch = listQuery.refetch;
  const clientsData = listQuery.data;

  // Mutations
  const createMutation = useCreateClientMutation(tenantId);

  const handleClientPress = useCallback(
    (client: ClientResponse) => {
      router.push(`/clinic-admin/clients/${client.id}`);
    },
    [router]
  );

  const handleCreateClient = useCallback(
    async (data: ClientCreate | ClientUpdate) => {
      try {
        // Cast to ClientCreate since we're only creating in this modal
        await createMutation.mutateAsync(data as ClientCreate);
        setShowAddModal(false);
        Alert.alert(t('common.success'), t('success.created'));
      } catch (err: any) {
        Alert.alert(t('common.error'), err.message || t(ErrorTokens.clients.createFailed));
      }
    },
    [createMutation]
  );

  const renderEmptyList = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={64} color={colors.text.tertiary} />
      <Text style={styles.emptyTitle}>No Clients Found</Text>
      <Text style={styles.emptySubtitle}>
        {debouncedSearchQuery
          ? 'Try adjusting your search'
          : 'Add your first client to get started'}
      </Text>
      {!debouncedSearchQuery && (
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={20} color={colors.background.default} />
          <Text style={styles.emptyButtonText}>Add Client</Text>
        </TouchableOpacity>
      )}
    </View>
  ), [debouncedSearchQuery]);

  const renderItem = useCallback(({ item }: { item: ClientResponse }) => (
    <ClientListItem client={item} onPress={handleClientPress} />
  ), [handleClientPress]);

  const keyExtractor = useCallback((item: ClientResponse) => item.id, []);

  // Error state
  if (isError && !clientsData) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ApiErrorState error={error} onRetry={() => refetch()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Page Header */}
      <View style={styles.pageHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.pageTitle}>Clients</Text>
          <Text style={styles.pageSubtitle}>
            {clientsData?.total || 0} registered clients
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={24} color={colors.background.default} />
        </TouchableOpacity>
      </View>

      {/* Search Bar - outside FlatList to prevent keyboard dismissal */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.text.tertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search clients..."
          placeholderTextColor={colors.text.tertiary}
          value={searchInput}
          onChangeText={setSearchInput}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {searchInput.length > 0 && (
          <TouchableOpacity onPress={() => setSearchInput('')}>
            <Ionicons name="close-circle" size={20} color={colors.text.tertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Main Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredClients}
          ListEmptyComponent={renderEmptyList}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[colors.primary.main]}
            />
          }
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
        />
      )}

      {/* Add Client Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add New Client</Text>
            <View style={{ width: 24 }} />
          </View>
          <ClientForm
            onSubmit={handleCreateClient}
            onCancel={() => setShowAddModal(false)}
            isLoading={createMutation.isPending}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.paper,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    backgroundColor: colors.background.default,
  },
  backButton: {
    padding: spacing.xs,
  },
  titleContainer: {
    flex: 1,
    marginLeft: spacing.md,
  },
  pageTitle: {
    ...typography.h5,
    color: colors.text.primary,
  },
  pageSubtitle: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  addButton: {
    backgroundColor: colors.primary.main,
    padding: spacing.sm,
    borderRadius: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.default,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    marginLeft: spacing.sm,
    ...typography.body1,
    color: colors.text.primary,
  },
  listContent: {
    padding: spacing.md,
    paddingTop: 0,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.body2,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xl * 2,
  },
  emptyTitle: {
    ...typography.h6,
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    ...typography.body2,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary.main,
    borderRadius: 8,
  },
  emptyButtonText: {
    ...typography.button,
    color: colors.background.default,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorTitle: {
    ...typography.h6,
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  errorText: {
    ...typography.body2,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  retryButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary.main,
    borderRadius: 8,
  },
  retryButtonText: {
    ...typography.button,
    color: colors.background.default,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background.paper,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    backgroundColor: colors.background.default,
  },
  modalTitle: {
    ...typography.h6,
    color: colors.text.primary,
  },
});

export default ClientsListScreen;
