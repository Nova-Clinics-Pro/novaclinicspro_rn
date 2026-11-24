import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { DispenseScreen } from '../../../features/dispensing/presentation/pages/DispenseScreen';
import { ReadyToDispenseScreen } from '../../../features/dispensing/presentation/pages/ReadyToDispenseScreen';
import { DispenseAction } from '../../../features/dispensing/presentation/components/DispenseAction';
import { DispensingError } from '../../../features/dispensing/domain/dispensingError';
import { changeLanguage } from '../../../core/localization/i18n';

const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockPermissions: string[] = ['prescription.dispense', 'invoice.collect_payment', 'invoice.read'];
let mockPrescription: any; let mockStock: any; let mockStatus: any; let mockQueue: any;
const mockDispense = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }), useLocalSearchParams: () => ({ prescriptionId: 'rx1' }) }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }: any) => children }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('../../../features/auth/presentation/hooks/useAuth', () => ({ useAuth: () => ({ currentUser: { tenantId: 't1', permissions: mockPermissions } }) }));
jest.mock('../../../features/prescriptions/data/repositories/prescriptions.repository.impl', () => ({ usePrescriptionDetailQuery: () => mockPrescription }));
jest.mock('../../../features/dispensing/data/repositories/dispensing.repository.impl', () => ({
  useDispensingStatusQuery: () => mockStatus,
  useDispensingStockQuery: () => mockStock,
  useReadyToDispenseQuery: () => mockQueue,
  useDispenseMutation: () => ({ mutateAsync: mockDispense, isPending: false }),
}));

const item = (id: string, name: string, stock: string, price: number) => ({ id, name, current_stock: stock, price, gst_percentage: 0, unit: 'pcs' });
const signed = (medications: any[]) => ({ data: { status: 'SIGNED', prescription_data: { medications } }, isLoading: false });

describe('the dispense screen', () => {
  beforeEach(() => {
    changeLanguage('en-US'); mockPush.mockClear(); mockReplace.mockClear(); mockDispense.mockReset();
    mockPermissions = ['prescription.dispense', 'invoice.collect_payment', 'invoice.read'];
    mockPrescription = signed([{ name: 'COP Tablet X' }, { name: 'Sesame oil' }]);
    mockStock = { data: [item('a', 'COP Tablet X', '10', 20), item('b', 'Sesame oil', '500', 2), item('c', 'Sesame oil (Kerala)', '5', 3)], isLoading: false };
    mockStatus = { data: { dispensed: false } };
  });

  it('suggests the stock item of an exact name, leaves an ambiguous one for the person, and sends only what was chosen', async () => {
    mockStock = { data: [item('a', 'COP Tablet X', '10', 20), item('b', 'Sesame', '500', 2), item('c', 'Sesame oil (Kerala)', '5', 3)], isLoading: false };
    const view = render(<DispenseScreen />);
    expect(view.getByTestId('dispense-pick-0').findByProps({ children: 'COP Tablet X' })).toBeTruthy();         // exact name: suggested
    expect(view.getByTestId('dispense-pick-1').findByProps({ children: 'Choose a stock item' })).toBeTruthy();   // two items fit: left to the person
    fireEvent.changeText(view.getByTestId('dispense-quantity-0'), '2');
    mockDispense.mockResolvedValueOnce({ id: 'inv1', invoice_number: 'RX-abc' });
    fireEvent.press(view.getByTestId('dispense-confirm'));
    await waitFor(() => expect(mockDispense).toHaveBeenCalledWith([{ inventory_item_id: 'a', quantity: '2' }]));
    await waitFor(() => expect(view.getByTestId('dispense-done-title')).toBeTruthy());
  });

  it('the person can pick the stock item for a medicine themselves', async () => {
    mockPrescription = signed([{ name: 'Mystery herb' }]);
    const view = render(<DispenseScreen />);
    fireEvent.press(view.getByTestId('dispense-pick-0'));
    fireEvent.changeText(view.getByTestId('dispense-search-0'), 'kerala');
    fireEvent.press(view.getByTestId('dispense-option-0-c'));
    fireEvent.changeText(view.getByTestId('dispense-quantity-0'), '3');
    mockDispense.mockResolvedValueOnce({ id: 'inv1', invoice_number: 'RX-abc' });
    fireEvent.press(view.getByTestId('dispense-confirm'));
    await waitFor(() => expect(mockDispense).toHaveBeenCalledWith([{ inventory_item_id: 'c', quantity: '3' }]));
  });

  it('asks for at least one item and quantity before sending anything', () => {
    const view = render(<DispenseScreen />);
    fireEvent.press(view.getByTestId('dispense-confirm'));
    expect(view.getByTestId('dispense-error').props.children).toBe('Choose at least one stock item and a quantity.');
    expect(mockDispense).not.toHaveBeenCalled();
  });

  it('refuses a quantity above the stock on hand and does not allow dispensing it', () => {
    const view = render(<DispenseScreen />);
    fireEvent.changeText(view.getByTestId('dispense-quantity-0'), '11');
    expect(view.getByTestId('dispense-over-0')).toBeTruthy();
    fireEvent.press(view.getByTestId('dispense-confirm'));
    expect(mockDispense).not.toHaveBeenCalled();
  });

  it('shows the estimate and explains a refusal from the server in words', async () => {
    const view = render(<DispenseScreen />);
    fireEvent.changeText(view.getByTestId('dispense-quantity-0'), '2');
    expect(view.getByTestId('dispense-estimate').props.children).toBe('40.00');
    mockDispense.mockRejectedValueOnce(new DispensingError('INSUFFICIENT_INVENTORY', { available: '1', requested: '2' }));
    fireEvent.press(view.getByTestId('dispense-confirm'));
    await waitFor(() => expect(view.getByTestId('dispense-error').props.children).toBe('There is not enough stock: 1 available, 2 asked for.'));
  });

  it('after dispensing it offers to take payment for someone who may, and a pharmacist is told to ask the desk', async () => {
    mockDispense.mockResolvedValue({ id: 'inv1', invoice_number: 'RX-abc' });
    let view = render(<DispenseScreen />);
    fireEvent.changeText(view.getByTestId('dispense-quantity-0'), '1');
    fireEvent.press(view.getByTestId('dispense-confirm'));
    await waitFor(() => expect(view.getByTestId('dispense-collect')).toBeTruthy());
    fireEvent.press(view.getByTestId('dispense-collect'));
    expect(mockPush).toHaveBeenCalledWith('/clinic-admin/billing/invoices/inv1');
    mockPermissions = ['prescription.dispense'];
    view = render(<DispenseScreen />);
    fireEvent.changeText(view.getAllByTestId('dispense-quantity-0')[0], '1');
    fireEvent.press(view.getAllByTestId('dispense-confirm')[0]);
    await waitFor(() => expect(view.getAllByTestId('dispense-done-title').length).toBeGreaterThan(0));
    expect(view.queryByTestId('dispense-collect')).toBeNull();
  });

  it('an already dispensed prescription says so instead of offering the form', () => {
    mockStatus = { data: { dispensed: true, invoice_id: 'inv9', invoice_number: 'RX-old' } };
    const view = render(<DispenseScreen />);
    expect(view.getByTestId('dispense-done-title').props.children).toBe('This prescription has already been dispensed.');
    expect(view.queryByTestId('dispense-confirm')).toBeNull();
  });

  it('is closed to someone without the permission, and an unsigned prescription is not dispensable', () => {
    mockPermissions = ['prescription.read'];
    expect(render(<DispenseScreen />).getByTestId('dispense-no-access')).toBeTruthy();
    mockPermissions = ['prescription.dispense'];
    mockPrescription = { data: { status: 'DRAFT', prescription_data: { medications: [{ name: 'X' }] } }, isLoading: false };
    const view = render(<DispenseScreen />);
    expect(view.getByTestId('dispense-not-signed')).toBeTruthy();
    expect(view.queryByTestId('dispense-confirm')).toBeNull();
  });

  it('when the stock cannot be loaded it says so with a retry and offers no form that could not suggest anything', () => {
    const refetch = jest.fn();
    mockStock = { data: undefined, isLoading: false, isError: true, refetch };
    const view = render(<DispenseScreen />);
    expect(view.getByTestId('dispense-stock-error')).toBeTruthy();
    expect(view.queryByTestId('dispense-confirm')).toBeNull();
    fireEvent.press(view.getByTestId('dispense-stock-retry'));
    expect(refetch).toHaveBeenCalled();
  });

  it('is available in Hindi', () => {
    changeLanguage('hi-IN');
    expect(render(<DispenseScreen />).getByText('दवाइयाँ दें')).toBeTruthy();
  });
});

describe('the dispensing queue and the action on a prescription', () => {
  beforeEach(() => { changeLanguage('en-US'); mockPush.mockClear(); mockPermissions = ['prescription.dispense', 'invoice.read']; });

  it('lists the waiting prescriptions and opens one', () => {
    mockQueue = { data: [{ prescription_id: 'rx1', client_name: 'Maya Rao', doctor_name: 'Dr. Rao', signed_at: '2026-11-20T10:00:00Z', medicines: ['COP Tablet X', 'Oil'] }], isLoading: false, isFetching: false, refetch: jest.fn() };
    const view = render(<ReadyToDispenseScreen />);
    expect(view.getByText('Maya Rao')).toBeTruthy();
    expect(view.getByText('COP Tablet X, Oil')).toBeTruthy();
    fireEvent.press(view.getByTestId('queue-item-rx1'));
    expect(mockPush).toHaveBeenCalledWith('/clinic-admin/dispensing/rx1');
  });

  it('says so when nothing is waiting, and is closed without the permission', () => {
    mockQueue = { data: [], isLoading: false, isFetching: false, refetch: jest.fn() };
    expect(render(<ReadyToDispenseScreen />).getByTestId('queue-empty')).toBeTruthy();
    mockPermissions = ['prescription.read'];
    expect(render(<ReadyToDispenseScreen />).getByTestId('queue-no-access')).toBeTruthy();
  });

  it('a signed prescription offers Dispense, and a dispensed one links to its bill', () => {
    mockStatus = { data: { dispensed: false } };
    let view = render(<DispenseAction prescriptionId="rx1" status="SIGNED" />);
    fireEvent.press(view.getByTestId('dispense-action'));
    expect(mockPush).toHaveBeenCalledWith('/clinic-admin/dispensing/rx1');
    mockStatus = { data: { dispensed: true, invoice_id: 'inv1' } };
    view = render(<DispenseAction prescriptionId="rx1" status="SIGNED" />);
    fireEvent.press(view.getByTestId('dispense-view-bill'));
    expect(mockPush).toHaveBeenCalledWith('/clinic-admin/billing/invoices/inv1');
  });

  it('shows nothing for an unsigned prescription or for someone who may not dispense', () => {
    mockStatus = { data: { dispensed: false } };
    expect(render(<DispenseAction prescriptionId="rx1" status="DRAFT" />).toJSON()).toBeNull();
    mockPermissions = ['prescription.read'];
    expect(render(<DispenseAction prescriptionId="rx1" status="SIGNED" />).toJSON()).toBeNull();
  });
});
