/** What the dispensing endpoints return and accept (`/api/v1/clinic/{tenant}/dispensing/...` and `/prescriptions/{id}/dispense`). */

export interface ReadyToDispenseItem {
  prescription_id: string;
  client_id: string;
  client_name: string;
  doctor_name: string | null;
  signed_at: string;
  medicines: string[];
}

export interface DispensingStatus {
  prescription_id: string;
  dispensed: boolean;
  invoice_id: string | null;
  invoice_number: string | null;
  invoice_status: string | null;
}

export interface DispensedBill {
  id: string;
  invoice_number: string;
  total_amount: string | number | null;
  status: string;
}
