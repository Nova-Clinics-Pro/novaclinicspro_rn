/**
 * Which appointment actions to offer, from the user's effective permissions.
 *
 * The backend is authoritative and enforces: changing/rescheduling/status updates -> `appointment.update`,
 * cancelling -> `appointment.cancel`. Offering actions from a list of role NAMES hid them from the Clinic Owner
 * (whose role name was not in the list). `/auth/me` returns the effective permissions from the database.
 */
export interface AppointmentActionAccess {
  /** Reschedule, confirm, mark visit/no-show (backend: appointment.update). */
  canUpdate: boolean;
  /** Cancel (backend: appointment.cancel). */
  canCancel: boolean;
  /** Message the client about the appointment: follows the right to change it. */
  canNotifyClient: boolean;
  /** See the client's phone number to call them (backend: client.read). */
  canCallClient: boolean;
}

export const appointmentActionAccess = (permissions: readonly string[] | null | undefined): AppointmentActionAccess => {
  const granted = new Set(permissions ?? []);
  const canUpdate = granted.has('appointment.update');
  return {
    canUpdate,
    canCancel: granted.has('appointment.cancel'),
    canNotifyClient: canUpdate,
    canCallClient: granted.has('client.read'),
  };
};
