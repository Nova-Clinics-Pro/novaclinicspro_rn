/**
 * Client Entity
 * Domain model for clients/patients
 */

/**
 * Client entity representing a clinic patient
 */
export interface Client {
  id: string;
  tenantId: string;
  externalRef: string | null;
  fullName: string;
  phone: string | null;
  mobileCode: string;
  email: string | null;
  gender: string | null;
  dateOfBirth: Date | null;
  age: number | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  country: string | null;
  occupation: string | null;
  bloodGroup: string | null;
  medicalHistory: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  notes: string | null;
  isActive: boolean;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Client summary for list views
 */
export interface ClientSummary {
  id: string;
  fullName: string;
  phone: string | null;
  gender: string | null;
  age: number | null;
  isActive: boolean;
}
