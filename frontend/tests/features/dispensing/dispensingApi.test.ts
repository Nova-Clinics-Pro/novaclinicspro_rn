import { dispensePrescriptionApi, getDispensingStatusApi, getDispensingStockApi, getReadyToDispenseApi } from '../../../features/dispensing/data/datasources/dispensing.api';
import { DispensingError } from '../../../features/dispensing/domain/dispensingError';
import { dispensingErrorMessage } from '../../../features/dispensing/domain/dispensingErrorMessage';
import { changeLanguage, t } from '../../../core/localization/i18n';
import { axiosClient } from '../../../core/api/axiosClient';

jest.mock('../../../core/api/axiosClient', () => ({ axiosClient: { get: jest.fn(), post: jest.fn() } }));
const get = axiosClient.get as jest.Mock;
const post = axiosClient.post as jest.Mock;
const refuse = (status: number, detail: unknown) => post.mockRejectedValueOnce({ response: { status, data: { detail } } });
const reason = async () => { try { await dispensePrescriptionApi('t1', 'rx1', [{ inventory_item_id: 'a', quantity: '1' }]); } catch (e) { return e as DispensingError; } throw new Error('did not fail'); };

describe('the dispensing calls', () => {
  beforeEach(() => { get.mockReset(); post.mockReset(); changeLanguage('en-US'); });

  it('reads the queue and the status of one prescription', async () => {
    get.mockResolvedValueOnce({ data: { items: [{ prescription_id: 'rx1' }] } });
    expect(await getReadyToDispenseApi('t1')).toEqual([{ prescription_id: 'rx1' }]);
    expect(get).toHaveBeenCalledWith('/api/v1/clinic/t1/dispensing/ready');
    get.mockResolvedValueOnce({ data: { prescription_id: 'rx1', dispensed: false } });
    expect((await getDispensingStatusApi('t1', 'rx1')).dispensed).toBe(false);
    expect(get).toHaveBeenLastCalledWith('/api/v1/clinic/t1/dispensing/prescriptions/rx1');
  });

  it('reads the stock a dispenser can pick from (not the inventory screens, which the front desk cannot open)', async () => {
    get.mockResolvedValueOnce({ data: { items: [{ id: 'a', name: 'COP Tablet X', unit: 'pcs', current_stock: '3', price: 40, gst_percentage: 5 }] } });
    const items = await getDispensingStockApi('t1');
    expect(get).toHaveBeenCalledWith('/api/v1/clinic/t1/dispensing/stock');
    expect(items[0].name).toBe('COP Tablet X');
  });

  it('dispenses with the lines and returns the bill', async () => {
    post.mockResolvedValueOnce({ data: { id: 'inv1', total_amount: '42.00' } });
    const bill = await dispensePrescriptionApi('t1', 'rx1', [{ inventory_item_id: 'a', quantity: '2' }]);
    expect(post).toHaveBeenCalledWith('/api/v1/clinic/t1/prescriptions/rx1/dispense', { lines: [{ inventory_item_id: 'a', quantity: '2' }] });
    expect(bill.id).toBe('inv1');
  });

  it('says in words why a dispensing was refused', async () => {
    refuse(409, { error_code: 'PRESCRIPTION_ALREADY_DISPENSED', message: 'x' });
    let error = await reason(); expect(error.code).toBe('PRESCRIPTION_ALREADY_DISPENSED');
    expect(dispensingErrorMessage(t, error)).toBe('This prescription has already been dispensed.');
    refuse(409, { error_code: 'PRESCRIPTION_NOT_SIGNED' });
    expect(dispensingErrorMessage(t, await reason())).toBe('Only a signed prescription can be dispensed.');
    refuse(400, { error_code: 'INSUFFICIENT_INVENTORY', message: 'x', inventory_item_id: 'a', available: '3', requested: '5' });
    error = await reason();
    expect(error.code).toBe('INSUFFICIENT_INVENTORY');
    expect(dispensingErrorMessage(t, error)).toBe('There is not enough stock: 3 available, 5 asked for.');
    refuse(403, { error_code: 'MISSING_PERMISSION' });
    expect(dispensingErrorMessage(t, await reason())).toBe('You do not have permission to dispense.');
    post.mockRejectedValueOnce(new Error('network'));
    expect(dispensingErrorMessage(t, await reason())).toBe('The prescription could not be dispensed. Please try again.');
  });

  it('is available in Hindi', async () => {
    changeLanguage('hi-IN');
    refuse(409, { error_code: 'PRESCRIPTION_ALREADY_DISPENSED' });
    expect(dispensingErrorMessage(t, await reason())).toMatch(/पहले ही/);
  });
});
