/**
 * Sharing a prescription by WhatsApp, SMS or e-mail is switched off until a delivery provider is connected: until then a share request is
 * only recorded and nothing reaches the patient, which a button must not suggest. The server enforces the same switch
 * (PRESCRIPTION_SHARING_ENABLED), so turning this on without the server being ready only shows a clear refusal.
 */
export const isSharingEnabled = (env: Record<string, string | undefined> = process.env): boolean =>
  env.EXPO_PUBLIC_PRESCRIPTION_SHARING_ENABLED === 'true';
