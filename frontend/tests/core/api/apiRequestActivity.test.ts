import {
  beginApiRequest,
  completeApiRequest,
  getActiveOrdinaryRequestCount,
  getUnhandledTransportFailure,
  resetApiRequestActivityForTests,
} from '../../../core/api/apiRequestActivity';

describe('API request activity tracker', () => {
  beforeEach(resetApiRequestActivityForTests);
  afterEach(resetApiRequestActivityForTests);

  it('tracks ordinary transport requests until their terminal response or error', () => {
    const request = beginApiRequest({});
    expect(getActiveOrdinaryRequestCount()).toBe(1);

    completeApiRequest(request);
    expect(getActiveOrdinaryRequestCount()).toBe(0);
  });

  it('excludes explicitly long-running workflows from the ordinary fallback', () => {
    beginApiRequest({ apiLoadingMode: 'long-running' });
    expect(getActiveOrdinaryRequestCount()).toBe(0);
  });

  it('records only unhandled network or server failures for root presentation', () => {
    const request = beginApiRequest({});
    completeApiRequest(request, { response: { status: 503 } });
    expect(getUnhandledTransportFailure()).toEqual({ key: 'api-request-1:1' });

    const clientError = beginApiRequest({});
    completeApiRequest(clientError, { response: { status: 400 } });
    expect(getUnhandledTransportFailure()).toEqual({ key: 'api-request-1:1' });
  });
});
