import { PropsWithChildren, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { ErrorTokens } from '../localization/errorTokens';
import { t } from '../localization/i18n';
import {
  ORDINARY_API_LOADING_FALLBACK_MS,
  ORDINARY_API_LOADING_NOTICE_MS,
} from '../api/requestPolicy';
import { getTheme } from '../theme/useClinicTheme';
import {
  getActiveOrdinaryRequestCount,
  getUnhandledTransportFailure,
  getUnhandledTransportFailureVersion,
  subscribeToApiRequestActivity,
} from '../api/apiRequestActivity';

type QueryFailure = {
  queryKey?: readonly unknown[];
  key: string;
};

const isFeatureHandled = (query: { meta?: Record<string, unknown> }): boolean =>
  query.meta?.apiFailurePresentation === 'feature';

const isLongRunning = (query: { meta?: Record<string, unknown> }): boolean =>
  query.meta?.apiLoadingMode === 'long-running';

const isGloballyManaged = (query: { meta?: Record<string, unknown> }): boolean =>
  !isFeatureHandled(query) && !isLongRunning(query);

const isRecoverableUnhandledFailure = (error: unknown): boolean => {
  const status = (error as { response?: { status?: unknown } } | undefined)?.response?.status;
  // Auth failures retain the auth boundary's existing ownership. Client errors
  // are terminal in React Query but remain feature-owned when a screen chooses
  // to present them.
  return typeof status !== 'number' || status >= 500;
};

/**
 * Root safety net for query requests which are either stuck pending or fail
 * without a feature-owned presentation state. It does not replace local error
 * screens: a query can declare `meta.apiFailurePresentation = 'feature'`.
 */
export function ApiRequestFallbackProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const theme = getTheme();
  const [failure, setFailure] = useState<QueryFailure | null>(null);
  const [suppressedUntilIdle, setSuppressedUntilIdle] = useState(false);
  const surfacedErrors = useRef(new Set<string>());
  const [takingLonger, setTakingLonger] = useState(false);
  const fetching = useIsFetching({ predicate: isGloballyManaged });
  const activeTransportRequests = useSyncExternalStore(
    subscribeToApiRequestActivity,
    getActiveOrdinaryRequestCount,
    getActiveOrdinaryRequestCount
  );
  const transportFailureVersion = useSyncExternalStore(
    subscribeToApiRequestActivity,
    getUnhandledTransportFailureVersion,
    getUnhandledTransportFailureVersion
  );

  useEffect(() => {
    const transportFailure = getUnhandledTransportFailure();
    if (transportFailure) setFailure(transportFailure);
  }, [transportFailureVersion]);

  useEffect(() => {
    const cache = queryClient.getQueryCache();
    return cache.subscribe((event) => {
      if (event.type !== 'updated') return;
      const query = event.query;
      if (
        query.state.status !== 'error' ||
        !isGloballyManaged(query) ||
        !isRecoverableUnhandledFailure(query.state.error)
      ) return;

      const key = `${query.queryHash}:${query.state.errorUpdatedAt}`;
      if (surfacedErrors.current.has(key)) return;
      surfacedErrors.current.add(key);
      setFailure({ queryKey: query.queryKey, key });
    });
  }, [queryClient]);

  useEffect(() => {
    const ordinaryWorkActive = fetching > 0 || activeTransportRequests > 0;
    if (!ordinaryWorkActive) {
      setSuppressedUntilIdle(false);
      setTakingLonger(false);
      return;
    }
    if (failure || suppressedUntilIdle) return;

    const notice = setTimeout(() => setTakingLonger(true), ORDINARY_API_LOADING_NOTICE_MS);
    const fallback = setTimeout(() => {
      const pendingQuery = queryClient
        .getQueryCache()
        .getAll()
        .find((query) => query.state.fetchStatus === 'fetching' && isGloballyManaged(query));
      setFailure({ queryKey: pendingQuery?.queryKey, key: `pending:${Date.now()}` });
    }, ORDINARY_API_LOADING_FALLBACK_MS);

    return () => {
      clearTimeout(notice);
      clearTimeout(fallback);
    };
  }, [activeTransportRequests, failure, fetching, queryClient, suppressedUntilIdle]);

  const dismiss = useCallback(() => {
    setFailure(null);
    setSuppressedUntilIdle(true);
  }, []);

  const retry = useCallback(async () => {
    const queryKey = failure?.queryKey;
    if (!queryKey) return;
    setFailure(null);
    await queryClient.refetchQueries({ queryKey, type: 'active' });
  }, [failure?.queryKey, queryClient]);

  return (
    <>
      {children}
      {takingLonger && failure === null ? (
        <View style={[styles.notice, { backgroundColor: theme.colors.surface.muted }]} accessibilityRole="alert">
          <Text style={{ color: theme.colors.text.secondary }}>
            {t(ErrorTokens.network.takingLonger)}
          </Text>
        </View>
      ) : null}
      <Modal
        transparent
        visible={failure !== null}
        animationType="fade"
        onRequestClose={dismiss}
      >
        <View
          style={[styles.backdrop, { backgroundColor: theme.colors.surface.overlay }]}
          accessibilityViewIsModal
        >
          <View
            style={[styles.card, { backgroundColor: theme.colors.surface.elevated }]}
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
          >
            <Text style={[styles.title, { color: theme.colors.text.primary }]}>{t('common.error')}</Text>
            <Text style={[styles.message, { color: theme.colors.text.secondary }]}>{t(ErrorTokens.generic.unknown)}</Text>
            <View style={styles.actions}>
              <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={dismiss}>
                <Text style={[styles.secondaryAction, { color: theme.colors.text.secondary }]}>{t('common.close')}</Text>
              </Pressable>
              {failure?.queryKey ? (
                <Pressable accessibilityRole="button" accessibilityLabel={t('common.retry')} onPress={() => void retry()}>
                  <Text style={[styles.primaryAction, { color: theme.colors.primary.default }]}>{t('common.retry')}</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 420, borderRadius: 12, padding: 24 },
  title: { fontSize: 18, fontWeight: '700' },
  message: { marginTop: 12, fontSize: 16, lineHeight: 22 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 24, marginTop: 24 },
  notice: { position: 'absolute', right: 16, bottom: 16, left: 16, borderRadius: 8, padding: 12 },
  secondaryAction: { fontWeight: '600' },
  primaryAction: { fontWeight: '700' },
});
