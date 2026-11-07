import { useEffect } from 'react';
import { useEpisodeQuery } from '../../../../episodes/data/repositories/episodes.repository.impl';
import { useClientDetailQuery } from '../../../../clients/data/repositories/clients.repository.impl';
import { ClientEntity, HeaderEntity } from './types';

export const useTreatmentSheetHeaderData = (tenantId: string, episodeId?: string | null) => {
  const resolvedEpisodeId = episodeId || '';
  const episodeQuery = useEpisodeQuery(tenantId, resolvedEpisodeId, {
    enabled: Boolean(tenantId && resolvedEpisodeId),
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const clientId = episodeQuery.data?.client_id || '';
  const clientQuery = useClientDetailQuery(tenantId, clientId, {
    enabled: Boolean(tenantId && resolvedEpisodeId && clientId),
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    const error = episodeQuery.error || clientQuery.error;
    if (error) {
      console.error('[TreatmentSheet] Failed to fetch header data:', error);
    }
  }, [episodeQuery.error, clientQuery.error]);

  const episodeData = (episodeQuery.data as HeaderEntity | undefined) ?? null;
  const clientData = (clientQuery.data as ClientEntity | undefined) ?? null;
  const isLoadingHeaderData = Boolean(
    episodeQuery.isFetching || (clientId && clientQuery.isFetching)
  );

  return { episodeData, clientData, isLoadingHeaderData };
};
