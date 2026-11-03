/**
 * Idempotency-Key lifecycle for clinic-owner registration.
 *
 * Backend contract (public_registration_service): the key is scoped to the registrant's
 * normalized email and the operation, must be non-empty and at most 255 characters, and is
 * bound to a fingerprint of the FULL request payload. Replaying the same key with the same
 * payload is safe (a completed registration is replayed, a retryable failure is reclaimed);
 * the same key with a different payload is rejected with 409.
 *
 * Therefore one key identifies one logical attempt = one exact payload:
 * - a retry of the same payload reuses the key;
 * - any change to the payload starts a new logical attempt with a new key;
 * - a successful registration ends the attempt, so a later submission gets a new key.
 * The key is an identifier, not a secret.
 */

export const MAX_IDEMPOTENCY_KEY_LENGTH = 255;

export const createRegistrationAttemptKey = (): string => {
  const cryptoRandomUUID = globalThis.crypto?.randomUUID;
  if (cryptoRandomUUID) return cryptoRandomUUID.call(globalThis.crypto);
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, character => {
    const random = Math.floor(Math.random() * 16);
    return (character === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });
};

const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .filter(key => record[key] !== undefined)
      .sort()
      .map(key => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
};

export interface RegistrationAttemptKeyStore {
  /** Key for this exact payload: reused while the payload is unchanged, new when it changes. */
  keyFor(payload: unknown): string;
  /** Ends the current logical attempt (call after a successful registration). */
  complete(): void;
}

export const createRegistrationAttemptKeyStore = (
  generate: () => string = createRegistrationAttemptKey
): RegistrationAttemptKeyStore => {
  let current: { fingerprint: string; key: string } | null = null;
  return {
    keyFor(payload) {
      const fingerprint = stableStringify(payload);
      if (!current || current.fingerprint !== fingerprint) {
        current = { fingerprint, key: generate() };
      }
      return current.key;
    },
    complete() {
      current = null;
    },
  };
};
