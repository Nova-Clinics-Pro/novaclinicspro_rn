/**
 * Centralized Error Token Definitions
 * 
 * All user-facing error messages should be defined here as tokens.
 * These tokens map to keys in the translation files.
 * 
 * Usage:
 * import { ErrorTokens } from '@/core/localization/errorTokens';
 * import { t } from '@/core/localization/i18n';
 * 
 * const message = t(ErrorTokens.network.generic);
 */

/**
 * Error token structure
 * All tokens are strings that map to translation keys
 */
export const ErrorTokens = {
  // Network & Connection Errors
  network: {
    generic: 'errors.network.generic',
    takingLonger: 'errors.network.takingLonger',
    timeout: 'errors.network.timeout',
    noConnection: 'errors.network.noConnection',
    serverUnavailable: 'errors.network.serverUnavailable',
  },

  // Authentication Errors
  auth: {
    sessionExpired: 'errors.auth.sessionExpired',
    invalidCredentials: 'errors.auth.invalidCredentials',
    unauthorized: 'errors.auth.unauthorized',
    forbidden: 'errors.auth.forbidden',
    permissionDenied: 'errors.auth.permissionDenied',
    loginFailed: 'errors.auth.loginFailed',
    logoutFailed: 'errors.auth.logoutFailed',
    tokenRefreshFailed: 'errors.auth.tokenRefreshFailed',
  },

  clinicEntry: {
    validation: 'errors.clinicEntry.validation',
    fieldInvalid: 'errors.clinicEntry.fieldInvalid',
    duplicate: 'errors.clinicEntry.duplicate',
    unauthorized: 'errors.clinicEntry.unauthorized',
    alreadyAssociated: 'errors.clinicEntry.alreadyAssociated',
    idempotencyConflict: 'errors.clinicEntry.idempotencyConflict',
    associationConflict: 'errors.clinicEntry.associationConflict',
    inProgress: 'errors.clinicEntry.inProgress',
    transientFailure: 'errors.clinicEntry.transientFailure',
    sessionRefreshFailed: 'errors.clinicEntry.sessionRefreshFailed',
    organizationNameRequired: 'errors.clinicEntry.organizationNameRequired',
    organizationCreationUnauthorized: 'errors.clinicEntry.organizationCreationUnauthorized',
    organizationCreationConflict: 'errors.clinicEntry.organizationCreationConflict',
    organizationCreationRetryableFailure:
      'errors.clinicEntry.organizationCreationRetryableFailure',
    verificationInvalid: 'errors.clinicEntry.verificationInvalid',
    verificationExpired: 'errors.clinicEntry.verificationExpired',
    contactVerificationMismatch: 'errors.clinicEntry.contactVerificationMismatch',
    contactVerificationInProgress: 'errors.clinicEntry.contactVerificationInProgress',
  },

  // Generic CRUD Operations
  generic: {
    loadFailed: 'errors.generic.loadFailed',
    saveFailed: 'errors.generic.saveFailed',
    updateFailed: 'errors.generic.updateFailed',
    deleteFailed: 'errors.generic.deleteFailed',
    createFailed: 'errors.generic.createFailed',
    notFound: 'errors.generic.notFound',
    unknown: 'errors.generic.unknown',
    withResource: 'errors.generic.withResource', // Uses {{resource}} param
    withRetry: 'errors.generic.withRetry', // Uses {{seconds}} param
  },

  // Appointments
  appointments: {
    loadFailed: 'errors.appointments.loadFailed',
    createFailed: 'errors.appointments.createFailed',
    updateFailed: 'errors.appointments.updateFailed',
    cancelFailed: 'errors.appointments.cancelFailed',
    rescheduleFailed: 'errors.appointments.rescheduleFailed',
    slotUnavailable: 'errors.appointments.slotUnavailable',
    conflictDetected: 'errors.appointments.conflictDetected',
  },

  // Clients/Patients
  clients: {
    loadFailed: 'errors.clients.loadFailed',
    loadDetailsFailed: 'errors.clients.loadDetailsFailed',
    createFailed: 'errors.clients.createFailed',
    updateFailed: 'errors.clients.updateFailed',
    deleteFailed: 'errors.clients.deleteFailed',
    searchFailed: 'errors.clients.searchFailed',
  },

  // Staff
  staff: {
    loadFailed: 'errors.staff.loadFailed',
    loadDetailsFailed: 'errors.staff.loadDetailsFailed',
    createFailed: 'errors.staff.createFailed',
    updateFailed: 'errors.staff.updateFailed',
    deleteFailed: 'errors.staff.deleteFailed',
    inviteFailed: 'errors.staff.inviteFailed',
  },

  // Dashboard
  dashboard: {
    loadFailed: 'errors.dashboard.loadFailed',
    accessRestricted: 'errors.dashboard.accessRestricted',
    permissionRequired: 'errors.dashboard.permissionRequired',
  },

  // Notifications
  notifications: {
    loadFailed: 'errors.notifications.loadFailed',
    markReadFailed: 'errors.notifications.markReadFailed',
    markAllReadFailed: 'errors.notifications.markAllReadFailed',
    deleteFailed: 'errors.notifications.deleteFailed',
  },

  // Notification Preferences
  notificationPreferences: {
    loadFailed: 'errors.notificationPreferences.loadFailed',
    updateFailed: 'errors.notificationPreferences.updateFailed',
  },

  // Settings
  settings: {
    loadFailed: 'errors.settings.loadFailed',
    updateFailed: 'errors.settings.updateFailed',
    saveFailed: 'errors.settings.saveFailed',
  },

  // Localization
  localization: {
    loadFailed: 'errors.localization.loadFailed',
    updateFailed: 'errors.localization.updateFailed',
    invalidLocale: 'errors.localization.invalidLocale',
  },

  // Branding
  branding: {
    loadFailed: 'errors.branding.loadFailed',
    updateFailed: 'errors.branding.updateFailed',
    logoUploadFailed: 'errors.branding.logoUploadFailed',
  },

  // Analytics
  analytics: {
    loadFailed: 'errors.analytics.loadFailed',
    exportFailed: 'errors.analytics.exportFailed',
  },

  // Reports
  reports: {
    loadFailed: 'errors.reports.loadFailed',
    generateFailed: 'errors.reports.generateFailed',
    downloadFailed: 'errors.reports.downloadFailed',
  },

  // Billing
  billing: {
    loadFailed: 'errors.billing.loadFailed',
    invoiceLoadFailed: 'errors.billing.invoiceLoadFailed',
    paymentFailed: 'errors.billing.paymentFailed',
    refundFailed: 'errors.billing.refundFailed',
  },

  // Inventory
  inventory: {
    loadFailed: 'errors.inventory.loadFailed',
    updateFailed: 'errors.inventory.updateFailed',
    stockAdjustmentFailed: 'errors.inventory.stockAdjustmentFailed',
  },

  // Treatment Sessions
  treatmentSessions: {
    loadFailed: 'errors.treatmentSessions.loadFailed',
    createFailed: 'errors.treatmentSessions.createFailed',
    updateFailed: 'errors.treatmentSessions.updateFailed',
    completeFailed: 'errors.treatmentSessions.completeFailed',
  },

  // Treatments
  treatments: {
    loadFailed: 'errors.treatments.loadFailed',
    createFailed: 'errors.treatments.createFailed',
    updateFailed: 'errors.treatments.updateFailed',
    deleteFailed: 'errors.treatments.deleteFailed',
  },

  // Prescriptions
  prescriptions: {
    loadFailed: 'errors.prescriptions.loadFailed',
    createFailed: 'errors.prescriptions.createFailed',
    updateFailed: 'errors.prescriptions.updateFailed',
  },

  // Casesheets
  casesheets: {
    loadFailed: 'errors.casesheets.loadFailed',
    createFailed: 'errors.casesheets.createFailed',
    updateFailed: 'errors.casesheets.updateFailed',
  },

  // Documents
  documents: {
    loadFailed: 'errors.documents.loadFailed',
    uploadFailed: 'errors.documents.uploadFailed',
    downloadFailed: 'errors.documents.downloadFailed',
    deleteFailed: 'errors.documents.deleteFailed',
  },

  // RBAC
  rbac: {
    loadRolesFailed: 'errors.rbac.loadRolesFailed',
    loadPermissionsFailed: 'errors.rbac.loadPermissionsFailed',
    updateRoleFailed: 'errors.rbac.updateRoleFailed',
    assignRoleFailed: 'errors.rbac.assignRoleFailed',
  },

  // Tenants (Super Admin)
  tenants: {
    loadFailed: 'errors.tenants.loadFailed',
    createFailed: 'errors.tenants.createFailed',
    updateFailed: 'errors.tenants.updateFailed',
    suspendFailed: 'errors.tenants.suspendFailed',
  },

  // Applications (Super Admin)
  applications: {
    loadFailed: 'errors.applications.loadFailed',
    approveFailed: 'errors.applications.approveFailed',
    rejectFailed: 'errors.applications.rejectFailed',
  },

  // Form Validation
  validation: {
    required: 'errors.validation.required',
    invalidEmail: 'errors.validation.invalidEmail',
    invalidPhone: 'errors.validation.invalidPhone',
    invalidDate: 'errors.validation.invalidDate',
    invalidTime: 'errors.validation.invalidTime',
    minLength: 'errors.validation.minLength', // Uses {{min}} param
    maxLength: 'errors.validation.maxLength', // Uses {{max}} param
    passwordMismatch: 'errors.validation.passwordMismatch',
    invalidFormat: 'errors.validation.invalidFormat',
  },

  // File Operations
  file: {
    tooLarge: 'errors.file.tooLarge', // Uses {{maxSize}} param
    invalidType: 'errors.file.invalidType',
    uploadFailed: 'errors.file.uploadFailed',
    downloadFailed: 'errors.file.downloadFailed',
  },

  // Leave Management
  leave: {
    loadFailed: 'errors.leave.loadFailed',
    createFailed: 'errors.leave.createFailed',
    cancelFailed: 'errors.leave.cancelFailed',
    notAvailable: 'errors.leave.notAvailable',
  },

  // Therapist Dashboard
  therapistDashboard: {
    loadFailed: 'errors.therapistDashboard.loadFailed',
    worklistLoadFailed: 'errors.therapistDashboard.worklistLoadFailed',
    kpiLoadFailed: 'errors.therapistDashboard.kpiLoadFailed',
    featureNotAvailable: 'errors.therapistDashboard.featureNotAvailable',
  },
} as const;

// Type helper for error token keys
export type ErrorTokenKey = string;

export default ErrorTokens;
