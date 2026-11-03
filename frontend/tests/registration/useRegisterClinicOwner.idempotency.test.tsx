import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useRegisterClinicOwner } from '../../features/registration/presentation/hooks/useRegisterClinicOwner';
import { registrationRepository } from '../../features/registration/data/repositories/registration.repository.impl';

jest.mock('../../features/registration/data/repositories/registration.repository.impl', () => ({
  registrationRepository: { registerClinicOwner: jest.fn(), getRegistrationStatus: jest.fn() },
}));

const register = registrationRepository.registerClinicOwner as jest.Mock;
const payload = { email: 'owner@example.test', password: 'synthetic-password', full_name: 'Synthetic Owner' } as any;

const mount = () => {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return renderHook(() => useRegisterClinicOwner(), { wrapper });
};
const submit = async (hook: ReturnType<typeof mount>, request: any) => {
  await act(async () => { await hook.result.current.mutateAsync(request).catch(() => undefined); });
};

beforeEach(() => register.mockReset());

describe('useRegisterClinicOwner Idempotency-Key reuse', () => {
  it('reuses the key when the same payload is resubmitted after a failure', async () => {
    register.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({ success: true });
    const hook = mount();

    await submit(hook, payload);
    await submit(hook, { ...payload });

    const keys = register.mock.calls.map(call => call[1]);
    expect(keys[0]).toEqual(expect.any(String));
    expect(keys[1]).toBe(keys[0]);
  });

  it('uses a new key when the payload was edited between attempts', async () => {
    register.mockRejectedValue(new Error('network'));
    const hook = mount();

    await submit(hook, payload);
    await submit(hook, { ...payload, full_name: 'Edited Synthetic Owner' });

    expect(register.mock.calls[1][1]).not.toBe(register.mock.calls[0][1]);
  });

  it('uses a new key for a later attempt after a successful registration', async () => {
    register.mockResolvedValue({ success: true });
    const hook = mount();

    await submit(hook, payload);
    await submit(hook, payload);

    expect(register.mock.calls[1][1]).not.toBe(register.mock.calls[0][1]);
  });

  it('does not share a key between two screen instances', async () => {
    register.mockRejectedValue(new Error('network'));
    const first = mount();
    const second = mount();

    await submit(first, payload);
    await submit(second, payload);

    expect(register.mock.calls[1][1]).not.toBe(register.mock.calls[0][1]);
  });
});
