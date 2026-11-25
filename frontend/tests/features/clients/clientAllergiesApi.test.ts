import { axiosClient } from '../../../core/api/axiosClient';
import { addAllergyApi, changeAllergyApi, checkAllergiesApi, confirmNoKnownAllergiesApi, getClientAllergiesApi } from '../../../features/clients/data/datasources/clientAllergies.api';
import { AllergyError } from '../../../features/clients/domain/clientAllergies';

jest.mock('../../../core/api/axiosClient', () => ({ axiosClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), put: jest.fn() } }));
const mockAxios = axiosClient as unknown as Record<'get' | 'post' | 'patch' | 'put', jest.Mock>;
const base = '/api/v1/clinic/T/clients/C/allergies';

beforeEach(() => Object.values(mockAxios).forEach((m) => m.mockReset()));

describe('client allergies API', () => {
  it('reads, adds, corrects, confirms and checks on the clinic-scoped routes', async () => {
    mockAxios.get.mockResolvedValue({ data: { client_id: 'C', status: 'unknown', items: [] } });
    expect((await getClientAllergiesApi('T', 'C')).status).toBe('unknown');
    expect(mockAxios.get).toHaveBeenCalledWith(base);

    mockAxios.post.mockResolvedValue({ data: { id: 'a' } });
    await addAllergyApi('T', 'C', { substance: 'Peanut', severity: 'mild' });
    expect(mockAxios.post).toHaveBeenCalledWith(base, { substance: 'Peanut', severity: 'mild' });

    mockAxios.patch.mockResolvedValue({ data: { id: 'a' } });
    await changeAllergyApi('T', 'C', 'a', { status: 'resolved' });
    expect(mockAxios.patch).toHaveBeenCalledWith(`${base}/a`, { status: 'resolved' });

    mockAxios.put.mockResolvedValue({ data: { client_id: 'C', status: 'none_known', items: [] } });
    expect((await confirmNoKnownAllergiesApi('T', 'C')).status).toBe('none_known');
    expect(mockAxios.put).toHaveBeenCalledWith(`${base}/none-known`);

    mockAxios.post.mockResolvedValue({ data: { alerts: [{ medicine: 'X' }] } });
    expect(await checkAllergiesApi('T', 'C', ['X'])).toEqual([{ medicine: 'X' }]);
    expect(mockAxios.post).toHaveBeenLastCalledWith(`${base}/check`, { medicines: ['X'] });
  });

  it.each([
    ['ALLERGY_ALREADY_RECORDED'], ['INVALID_ALLERGY'], ['ALLERGIES_RECORDED'], ['CLIENT_NOT_FOUND'], ['ALLERGY_NOT_FOUND'],
  ])('turns the server code %s into an AllergyError', async (code) => {
    mockAxios.post.mockRejectedValue({ response: { data: { detail: { error_code: code, message: 'm' } } } });
    await expect(addAllergyApi('T', 'C', { substance: 'x' })).rejects.toMatchObject({ code, name: 'AllergyError' });
  });

  it('turns anything else into a plain failure and never leaks the transport text', async () => {
    mockAxios.get.mockRejectedValue(new Error('Request failed with status code 500'));
    await expect(getClientAllergiesApi('T', 'C')).rejects.toBeInstanceOf(AllergyError);
    await expect(getClientAllergiesApi('T', 'C')).rejects.toMatchObject({ code: 'ALLERGY_FAILED', message: 'ALLERGY_FAILED' });
  });
});
