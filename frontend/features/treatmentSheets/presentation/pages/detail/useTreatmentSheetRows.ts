/**
 * R7 · T-0.7 (ED-ARCH-001): the row save/save-all actions imported
 * `updateTreatmentSheetRowApi`/`updateAllTreatmentSheetRowsApi` directly
 * from the datasource layer. Repointed to
 * `useUpdateTreatmentSheetRowMutation`/`useUpdateAllTreatmentSheetRowsMutation`
 * (`treatmentSheets.repository.impl.ts`) — see that file's own docstrings
 * for why the former was re-shaped (rowId as a mutate-time variable) and
 * the latter is new. Both mutation hooks have no default `onSuccess`, so
 * this hook's own success/failure handling (Alert, isSaving/isEditing
 * state, `refetch()`) is completely unchanged.
 */
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import {
  useUpdateAllTreatmentSheetRowsMutation,
  useUpdateTreatmentSheetRowMutation,
} from '../../../data/repositories/treatmentSheets.repository.impl';
import { TreatmentSheetResponse } from '../../../data/models/treatmentSheets.dtos';
import {
  buildRowUpdatePayload,
  buildRows,
  hasSavedRowContent,
} from './helpers';
import { RowFormData } from './types';
import { treatmentErrorMessage } from '../../../application/treatmentErrorPresentation';

interface Params {
  tenantId: string;
  treatmentSheetId: string;
  treatmentSheet?: TreatmentSheetResponse;
  refetch: () => Promise<unknown>;
}

export const useTreatmentSheetRows = ({
  tenantId,
  treatmentSheetId,
  treatmentSheet,
  refetch,
}: Params) => {
  const [rowsData, setRowsData] = useState<RowFormData[]>([]);
  const [hasBeenSavedOnce, setHasBeenSavedOnce] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);

  const updateRowMutation = useUpdateTreatmentSheetRowMutation(tenantId, treatmentSheetId);
  const updateAllRowsMutation = useUpdateAllTreatmentSheetRowsMutation(tenantId, treatmentSheetId);

  useEffect(() => {
    if (!treatmentSheet?.rows) return;
    setHasBeenSavedOnce(hasSavedRowContent(treatmentSheet.rows));
    setRowsData(buildRows(treatmentSheet.rows));
  }, [treatmentSheet]);

  const updateRowField = useCallback((index: number, field: keyof RowFormData, value: string) => {
    setRowsData(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const copyFromAbove = useCallback((index: number) => {
    if (index === 0) {
      Alert.alert('Info', 'This is the first row. Nothing to copy from.');
      return;
    }

    setRowsData(prev => {
      const updated = [...prev];
      const aboveRow = updated[index - 1];
      updated[index] = {
        ...updated[index],
        treatment_name: aboveRow.treatment_name,
        medicines_text: aboveRow.medicines_text,
        instructions_text: aboveRow.instructions_text,
      };
      return updated;
    });
  }, []);

  const toggleEditMode = useCallback((index: number) => {
    setRowsData(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], isEditing: !updated[index].isEditing };
      return updated;
    });
  }, []);

  const updateSingleRow = useCallback(async (index: number) => {
    const row = rowsData[index];
    setRowsData(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], isSaving: true };
      return updated;
    });

    try {
      await updateRowMutation.mutateAsync({ rowId: row.id, payload: buildRowUpdatePayload(row) });
      setRowsData(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], isSaving: false, isEditing: false };
        return updated;
      });
      Alert.alert('Success', `Day ${row.day_number} updated successfully.`);
      await refetch();
    } catch (error: unknown) {
      setRowsData(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], isSaving: false };
        return updated;
      });
      Alert.alert('Error', treatmentErrorMessage(error, 'Failed to update row.'));
    }
  }, [refetch, rowsData, updateRowMutation]);

  const saveAllRows = useCallback(async () => {
    setIsSavingAll(true);
    try {
      const rowsPayload = rowsData.map(row => ({
        id: row.id,
        ...buildRowUpdatePayload(row),
      }));
      await updateAllRowsMutation.mutateAsync(rowsPayload);
      setHasBeenSavedOnce(true);
      setRowsData(prev => prev.map(row => ({ ...row, isEditing: false })));
      Alert.alert('Success', 'All treatment days saved successfully.');
      await refetch();
    } catch (error: unknown) {
      Alert.alert('Error', treatmentErrorMessage(error, 'Failed to save all rows.'));
    } finally {
      setIsSavingAll(false);
    }
  }, [refetch, rowsData, updateAllRowsMutation]);

  return {
    rowsData,
    hasBeenSavedOnce,
    isSavingAll,
    updateRowField,
    copyFromAbove,
    toggleEditMode,
    updateSingleRow,
    saveAllRows,
  };
};
