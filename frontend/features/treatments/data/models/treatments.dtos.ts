/**
 * Treatments DTOs
 * Data Transfer Objects matching OpenAPI schemas
 */

// ============================================
// TYPES
// ============================================

/** Dosha benefits structure (Ayurveda-specific) */
export interface DoshaBenefits {
  vata?: {
    balances?: boolean;
    aggravates?: boolean;
    notes?: string;
  };
  pitta?: {
    balances?: boolean;
    aggravates?: boolean;
    notes?: string;
  };
  kapha?: {
    balances?: boolean;
    aggravates?: boolean;
    notes?: string;
  };
  [key: string]: any; // Allow additional dosha properties
}

// ============================================
// REQUEST DTOs
// ============================================

/** Request to create a treatment */
export interface TreatmentCreate {
  code: string; // Unique within tenant
  name: string;
  description?: string | null;
  duration_minutes?: number | null;
  base_price?: number | string | null;
  price?: number | string | null;
  dosha_benefits?: DoshaBenefits | null;
  contraindications?: string | null;
  /** Canonical global treatment taxonomy code; null is a valid uncategorized treatment. */
  category_code?: string | null;
  metadata?: Record<string, any> | null;
}

/** Request to update a treatment */
export interface TreatmentUpdate {
  code?: string | null;
  name?: string | null;
  description?: string | null;
  duration_minutes?: number | null;
  base_price?: number | string | null;
  price?: number | string | null;
  dosha_benefits?: DoshaBenefits | null;
  contraindications?: string | null;
  category_code?: string | null;
  metadata?: Record<string, any> | null;
  is_active?: boolean | null;
}

/** Parameters for listing treatments */
export interface ListTreatmentsParams {
  is_active?: boolean;
  code?: string;
  skip?: number;
  limit?: number;
  lang?: string;
}

// ============================================
// RESPONSE DTOs
// ============================================

/** Response for a treatment */
export interface TreatmentResponse {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  description: string | null;
  duration_minutes: number | null;
  base_price: string | null;
  price: string | null;
  dosha_benefits: DoshaBenefits | null;
  contraindications: string | null;
  category_code: string | null;
  metadata_: Record<string, any> | null; // Note: API returns metadata_
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

/** Paginated response for treatments */
export interface PaginatedTreatmentsResponse {
  items: TreatmentResponse[];
  total: number;
  skip: number;
  limit: number;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/** Format price for display */
export const formatPrice = (price: string | number | null): string => {
  if (price === null || price === undefined) return '—';
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(numPrice)) return '—';
  return `₹${numPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
};

/** Format duration for display */
export const formatDuration = (minutes: number | null): string => {
  if (!minutes) return '—';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours} hr`;
  return `${hours} hr ${mins} min`;
};

/** Get dosha summary text */
export const getDoshaSummary = (benefits: DoshaBenefits | null): string => {
  if (!benefits) return 'Not specified';
  
  const parts: string[] = [];
  
  if (benefits.vata?.balances) parts.push('Balances Vata');
  if (benefits.pitta?.balances) parts.push('Balances Pitta');
  if (benefits.kapha?.balances) parts.push('Balances Kapha');
  
  if (parts.length === 0) return 'Not specified';
  return parts.join(', ');
};

/** Dosha color mapping */
export const DOSHA_COLORS = {
  vata: '#3B82F6', // Blue - air/space
  pitta: '#EF4444', // Red - fire/water  
  kapha: '#10B981', // Green - earth/water
} as const;
