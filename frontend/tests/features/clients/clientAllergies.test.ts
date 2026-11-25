import { activeAllergies, allergyAlertsFrom, type Allergy } from '../../../features/clients/domain/clientAllergies';

const entry = (over: Partial<Allergy>): Allergy => ({
  id: '1', substance: 'Penicillin', reaction: null, severity: 'severe', status: 'active', created_at: '', updated_at: '', ...over,
});

describe('client allergies (domain)', () => {
  it('keeps only the active entries', () => {
    expect(activeAllergies([entry({ id: 'a' }), entry({ id: 'b', status: 'resolved' })]).map((e) => e.id)).toEqual(['a']);
    expect(activeAllergies([])).toEqual([]);
  });

  it('reads the alerts of a refused signing and ignores any other failure', () => {
    const alerts = [{ allergy_id: 'x', substance: 'Penicillin', severity: 'severe', reaction: null, medicine: 'Penicillin V' }];
    expect(allergyAlertsFrom({ response: { data: { detail: { error_code: 'ALLERGY_ALERT', alerts } } } })).toEqual(alerts);
    expect(allergyAlertsFrom({ response: { data: { detail: { error_code: 'OTHER', alerts } } } })).toBeNull();
    expect(allergyAlertsFrom({ response: { data: { detail: 'plain text' } } })).toBeNull();
    expect(allergyAlertsFrom({ response: { data: { detail: { error_code: 'ALLERGY_ALERT' } } } })).toBeNull();
    expect(allergyAlertsFrom(new Error('network'))).toBeNull();
    expect(allergyAlertsFrom(undefined)).toBeNull();
  });
});
