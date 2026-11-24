import { axiosClient } from '../../../../core/api/axiosClient';
import { DispensingError } from '../../domain/dispensingError';
import type { DispenseLine } from '../../domain/dispensing';
import type { DispensableItem, DispensedBill, DispensingStatus, ReadyToDispenseItem } from '../models/dispensing.dtos';

const base = (tenantId: string) => `/api/v1/clinic/${tenantId}`;

const toError = (error: unknown): DispensingError => {
  const detail = (error as { response?: { data?: { detail?: Record<string, unknown> | string } } } | undefined)?.response?.data?.detail;
  if (detail && typeof detail === 'object' && typeof detail.error_code === 'string') {
    return new DispensingError(detail.error_code, {
      available: typeof detail.available === 'string' ? detail.available : undefined,
      requested: typeof detail.requested === 'string' ? detail.requested : undefined,
    });
  }
  return new DispensingError('DISPENSING_FAILED');
};

/** Signed prescriptions waiting to be handed over, oldest first. */
export const getReadyToDispenseApi = async (tenantId: string): Promise<ReadyToDispenseItem[]> => {
  const response = await axiosClient.get<{ items: ReadyToDispenseItem[] }>(`${base(tenantId)}/dispensing/ready`);
  return response.data.items;
};

/** The stock items a dispenser can pick from: name, unit, stock on hand and price. */
export const getDispensingStockApi = async (tenantId: string): Promise<DispensableItem[]> =>
  (await axiosClient.get<{ items: DispensableItem[] }>(`${base(tenantId)}/dispensing/stock`)).data.items;

/** Whether one prescription was dispensed, with its bill. */
export const getDispensingStatusApi = async (tenantId: string, prescriptionId: string): Promise<DispensingStatus> =>
  (await axiosClient.get<DispensingStatus>(`${base(tenantId)}/dispensing/prescriptions/${prescriptionId}`)).data;

/** Dispense a signed prescription: creates the patient's bill (stock leaves when it is paid). */
export const dispensePrescriptionApi = async (tenantId: string, prescriptionId: string, lines: DispenseLine[]): Promise<DispensedBill> => {
  try {
    return (await axiosClient.post<DispensedBill>(`${base(tenantId)}/prescriptions/${prescriptionId}/dispense`, { lines })).data;
  } catch (error) {
    throw toError(error);
  }
};
