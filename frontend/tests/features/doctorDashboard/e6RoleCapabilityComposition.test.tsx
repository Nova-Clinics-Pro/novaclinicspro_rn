import React from 'react';
import { render } from '@testing-library/react-native';
import { cosPresentationConfigByRole, resolveCosPresentationConfig } from '../../../features/episodes/presentation/config/episodeWorkspaceConfig';
import { CapabilityLossPanel } from '../../../features/episodes/presentation/components/CapabilityLossPanel';

let mockWorkflow: any;
jest.mock('../../../core/theme/useClinicTheme', () => ({ useClinicTheme: () => ({ colors: { surface: { default: '#fff' }, border: { default: '#ddd' }, text: { secondary: '#555' } }, spacing: { md: 16, xs: 4 }, typography: { body2: {} }, radii: { medium: 8 }, borderWidths: { default: 1 } }) }));
jest.mock('../../../features/episodes/data/repositories/clinicalWorkflow.repository.impl', () => ({ useClinicalWorkflowQuery: () => ({ data: mockWorkflow }) }));

describe('T-FE-E.6 role/capability composition', () => {
  it.each([
    ['Doctor', 'doctor', 'clinical'], ['Assistant Doctor', 'assistant_doctor', 'clinical'], ['Admin', 'admin', 'operations'],
    ['Front desk', 'front_desk', 'operations'], ['Therapist', 'therapist', 'therapy'],
  ])('resolves %s as presentation-only config', (_label, role, emphasis) => {
    const resolved = resolveCosPresentationConfig([role]);
    expect(resolved.roles).toEqual([role]);
    expect(resolved.config?.emphasis).toBe(emphasis);
    expect(Object.keys(resolved.config ?? {})).toEqual(expect.arrayContaining(['labelKey', 'emphasis']));
    expect(JSON.stringify(resolved.config)).not.toMatch(/can(Edit|Sign|Amend|Create|Schedule)/);
  });

  it('keeps unknown and multi-role users neutral rather than making role authorization decisions', () => {
    expect(resolveCosPresentationConfig(['custom_clinician']).config).toBeNull();
    expect(resolveCosPresentationConfig(['doctor', 'therapist']).config).toBeNull();
    expect(Object.keys(cosPresentationConfigByRole)).toHaveLength(5);
  });

  it('keeps role presentation at the COS shell while permission-driven modules receive no role authority', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path');
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../../features/episodes/presentation/pages/VisitCommandCenter.tsx'),
      'utf8',
    );

    expect(source).toContain('<CaseSheetModule ref={caseSheetRef} expandedSections={expandedSections} onToggleSection={toggleSection} permissions={permissions} />');
    expect(source).toContain('<PrescriptionModule expandedSections={expandedSections} onToggleSection={toggleSection} permissions={permissions} />');
    expect(source).not.toMatch(/<(CaseSheetModule|PrescriptionModule|TreatmentPlanModule|SchedulingModule|BillingStage)[^>]*roles=/);
    expect(source).not.toMatch(/DoctorVisitCommandCenter|AdminVisitCommandCenter|TherapistVisitCommandCenter/);
  });

  it('renders each backend capability-loss code and backend waiting ownership without deriving policy', () => {
    mockWorkflow = { capability_loss: [
      { code: 'capability_unavailable_for_new_work', capability_code: 'treatment.physiotherapy', stage: 'treatment_recommendation' },
      { code: 'active_care_continuation_allowed', capability_code: 'treatment.physiotherapy', stage: 'treatment_recommendation' },
      { code: 'capability_unavailable_for_expansion', capability_code: 'treatment.physiotherapy', stage: 'treatment_recommendation' },
      { code: 'historical_read_allowed', capability_code: 'treatment.physiotherapy', stage: null },
    ], waiting_role: 'treatment_order.schedule' };
    const ui = render(<CapabilityLossPanel tenantId="tenant" clientId="client" episodeId="episode" appointmentId="appointment" />);
    expect(ui.getByTestId('capability-loss-capability_unavailable_for_new_work')).toBeTruthy();
    expect(ui.getByTestId('capability-loss-active_care_continuation_allowed')).toBeTruthy();
    expect(ui.getByTestId('capability-loss-capability_unavailable_for_expansion')).toBeTruthy();
    expect(ui.getByTestId('capability-loss-historical_read_allowed')).toBeTruthy();
    expect(ui.getByTestId('capability-loss-waiting-owner')).toBeTruthy();
  });
});
