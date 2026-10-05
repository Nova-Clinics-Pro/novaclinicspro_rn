/**
 * Unit tests for staffDashboards API functions (new row_id-based flow)
 *
 * Validates: Requirements 6.1, 1.7
 *
 * Asserts:
 * - Each function builds the correct URL with tenantId in path
 * - completeSheetRowApi URL contains rowId, NOT any session id
 */

import {
  getTherapistSessionsApi,
  getTherapistKpisApi,
  getSheetRowUsablesApi,
  completeSheetRowApi,
} from '../../../../features/staffDashboards/data/datasources/staffDashboards.api';

// Mock axiosClient so no real HTTP calls are made
jest.mock('../../../../core/api/axiosClient', () => ({
  axiosClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

// Import the mock so we can configure return values and inspect calls
import { axiosClient } from '../../../../core/api/axiosClient';

const mockGet = axiosClient.get as jest.Mock;
const mockPost = axiosClient.post as jest.Mock;

const TENANT_ID = 'tenant-abc-123';
const STAFF_ID = 'staff-xyz-456';
const ROW_ID = 'row-def-789';
const SESSION_ID = 'session-should-never-appear';

beforeEach(() => {
  jest.clearAllMocks();
  // Default resolved value for all calls
  mockGet.mockResolvedValue({ data: {} });
  mockPost.mockResolvedValue({ data: {} });
});

// ---------------------------------------------------------------------------
// getTherapistSessionsApi
// ---------------------------------------------------------------------------

describe('getTherapistSessionsApi', () => {
  it('calls the correct URL with tenantId in path', async () => {
    await getTherapistSessionsApi(TENANT_ID);

    expect(mockGet).toHaveBeenCalledTimes(1);
    const [url] = mockGet.mock.calls[0];
    expect(url).toBe(
      `/api/v1/clinic/${TENANT_ID}/staff/me/dashboard/therapist/sessions`
    );
  });

  it('URL contains tenantId segment under /api/v1/clinic/', async () => {
    await getTherapistSessionsApi(TENANT_ID);

    const [url] = mockGet.mock.calls[0];
    expect(url).toContain(`/api/v1/clinic/${TENANT_ID}/`);
  });

  it('passes cursor and limit as query params when provided', async () => {
    const params = { cursor: 'cursor-token', limit: 20 };
    await getTherapistSessionsApi(TENANT_ID, params);

    const [, config] = mockGet.mock.calls[0];
    expect(config?.params).toEqual(params);
  });

  it('passes no params when called without optional params', async () => {
    await getTherapistSessionsApi(TENANT_ID);

    const [, config] = mockGet.mock.calls[0];
    expect(config?.params).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getTherapistKpisApi
// ---------------------------------------------------------------------------

describe('getTherapistKpisApi', () => {
  it('calls the correct URL with tenantId and staffId in path', async () => {
    await getTherapistKpisApi(TENANT_ID, STAFF_ID, { period: '30d' });

    expect(mockGet).toHaveBeenCalledTimes(1);
    const [url] = mockGet.mock.calls[0];
    expect(url).toBe(`/api/v1/clinic/${TENANT_ID}/staff/${STAFF_ID}/kpis`);
  });

  it('URL contains tenantId segment under /api/v1/clinic/', async () => {
    await getTherapistKpisApi(TENANT_ID, STAFF_ID, {});

    const [url] = mockGet.mock.calls[0];
    expect(url).toContain(`/api/v1/clinic/${TENANT_ID}/`);
  });

  it('URL contains staffId in path', async () => {
    await getTherapistKpisApi(TENANT_ID, STAFF_ID, {});

    const [url] = mockGet.mock.calls[0];
    expect(url).toContain(`/staff/${STAFF_ID}/kpis`);
  });

  it('passes KpiQueryParams as query params', async () => {
    const params = { period: '7d' as const };
    await getTherapistKpisApi(TENANT_ID, STAFF_ID, params);

    const [, config] = mockGet.mock.calls[0];
    expect(config?.params).toEqual(params);
  });

  it('passes custom date range params', async () => {
    const params = { start_date: '2024-01-01', end_date: '2024-01-31' };
    await getTherapistKpisApi(TENANT_ID, STAFF_ID, params);

    const [, config] = mockGet.mock.calls[0];
    expect(config?.params).toEqual(params);
  });
});

// ---------------------------------------------------------------------------
// getSheetRowUsablesApi
// ---------------------------------------------------------------------------

describe('getSheetRowUsablesApi', () => {
  it('calls the correct row-scoped URL', async () => {
    await getSheetRowUsablesApi(TENANT_ID, ROW_ID);

    expect(mockGet).toHaveBeenCalledTimes(1);
    const [url] = mockGet.mock.calls[0];
    expect(url).toBe(
      `/api/v1/clinic/treatment-sheets/rows/${ROW_ID}/usables`
    );
  });

  it('URL does not include tenantId for JWT-scoped row routes', async () => {
    await getSheetRowUsablesApi(TENANT_ID, ROW_ID);

    const [url] = mockGet.mock.calls[0];
    expect(url).not.toContain(`/api/v1/clinic/${TENANT_ID}/`);
  });

  it('URL contains rowId in path', async () => {
    await getSheetRowUsablesApi(TENANT_ID, ROW_ID);

    const [url] = mockGet.mock.calls[0];
    expect(url).toContain(`/rows/${ROW_ID}/usables`);
  });

  it('normalizes backend array response into items wrapper', async () => {
    const usable = {
      inventory_item_id: 'inventory-id',
      material_name: 'Maha Narayan Tailam',
      material_code: 'maha-narayan-tailam',
      quantity_used: 50,
      unit: 'ml',
      ml_per_unit: 1,
      category: 'oil',
    };
    mockGet.mockResolvedValueOnce({ data: [usable] });

    const result = await getSheetRowUsablesApi(TENANT_ID, ROW_ID);

    expect(result).toEqual({ items: [usable] });
  });
});

// ---------------------------------------------------------------------------
// completeSheetRowApi — Requirements 6.1, 1.7
// ---------------------------------------------------------------------------

describe('completeSheetRowApi', () => {
  const payload = {
    materials: [
      {
        material_name: 'Sesame Oil',
        quantity_used: 100,
        unit: 'ml',
        ml_per_unit: 1,
        category: 'oil' as const,
      },
    ],
  };

  it('calls the authenticated tenant-scoped row-completion URL with rowId in path', async () => {
    await completeSheetRowApi(TENANT_ID, ROW_ID, payload);

    expect(mockPost).toHaveBeenCalledTimes(1);
    const [url] = mockPost.mock.calls[0];
    expect(url).toBe(
      `/api/v1/clinic/treatment-sheets/rows/${ROW_ID}/complete`
    );
  });

  it('does not duplicate tenant identity in the path', async () => {
    await completeSheetRowApi(TENANT_ID, ROW_ID, payload);

    const [url] = mockPost.mock.calls[0];
    expect(url).not.toContain(TENANT_ID);
  });

  it('URL contains rowId in path — Requirement 6.1', async () => {
    await completeSheetRowApi(TENANT_ID, ROW_ID, payload);

    const [url] = mockPost.mock.calls[0];
    expect(url).toContain(`/rows/${ROW_ID}/complete`);
  });

  it('URL does NOT contain any session id — Requirement 6.1', async () => {
    // Simulate a scenario where caller might accidentally pass a session id as rowId
    // The function must use the rowId parameter, not any session-related value
    await completeSheetRowApi(TENANT_ID, ROW_ID, payload);

    const [url] = mockPost.mock.calls[0];
    expect(url).not.toContain(SESSION_ID);
  });

  it('URL does not reference session_id path segment', async () => {
    await completeSheetRowApi(TENANT_ID, ROW_ID, payload);

    const [url] = mockPost.mock.calls[0];
    expect(url).not.toContain('session_id');
    expect(url).not.toContain('/sessions/');
  });

  it('sends the payload as the POST body', async () => {
    await completeSheetRowApi(TENANT_ID, ROW_ID, payload);

    const [, body] = mockPost.mock.calls[0];
    expect(body).toEqual(payload);
  });

  it('payload does NOT contain completed_by_staff_id — Requirement 6.4', async () => {
    await completeSheetRowApi(TENANT_ID, ROW_ID, payload);

    const [, body] = mockPost.mock.calls[0];
    expect(body).not.toHaveProperty('completed_by_staff_id');
  });

  it('payload does NOT contain completed_at — Requirement 6.4', async () => {
    await completeSheetRowApi(TENANT_ID, ROW_ID, payload);

    const [, body] = mockPost.mock.calls[0];
    expect(body).not.toHaveProperty('completed_at');
  });
});
