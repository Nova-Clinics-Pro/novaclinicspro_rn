/**
 * Casesheets List Screen
 * Displays list of casesheets for a client
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import { useAuth } from '../../../auth/presentation/hooks/useAuth';
import { useCasesheetsListQuery } from '../../data/repositories/casesheets.repository.impl';
import type {
  CasesheetResponse,
  CasesheetStatus,
} from '../../data/models/casesheets.dtos';
import { CasesheetListItem } from '../components/CasesheetListItem';
import { EmptyCasesheetsState } from '../components/EmptyCasesheetsState';

interface CasesheetsListScreenProps {
  clientId?: string;
  clientName?: string;
}

export const CasesheetsListScreen: React.FC<CasesheetsListScreenProps> = ({
  clientId: propClientId,
  clientName: propClientName,
}) => {
  const router = useRouter();
  const params = useLocalSearchParams<{ clientId: string; clientName?: string }>();
  const { currentUser } = useAuth();
  const tenantId = currentUser?.tenantId || '';
  const clientId = propClientId || params.clientId || '';
  const clientName = propClientName || params.clientName;

  const [statusFilter, setStatusFilter] = useState<CasesheetStatus | undefined>(undefined);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useCasesheetsListQuery(tenantId, clientId, { status: statusFilter });

  const handleCasesheetPress = useCallback((casesheet: CasesheetResponse) => {
    router.push({
      pathname: '/clinic-admin/clients/[clientId]/casesheets/[casesheetId]',
      params: { clientId, casesheetId: casesheet.id },
    });
  }, [router, clientId]);

  const handleCreatePress = useCallback(() => {
    router.push({
      pathname: '/clinic-admin/clients/[clientId]/casesheets/new',
      params: { clientId },
    });
  }, [router, clientId]);

  const renderItem = useCallback(({ item }: { item: CasesheetResponse }) => (
    <CasesheetListItem
      casesheet={item}
      onPress={() => handleCasesheetPress(item)}
    />
  ), [handleCasesheetPress]);

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
      </TouchableOpacity>
      <View style={styles.headerTitleContainer}>
        <Text style={styles.headerTitle}>Casesheets</Text>
        {clientName && (
          <Text style={styles.headerSubtitle}>{clientName}</Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.addButton}
        onPress={handleCreatePress}
        accessibilityRole="button"
        accessibilityLabel="Create new casesheet"
      >
        <Ionicons name="add" size={24} color={colors.background.default} />
      </TouchableOpacity>
    </View>
  );

  const renderFilters = () => (
    <View style={styles.filterContainer}>
      <TouchableOpacity
        style={[
          styles.filterChip,
          !statusFilter && styles.filterChipActive,
        ]}
        onPress={() => setStatusFilter(undefined)}
      >
        <Text style={[styles.filterChipText, !statusFilter && styles.filterChipTextActive]}>
          All
        </Text>
      </TouchableOpacity>
      {(['DRAFT', 'FINAL', 'SIGNED'] as CasesheetStatus[]).map((status) => (
        <TouchableOpacity
          key={status}
          style={[
            styles.filterChip,
            statusFilter === status && styles.filterChipActive,
          ]}
          onPress={() => setStatusFilter(status)}
        >
          <Text
            style={[
              styles.filterChipText,
              statusFilter === status && styles.filterChipTextActive,
            ]}
          >
            {status.charAt(0) + status.slice(1).toLowerCase()}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.loadingText}>Loading casesheets...</Text>
        </View>
      );
    }

    if (isError) {
      return (
        <EmptyCasesheetsState
          variant="error"
          title="Unable to Load Casesheets"
          message={
            error?.message?.includes('401')
              ? 'Authentication failed. Please try logging in again.'
              : 'Could not load casesheets. Pull down to retry.'
          }
          actionLabel="Retry"
          onActionPress={() => refetch()}
        />
      );
    }

    const casesheets = data?.items || [];

    if (casesheets.length === 0) {
      return (
        <EmptyCasesheetsState
          title={statusFilter ? `No ${statusFilter.toLowerCase()} casesheets` : 'No Casesheets'}
          message="No casesheets have been created for this patient yet."
          actionLabel="Create Casesheet"
          onActionPress={handleCreatePress}
        />
      );
    }

    return (
      <FlatList
        data={casesheets}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            colors={[colors.primary.main]}
            tintColor={colors.primary.main}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {renderHeader()}
      {renderFilters()}
      <View style={styles.content}>
        {renderContent()}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.paper,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    ...typography.h5,
    color: colors.text.primary,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    backgroundColor: colors.grey[200],
  },
  filterChipActive: {
    backgroundColor: colors.primary.main,
  },
  filterChipText: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: colors.background.default,
  },
  content: {
    flex: 1,
  },
  listContent: {
    padding: spacing.md,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.body2,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
});

export default CasesheetsListScreen;
