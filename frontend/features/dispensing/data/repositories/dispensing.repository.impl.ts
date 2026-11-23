import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dispensePrescriptionApi, getDispensingStatusApi, getReadyToDispenseApi } from '../datasources/dispensing.api';
import type { DispensedBill, DispensingStatus, ReadyToDispenseItem } from '../models/dispensing.dtos';
import type { DispenseLine } from '../../domain/dispensing';
import type { DispensingError } from '../../domain/dispensingError';

export const dispensingKeys = {
  all: ['dispensing'] as const,
  ready: (tenantId: string) => [...dispensingKeys.all, 'ready', tenantId] as const,
  status: (tenantId: string, prescriptionId: string) => [...dispensingKeys.all, 'status', tenantId, prescriptionId] as const,
};

/** The queue of signed prescriptions waiting to be dispensed. */
export const useReadyToDispenseQuery = (tenantId: string, enabled = true) =>
  useQuery<ReadyToDispenseItem[], Error>({ queryKey: dispensingKeys.ready(tenantId), queryFn: () => getReadyToDispenseApi(tenantId), enabled: !!tenantId && enabled });

/** Whether one prescription has been dispensed. */
export const useDispensingStatusQuery = (tenantId: string, prescriptionId: string, enabled = true) =>
  useQuery<DispensingStatus, Error>({ queryKey: dispensingKeys.status(tenantId, prescriptionId), queryFn: () => getDispensingStatusApi(tenantId, prescriptionId), enabled: !!tenantId && !!prescriptionId && enabled });

/** Dispense a prescription; the queue and the prescription's status are re-read afterwards. */
export const useDispenseMutation = (tenantId: string, prescriptionId: string) => {
  const queryClient = useQueryClient();
  return useMutation<DispensedBill, DispensingError, DispenseLine[]>({
    mutationFn: (lines) => dispensePrescriptionApi(tenantId, prescriptionId, lines),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: dispensingKeys.ready(tenantId) }),
        queryClient.invalidateQueries({ queryKey: dispensingKeys.status(tenantId, prescriptionId) }),
      ]);
    },
  });
};
