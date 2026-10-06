/**
 * Episodes Feature - Barrel Export
 * 
 * Exports all public APIs from the episodes feature module
 */

// Data Models & DTOs
export type {
  Episode,
  EpisodesListResponse,
  EpisodeCreateRequest,
  EpisodeUpdateRequest,
  AttachEpisodeRequest,
  CloseEpisodeRequest,
  EpisodeStatus,
  EpisodeCodeSystem,
  ApiError,
} from './data/models/episodes.dtos';

export {
  getStatusColor,
  getStatusLabel,
  formatEpisodeDate,
} from './data/models/episodes.dtos';

// API Functions
export {
  listEpisodesApi,
  getEpisodeApi,
  createEpisodeApi,
  updateEpisodeApi,
  closeEpisodeApi,
  reopenEpisodeApi,
  attachEpisodeToAppointmentApi,
  isClosedEpisodeError,
  isEpisodeMismatchError,
  isValidationError,
  isForbiddenError,
  getFieldErrors,
  getErrorMessage,
} from './data/datasources/episodes.api';

export type { ListEpisodesParams } from './data/datasources/episodes.api';

// Repository Interface
export type { IEpisodesRepository } from './domain/repositories/episodes.repository';

// React Query Hooks
export {
  useEpisodesQuery,
  useClientEpisodeCountsQuery,
  useInfiniteEpisodesQuery,
  useEpisodeQuery,
  useCreateEpisodeMutation,
  useUpdateEpisodeMutation,
  useCloseEpisodeMutation,
  useReopenEpisodeMutation,
  useAttachEpisodeMutation,
  episodesKeys,
} from './data/repositories/episodes.repository.impl';
