/** Shared contracts for scenarios and results. Scenario files describe WHAT, never HOW. */

export type Platform = 'web' | 'android' | 'backend' | 'manual-android';
export type Applicability = 'full' | 'representative' | 'backend-only' | 'not-applicable' | 'limited';
export type Status = 'Pass' | 'Fail' | 'Blocked' | 'Not Applicable' | 'Not Run';
export type Severity = 'Critical' | 'High' | 'Medium' | 'Low';
export type ClinicType = 'ayurveda' | 'general';
export type Track = 'WEB' | 'MAESTRO' | 'ANDROID';

export interface ScenarioSpec {
  id: string; // NC-UAT-01 ... NC-UAT-18
  name: string;
  group: 'core' | 'specialty-therapy';
  objective: string;
  clinicTypes: ClinicType[];
  roles: string[];
  preconditions: string[];
  testData: string[];
  expectedOutcomes: string[];
  authorization: string[];
  persistence: string[];
  platforms: Record<'web' | 'android' | 'backend' | 'manual-android', { applicability: Applicability; note?: string }>;
  relatedBackendTests: string[];
  severityIfFails: Severity;
  dependsOn: string[];
  productRuleGaps?: string[];
}

export interface ScenarioResult {
  scenarioId: string;
  runId: string;
  platform: Platform;
  track: Track | 'BACKEND' | 'MANUAL';
  clinicType: ClinicType | 'n/a';
  role: string;
  startedAt: string;
  completedAt: string;
  status: Status;
  expected: string;
  actual: string;
  issueId?: string;
  severity?: Severity;
  reproduction?: string[];
  evidence: { screenshots: string[]; traces: string[]; videos: string[]; apiEvidence: string[]; other: string[] };
  retestStatus?: 'not-required' | 'pending' | 'passed' | 'failed';
  limitation?: { exact: string; alternative: string; manualRequired: boolean };
}
