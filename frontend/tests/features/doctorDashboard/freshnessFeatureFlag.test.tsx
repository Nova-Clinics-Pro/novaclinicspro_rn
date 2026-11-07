/**
 * Phase 1 · T-A.6 (ADR-P1-01, FR-A6, RB-1) — consultation.tsx conditionally
 * restores the old key={episodeId:appointmentId} remount when the freshness
 * flag is OFF, and omits it when ON — verified via source inspection (same
 * established technique as T-0.5/T-0.7/T-E.1, since testing an actual React
 * `key` prop's presence through rendering doesn't reliably expose it).
 *
 * R3A · T-B.1/T-B.2/T-B.3: the flag-OFF invalidation-skipped tests this file
 * used to have (casesheet, prescription, treatment recommendation) all
 * moved to caseSheetModule.test.tsx / prescriptionModule.test.tsx /
 * treatmentRecommendationModule.test.tsx respectively — each module now
 * verifies its own flag-OFF behavior directly. This file keeps only the
 * source-inspection coverage, which isn't owned by any one module.
 */
import fs from 'fs';
import path from 'path';

describe('consultation.tsx conditional remount (T-A.6, RB-1, source inspection)', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../../../app/clinic-admin/episodes/[episodeId]/consultation.tsx'),
    'utf8'
  );

  it('reads the freshness flag via useFeatures/isFreshnessV1Enabled', () => {
    expect(source).toContain("import { useFeatures, isCosV1Enabled, isFreshnessV1Enabled } from '../../../../core/hooks/useFeatures';");
    expect(source).toContain('const features = useFeatures();');
    expect(source).toContain('const freshnessEnabled = isFreshnessV1Enabled(features);');
  });

  it('the key prop is undefined (no forced remount) when the flag is ON, and the old episode:appointment key when OFF', () => {
    expect(source).toContain('key={freshnessEnabled ? undefined : `${episodeId}:${appointmentId}`}');
  });
});
