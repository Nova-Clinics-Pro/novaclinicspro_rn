import { AxiosError } from 'axios';
import { normalizePrescriptionUpdateError } from '../../../features/prescriptions/data/datasources/prescriptions.api';

jest.mock('../../../core/api/axiosClient', () => ({ axiosClient: {} }));

const refusal = (status: number, data: unknown) => {
  const error = new AxiosError('failed');
  error.response = { status, data } as never;
  return error;
};
const alerts = [{ allergy_id: 'a', substance: 'Penicillin', severity: 'severe', reaction: null, medicine: 'Penicillin V' }];

describe('what a failed prescription update means', () => {
  it('an allergy alert (also a 409) reaches the doctor as an alert with its medicines, not as "already finalized"', () => {
    const failure = normalizePrescriptionUpdateError(refusal(409, { detail: { error_code: 'ALLERGY_ALERT', message: 'm', alerts } }));
    expect(failure.kind).toBe('ALLERGY_ALERT');
    expect(failure.alerts).toEqual(alerts);
  });

  it('any other 409 is still "finalized", a 403 is still "permission denied", anything else "save failed"', () => {
    expect(normalizePrescriptionUpdateError(refusal(409, { detail: 'conflict' })).kind).toBe('FINALIZED');
    expect(normalizePrescriptionUpdateError(refusal(409, { detail: { error_code: 'OTHER', alerts } })).kind).toBe('FINALIZED');
    expect(normalizePrescriptionUpdateError(refusal(403, {})).kind).toBe('PERMISSION_DENIED');
    expect(normalizePrescriptionUpdateError(refusal(500, {})).kind).toBe('SAVE_FAILED');
    expect(normalizePrescriptionUpdateError(new Error('network')).kind).toBe('SAVE_FAILED');
  });
});
