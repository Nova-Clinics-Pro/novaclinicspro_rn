/**
 * Treatment Sheets Feature Exports
 */

// Data Layer (primary source of DTOs)
export * from './data/models/treatmentSheets.dtos';
export * from './data/repositories/treatmentSheets.repository.impl';
export * from './data/repositories/treatmentSheetLifecycle.repository.impl';

// Domain Layer (entity helpers - avoid re-exporting types already in DTOs)
export {
  TreatmentSheetEntity,
  TreatmentSheetRowEntity,
  TreatmentSheetRowStatus,
  canEditTreatmentSheet,
  getAllowedTreatmentSheetTransitions,
  canArchiveTreatmentSheet,
  getTreatmentSheetStatusInfo,
  getTreatmentRowStatusInfo,
  calculateTreatmentProgress,
} from './domain/entities/treatmentSheet.entity';

export type {
  ITreatmentSheetsRepository,
  CreateTreatmentSheetParams,
  UpdateTreatmentSheetRowParams,
  CompleteTreatmentSheetRowParams,
  TransitionStatusParams as TreatmentSheetTransitionParams,
  PrintTreatmentSheetResult,
  SyncTreatmentSheetResult,
} from './domain/repositories/treatmentSheets.repository';

export * from './domain/usecases';

// Presentation Layer
export * from './presentation/components';
export * from './presentation/pages';
