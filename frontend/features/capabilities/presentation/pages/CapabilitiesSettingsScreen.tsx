/**
 * CapabilitiesSettingsScreen
 *
 * Release 5 (R5) · T-E.3 (design.md §12, requirements.md FR-H3, N-7)
 *
 * The minimum viable tenant-admin surface to view/toggle a tenant's own
 * capabilities with reasons — a settings-screen list (deterministic
 * `display_order`) of top-level + child capabilities, each row showing
 * available/unavailable + reason, with a toggle for capabilities not
 * currently required by an enabled dependent (design.md §12's own
 * qualifier on the toggle affordance, not just "toggleable ones").
 *
 * **No cross-tenant catalog-curation UI** (N-7): this screen only ever
 * reads `GET /capabilities/catalog` for `display_order`/hierarchy and
 * `useCapabilities()` for this tenant's own resolved state — there is no
 * add/edit/delete-a-capability affordance anywhere in this file, and there
 * cannot be, since neither hook this screen consumes exposes a
 * catalog-write path.
 *
 * **Backend authorization is the real gate, not this screen** (NFR-7/
 * AC-SEC-2/3): the `<ProtectedRoute requiredPermissions={['capability.manage']}>`
 * wrapper below is a UX nicety (hide the screen from someone who can't use
 * it) — the backend's own `require_permission("capability.manage")` on the
 * PATCH endpoint (T-D.2b) is what actually prevents an unauthorized toggle,
 * regardless of whether this screen is reached.
 *
 * **Toggle-affordance rule, honestly scoped to the data actually
 * available**: `GET /capabilities/catalog` exposes `parent_code` but not
 * explicit cross-branch `CapabilityDependency` edges (T-B.4) — so this
 * screen can (and does) pre-emptively disable the toggle for a capability
 * that has an *enabled child* (the one dependency relationship visible in
 * catalog data, ADR-R5-09's own parent-availability rule). It cannot
 * pre-emptively know about an *explicit* cross-branch dependent, since
 * that graph isn't exposed via any GET response — for that case, a disable
 * attempt is simply sent, and the backend's own `blocks_dependents`
 * rejection (naming every blocker) is surfaced via an alert. This is a
 * reactive, not predictive, safeguard for that one case, and is
 * deliberately not silently pretended to be complete client-side
 * prevention.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Switch, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { DashboardHeader } from '../../../../core/components/DashboardHeader';
import { ProtectedRoute } from '../../../../core/components/ProtectedRoute';
import {
  useCapabilities,
  useCapabilityCatalog,
  useToggleCapability,
  CapabilityCatalogEntry,
  CapabilityState,
} from '../../../../core/hooks/useCapabilities';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';

interface CapabilityRow {
  entry: CapabilityCatalogEntry;
  state: CapabilityState | null;
  depth: number;
  hasEnabledChild: boolean;
}

function buildRows(
  catalog: CapabilityCatalogEntry[],
  states: Record<string, CapabilityState>
): CapabilityRow[] {
  const sorted = [...catalog].sort((a, b) => a.display_order - b.display_order || a.code.localeCompare(b.code));
  const childrenByParent = new Map<string, CapabilityCatalogEntry[]>();
  for (const entry of sorted) {
    if (entry.parent_code) {
      const list = childrenByParent.get(entry.parent_code) ?? [];
      list.push(entry);
      childrenByParent.set(entry.parent_code, list);
    }
  }

  const hasEnabledChild = (code: string): boolean =>
    (childrenByParent.get(code) ?? []).some((child) => states[child.code]?.effective_enabled);

  const rows: CapabilityRow[] = [];
  const appendWithChildren = (entry: CapabilityCatalogEntry, depth: number) => {
    rows.push({
      entry,
      state: states[entry.code] ?? null,
      depth,
      hasEnabledChild: hasEnabledChild(entry.code),
    });
    for (const child of childrenByParent.get(entry.code) ?? []) {
      appendWithChildren(child, depth + 1);
    }
  };

  for (const entry of sorted.filter((e) => !e.parent_code)) {
    appendWithChildren(entry, 0);
  }
  return rows;
}

function CapabilitiesSettingsScreenInner(): React.ReactElement {
  const router = useRouter();
  const catalogQuery = useCapabilityCatalog();
  const { capabilities, isLoading: capsLoading, error: capsError, getReason } = useCapabilities();
  const { toggle, status, rejection, reset } = useToggleCapability();
  const [togglingCode, setTogglingCode] = useState<string | null>(null);

  const isLoading = catalogQuery.isLoading || capsLoading;
  const error = catalogQuery.error || capsError;

  const rows = useMemo(
    () => buildRows(catalogQuery.data?.capabilities ?? [], capabilities),
    [catalogQuery.data, capabilities]
  );

  const handleToggle = async (row: CapabilityRow, nextEnabled: boolean) => {
    if (!row.state) return;
    setTogglingCode(row.entry.code);
    await toggle({ code: row.entry.code, enabled: nextEnabled, version: row.state.version });
  };

  // Surface a completed toggle's outcome once, then reset back to idle so
  // the next interaction starts clean.
  React.useEffect(() => {
    if (status === 'idle' || !togglingCode) return;
    if (status === 'toggling') return;

    if (status === 'conflict') {
      Alert.alert(
        'Updated elsewhere',
        'This capability was changed elsewhere. The list has been refreshed — please review and try again.'
      );
    } else if (status === 'error' && rejection) {
      if (rejection.error === 'blocks_dependents' && rejection.blocking_capabilities?.length) {
        Alert.alert(
          'Cannot disable',
          `This is required by: ${rejection.blocking_capabilities.join(', ')}. Disable those first.`
        );
      } else {
        Alert.alert('Unable to update', rejection.message);
      }
    } else if (status === 'error') {
      Alert.alert('Unable to update', 'Failed to update this capability. Please try again.');
    }

    reset();
  }, [status, rejection, togglingCode, reset]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <DashboardHeader title="Capabilities" subtitle="Enable or disable clinic capabilities" onBackPress={() => router.back()} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2F6F4E" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <DashboardHeader title="Capabilities" subtitle="Enable or disable clinic capabilities" onBackPress={() => router.back()} />
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
          <Text style={styles.errorText}>Could not load capabilities. Please try again.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <DashboardHeader title="Capabilities" subtitle="Enable or disable clinic capabilities" onBackPress={() => router.back()} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {rows.length === 0 && (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No capabilities are configured yet.</Text>
          </View>
        )}
        {rows.map((row) => {
          const { entry, state, depth, hasEnabledChild } = row;
          const isRowToggling = status === 'toggling' && togglingCode === entry.code;
          const canToggle = !!state?.effective_available && !hasEnabledChild;
          const switchDisabled = !state || !state.effective_available || (state.effective_enabled && hasEnabledChild) || isRowToggling;
          const reason = state && !state.effective_available && state.blocked_reason_code
            ? getReason(state.blocked_reason_code)
            : hasEnabledChild
              ? 'Required by an enabled sub-feature'
              : null;

          return (
            <View
              key={entry.code}
              style={[styles.row, depth > 0 && styles.rowChild]}
              testID={`capability-row-${entry.code}`}
            >
              <View style={styles.rowInfo}>
                <Text style={styles.rowTitle}>{entry.name}</Text>
                {!!entry.description && (
                  <Text style={styles.rowDescription} numberOfLines={2}>
                    {entry.description}
                  </Text>
                )}
                {!!reason && <Text style={styles.reasonText}>{reason}</Text>}
              </View>
              <View style={styles.toggleContainer}>
                {isRowToggling ? (
                  <ActivityIndicator size="small" color="#2F6F4E" />
                ) : (
                  <Switch
                    value={!!state?.effective_enabled}
                    disabled={switchDisabled}
                    onValueChange={(value) => handleToggle(row, value)}
                    trackColor={{ false: '#E5E7EB', true: '#2F6F4E60' }}
                    thumbColor={state?.effective_enabled ? '#2F6F4E' : '#F4F3F4'}
                    ios_backgroundColor="#E5E7EB"
                    accessibilityLabel={`${entry.name} capability`}
                  />
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

export function CapabilitiesSettingsScreen(): React.ReactElement {
  return (
    <ProtectedRoute requiredPermissions={['capability.manage']}>
      <CapabilitiesSettingsScreenInner />
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F4EC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xl,
    gap: spacing.sm,
  },
  errorText: {
    ...typography.body1,
    color: '#6B7280',
    textAlign: 'center',
  },
  emptyText: {
    ...typography.body1,
    color: '#6B7280',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  rowChild: {
    marginLeft: spacing.lg,
  },
  rowInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  rowTitle: {
    ...typography.body1,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  rowDescription: {
    ...typography.body2,
    color: '#6B7280',
  },
  reasonText: {
    ...typography.caption,
    color: '#B45309',
    marginTop: 4,
  },
  toggleContainer: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CapabilitiesSettingsScreen;
