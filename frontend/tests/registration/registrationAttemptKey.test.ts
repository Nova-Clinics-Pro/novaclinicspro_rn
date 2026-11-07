import {
  MAX_IDEMPOTENCY_KEY_LENGTH,
  createRegistrationAttemptKey,
  createRegistrationAttemptKeyStore,
} from '../../features/registration/application/registrationAttemptKey';

const payload = { email: 'owner@example.test', password: 'synthetic-password', business_profile: { business_name: 'Synthetic', tags: ['a', 'b'] } };

describe('registration Idempotency-Key lifecycle', () => {
  it('generates non-empty keys within the backend length limit that differ per call', () => {
    const first = createRegistrationAttemptKey();
    const second = createRegistrationAttemptKey();
    expect(first.length).toBeGreaterThan(0);
    expect(first.length).toBeLessThanOrEqual(MAX_IDEMPOTENCY_KEY_LENGTH);
    expect(first).not.toBe(second);
  });

  it('reuses the key for retries of the same payload, independent of property order', () => {
    const store = createRegistrationAttemptKeyStore();
    const key = store.keyFor(payload);
    expect(store.keyFor({ ...payload })).toBe(key);
    expect(store.keyFor({ business_profile: { tags: ['a', 'b'], business_name: 'Synthetic' }, password: payload.password, email: payload.email })).toBe(key);
  });

  it('starts a new logical attempt when any payload value changes', () => {
    const store = createRegistrationAttemptKeyStore();
    const key = store.keyFor(payload);
    expect(store.keyFor({ ...payload, password: 'a-different-synthetic-password' })).not.toBe(key);
  });

  it('issues a new key after the previous attempt completed, even for an identical payload', () => {
    const store = createRegistrationAttemptKeyStore();
    const key = store.keyFor(payload);
    store.complete();
    expect(store.keyFor(payload)).not.toBe(key);
  });

  it('does not share keys between independent stores', () => {
    expect(createRegistrationAttemptKeyStore().keyFor(payload)).not.toBe(createRegistrationAttemptKeyStore().keyFor(payload));
  });

  it('only generates when a new attempt begins', () => {
    const generate = jest.fn().mockReturnValueOnce('key-1').mockReturnValueOnce('key-2');
    const store = createRegistrationAttemptKeyStore(generate);
    store.keyFor(payload); store.keyFor(payload); store.keyFor(payload);
    expect(generate).toHaveBeenCalledTimes(1);
    store.keyFor({ ...payload, email: 'other@example.test' });
    expect(generate).toHaveBeenCalledTimes(2);
  });
});
