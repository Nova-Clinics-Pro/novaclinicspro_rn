import { reportLegacyRouteUsage } from '../../core/observability/legacyRouteUsage';

describe('legacy route usage observability (T-Z.6)', () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

  afterEach(() => {
    warn.mockClear();
  });

  afterAll(() => {
    warn.mockRestore();
  });

  it('emits a non-PHI route code through the established observability choke point', () => {
    reportLegacyRouteUsage('casesheet.edit');

    expect(warn).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(String(warn.mock.calls[0][1]));
    expect(payload).toMatchObject({
      event: 'navigation.legacy_route_used',
      route: 'casesheet.edit',
      message: 'Legacy COS compatibility route used',
    });
    expect(payload).toHaveProperty('timestamp');
    expect(JSON.stringify(payload)).not.toMatch(/clientId|appointmentId|episodeId|casesheetId|prescriptionId/i);
  });

  it('does not let a telemetry failure interrupt a compatibility route', () => {
    warn.mockImplementationOnce(() => {
      throw new Error('telemetry unavailable');
    });

    expect(() => reportLegacyRouteUsage('prescription.new')).not.toThrow();
  });
});
