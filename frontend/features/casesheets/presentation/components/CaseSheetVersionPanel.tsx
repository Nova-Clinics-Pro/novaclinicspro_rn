import React, { useState } from 'react';
import { useAmendCasesheetMutation, useCasesheetVersionQuery, useCasesheetVersionsQuery, usePrintCasesheetVersionMutation } from '../../data/repositories/casesheets.repository.impl';
import { LivingDocumentVersionHistory } from '../../../livingDocuments/presentation/components/LivingDocumentVersionHistory';

export const CaseSheetVersionPanel: React.FC<{ tenantId: string; casesheetId: string; signed: boolean; canAmend: boolean; onAmended: () => void }> = ({ tenantId, casesheetId, signed, canAmend, onAmended }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const versions = useCasesheetVersionsQuery(tenantId, casesheetId);
  const snapshot = useCasesheetVersionQuery(tenantId, casesheetId, selected);
  const amend = useAmendCasesheetMutation(tenantId, casesheetId);
  const print = usePrintCasesheetVersionMutation(tenantId, casesheetId);
  return <LivingDocumentVersionHistory versions={versions.data?.versions} isLoading={versions.isLoading} isError={versions.isError} selectedVersionId={selected} onSelectVersion={(id) => setSelected(id || null)} selectedSnapshot={snapshot.data as unknown as Record<string, unknown> | undefined} isSnapshotLoading={snapshot.isLoading} isSnapshotError={snapshot.isError} onPrintVersion={(id) => print.mutateAsync(id)} canAmend={signed && canAmend} onAmend={async () => { await amend.mutateAsync(); onAmended(); }} isAmending={amend.isPending} testIDPrefix="casesheet" />;
};
