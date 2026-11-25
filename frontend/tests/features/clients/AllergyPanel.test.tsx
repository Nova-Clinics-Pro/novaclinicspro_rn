import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { AllergyPanel } from '../../../features/clients/presentation/components/AllergyPanel';
import { AllergyStatusBanner } from '../../../features/clients/presentation/components/AllergyStatusBanner';
import { AllergyError } from '../../../features/clients/domain/clientAllergies';
import { changeLanguage } from '../../../core/localization/i18n';

let mockQuery: any;
const mockAdd = jest.fn(); const mockChange = jest.fn(); const mockConfirm = jest.fn();
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('../../../features/clients/data/repositories/clientAllergies.repository.impl', () => ({
  useClientAllergiesQuery: () => mockQuery,
  useAddAllergyMutation: () => ({ mutateAsync: mockAdd, isPending: false }),
  useChangeAllergyMutation: () => ({ mutateAsync: mockChange, isPending: false }),
  useConfirmNoKnownAllergiesMutation: () => ({ mutateAsync: mockConfirm, isPending: false }),
}));

const entry = (id: string, substance: string, over: any = {}) => ({ id, substance, reaction: null, severity: 'severe', status: 'active', created_at: '', updated_at: '', ...over });
const data = (status: string, items: any[] = []) => ({ data: { client_id: 'c1', status, items }, isLoading: false, isError: false, refetch: jest.fn() });

beforeEach(() => { changeLanguage('en-US'); mockAdd.mockReset(); mockChange.mockReset(); mockConfirm.mockReset(); });

describe('the allergy status banner', () => {
  it('says "not recorded" and tells the clinician to ask when nobody has recorded anything', () => {
    const view = render(<AllergyStatusBanner allergies={{ client_id: 'c', status: 'unknown', items: [] }} />);
    expect(view.getByTestId('allergy-banner-status').props.children).toBe('Not recorded');
    expect(view.getByText(/Ask the patient before prescribing/)).toBeTruthy();
  });

  it('says "no known allergies" only when somebody confirmed it', () => {
    const view = render(<AllergyStatusBanner allergies={{ client_id: 'c', status: 'none_known', items: [] }} />);
    expect(view.getByTestId('allergy-banner-status').props.children).toBe('No known allergies');
  });

  it('lists the active allergies and not the resolved ones', () => {
    const view = render(<AllergyStatusBanner allergies={{ client_id: 'c', status: 'has_allergies', items: [entry('1', 'Penicillin'), entry('2', 'Peanut', { status: 'resolved' })] }} />);
    expect(view.getByTestId('allergy-banner-status').props.children).toBe('Allergic to: Penicillin');
  });

  it('never shows an empty list as a good sign: a has_allergies status with nothing active reads as not recorded', () => {
    const view = render(<AllergyStatusBanner allergies={{ client_id: 'c', status: 'has_allergies', items: [entry('2', 'Peanut', { status: 'resolved' })] }} />);
    expect(view.getByTestId('allergy-banner-status').props.children).toBe('Not recorded');
  });

  it('renders nothing before the allergies are known', () => {
    expect(render(<AllergyStatusBanner allergies={undefined} />).toJSON()).toBeNull();
  });
});

describe('the allergy panel', () => {
  it('records an allergy with its reaction and severity and clears the form', async () => {
    mockQuery = data('unknown');
    mockAdd.mockResolvedValue({});
    const view = render(<AllergyPanel tenantId="t" clientId="c1" canManage />);
    expect(view.getByTestId('allergy-save').props.accessibilityState?.disabled ?? view.getByTestId('allergy-save').props.disabled).toBeTruthy();
    fireEvent.changeText(view.getByTestId('allergy-substance-input'), 'Penicillin');
    fireEvent.changeText(view.getByTestId('allergy-reaction-input'), ' rash ');
    fireEvent.press(view.getByTestId('allergy-severity-severe'));
    fireEvent.press(view.getByTestId('allergy-save'));
    await waitFor(() => expect(mockAdd).toHaveBeenCalledWith({ substance: 'Penicillin', reaction: 'rash', severity: 'severe' }));
    await waitFor(() => expect(view.getByTestId('allergy-substance-input').props.value).toBe(''));
  });

  it('shows the server refusal in words, not a code', async () => {
    mockQuery = data('has_allergies', [entry('1', 'Penicillin')]);
    mockAdd.mockRejectedValue(new AllergyError('ALLERGY_ALREADY_RECORDED'));
    const view = render(<AllergyPanel tenantId="t" clientId="c1" canManage />);
    fireEvent.changeText(view.getByTestId('allergy-substance-input'), 'penicillin');
    fireEvent.press(view.getByTestId('allergy-save'));
    await waitFor(() => expect(view.getByTestId('allergy-error').props.children).toBe('That allergy is already recorded.'));
  });

  it('resolves an active allergy and can bring a resolved one back', async () => {
    mockQuery = data('has_allergies', [entry('1', 'Penicillin'), entry('2', 'Peanut', { status: 'resolved' })]);
    mockChange.mockResolvedValue({});
    const view = render(<AllergyPanel tenantId="t" clientId="c1" canManage />);
    fireEvent.press(view.getByTestId('allergy-toggle-1'));
    await waitFor(() => expect(mockChange).toHaveBeenCalledWith({ id: '1', changes: { status: 'resolved' } }));
    fireEvent.press(view.getByTestId('allergy-toggle-2'));
    await waitFor(() => expect(mockChange).toHaveBeenCalledWith({ id: '2', changes: { status: 'active' } }));
  });

  it('offers "confirm no known allergies" only while nothing is recorded', async () => {
    mockQuery = data('unknown');
    mockConfirm.mockResolvedValue({});
    const view = render(<AllergyPanel tenantId="t" clientId="c1" canManage />);
    fireEvent.press(view.getByTestId('allergy-confirm-none'));
    await waitFor(() => expect(mockConfirm).toHaveBeenCalled());
    mockQuery = data('none_known');
    expect(render(<AllergyPanel tenantId="t" clientId="c1" canManage />).queryByTestId('allergy-confirm-none')).toBeNull();
    mockQuery = data('has_allergies', [entry('1', 'Penicillin')]);
    expect(render(<AllergyPanel tenantId="t" clientId="c1" canManage />).queryByTestId('allergy-confirm-none')).toBeNull();
  });

  it('is read-only without the permission: the list shows, no form and no buttons', () => {
    mockQuery = data('has_allergies', [entry('1', 'Penicillin')]);
    const view = render(<AllergyPanel tenantId="t" clientId="c1" canManage={false} />);
    expect(view.getByTestId('allergy-1')).toBeTruthy();
    for (const id of ['allergy-save', 'allergy-substance-input', 'allergy-toggle-1', 'allergy-confirm-none']) expect(view.queryByTestId(id)).toBeNull();
  });

  it('has loading and error states, and the error offers a retry', () => {
    mockQuery = { isLoading: true, isError: false };
    expect(render(<AllergyPanel tenantId="t" clientId="c1" canManage />).getByTestId('allergies-loading')).toBeTruthy();
    const refetch = jest.fn();
    mockQuery = { isLoading: false, isError: true, refetch };
    const view = render(<AllergyPanel tenantId="t" clientId="c1" canManage />);
    fireEvent.press(view.getByTestId('allergies-retry'));
    expect(refetch).toHaveBeenCalled();
  });

  it('says in Hindi too', () => {
    changeLanguage('hi-IN');
    mockQuery = data('unknown');
    const view = render(<AllergyPanel tenantId="t" clientId="c1" canManage />);
    expect(view.getByTestId('allergy-banner-status').props.children).toBe('दर्ज नहीं');
  });
});
