import React, { useState } from 'react';
import { useAmendPrescriptionMutation, usePrescriptionVersionQuery, usePrescriptionVersionsQuery, usePrescriptionVersionPrintMutation } from '../../data/repositories/prescriptions.repository.impl';
import { LivingDocumentVersionHistory } from '../../../livingDocuments/presentation/components/LivingDocumentVersionHistory';

export const PrescriptionVersionPanel: React.FC<{ tenantId: string; prescriptionId: string; signed: boolean; canAmend: boolean; onAmended: () => void }> = ({ tenantId, prescriptionId, signed, canAmend, onAmended }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const versions = usePrescriptionVersionsQuery(tenantId, prescriptionId);
  const snapshot = usePrescriptionVersionQuery(tenantId, prescriptionId, selected);
  const amend = useAmendPrescriptionMutation(tenantId, prescriptionId);
  const print = usePrescriptionVersionPrintMutation(tenantId, prescriptionId);
  return <LivingDocumentVersionHistory versions={versions.data?.versions} isLoading={versions.isLoading} isError={versions.isError} selectedVersionId={selected} onSelectVersion={(id) => setSelected(id || null)} selectedSnapshot={snapshot.data as unknown as Record<string, unknown> | undefined} isSnapshotLoading={snapshot.isLoading} isSnapshotError={snapshot.isError} onPrintVersion={(id) => print.mutateAsync(id)} canAmend={signed && canAmend} onAmend={async () => { await amend.mutateAsync(); onAmended(); }} isAmending={amend.isPending} testIDPrefix="prescription" />;
};
