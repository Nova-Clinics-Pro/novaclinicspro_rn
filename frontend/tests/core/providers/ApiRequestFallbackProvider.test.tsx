import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { act, cleanupAsync, render, waitFor } from '@testing-library/react-native';
import { ReactNode } from 'react';
import { Text } from 'react-native';
import { ApiRequestFallbackProvider } from '../../../core/providers/ApiRequestFallbackProvider';
import {
  beginApiRequest,
  completeApiRequest,
  resetApiRequestActivityForTests,
} from '../../../core/api/apiRequestActivity';

const mockLogError = jest.fn();

jest.mock('../../../core/utils/errorHandler', () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
}));

const FALLBACK_MESSAGE = 'An unexpected error occurred. Please try again.';

const clients = new Set<QueryClient>();
const createClient = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.add(client);
  return client;
};

const renderWithClient = (client: QueryClient, children: ReactNode) =>
  render(
    <QueryClientProvider client={client}>
      <ApiRequestFallbackProvider>{children}</ApiRequestFallbackProvider>
    </QueryClientProvider>
  );

function FailureQuery({ error, featureHandled = false }: { error: unknown; featureHandled?: boolean }) {
  useQuery({
    queryKey: ['api-fallback', featureHandled ? 'feature' : 'global', String((error as any)?.response?.status)],
    queryFn: () => Promise.reject(error),
    retry: false,
    meta: featureHandled ? { apiFailurePresentation: 'feature' } : undefined,
  });
  return <Text>feature-content</Text>;
}

function PendingQuery() {
  useQuery({
    queryKey: ['api-fallback', 'pending'],
    queryFn: () => new Promise<never>(() => undefined),
    retry: false,
  });
  return <Text>feature-content</Text>;
}

function LongRunningQuery() {
  useQuery({
    queryKey: ['api-fallback', 'long-running'],
    queryFn: () => new Promise<never>(() => undefined),
    retry: false,
    meta: { apiLoadingMode: 'long-running' },
  });
  return <Text>long-running-content</Text>;
}

function SuccessfulQuery() {
  const query = useQuery({
    queryKey: ['api-fallback', 'success'],
    queryFn: async () => 'ready',
    retry: false,
  });
  return <Text>{query.data ?? 'loading'}</Text>;
}

describe('ApiRequestFallbackProvider', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    resetApiRequestActivityForTests();
    mockLogError.mockClear();
  });
  afterEach(async () => {
    // Unmount observers while fake timers still own their GC scheduling.
    // Restoring real timers before RNTL's outer cleanup leaks 5-minute timers.
    await cleanupAsync();
    // Pending query cancellation settles asynchronously and schedules GC in finally.
    // Await it before removing cache entries or restoring real timers.
    await Promise.all([...clients].map(client => client.cancelQueries()));
    clients.forEach(client => client.clear());
    clients.clear();
    resetApiRequestActivityForTests();
    jest.useRealTimers();
  });

  it('notices an ordinary query after three seconds and replaces its passive spinner by eight seconds', async () => {
    const client = createClient();
    const screen = renderWithClient(client, <PendingQuery />);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(3_000);
    });
    expect(screen.getByText('Taking longer than usual…')).toBeTruthy();

    await act(async () => {
      await jest.advanceTimersByTimeAsync(5_000);
    });

    await waitFor(() => {
      expect(screen.getByText(FALLBACK_MESSAGE)).toBeTruthy();
    });
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
    // This is a UI fallback, not a forced HTTP/query cancellation.
    expect(client.isFetching()).toBe(1);
  });

  it.each([500, 503])('shows the generic fallback for an unhandled %i response', async (status) => {
    const client = createClient();
    const screen = renderWithClient(client, <FailureQuery error={{ response: { status } }} />);

    await waitFor(() => expect(screen.getByText(FALLBACK_MESSAGE)).toBeTruthy());
  });

  it('does not affect successful queries', async () => {
    const client = createClient();
    const screen = renderWithClient(client, <SuccessfulQuery />);

    await waitFor(() => expect(screen.getByText('ready')).toBeTruthy());
    expect(screen.queryByText(FALLBACK_MESSAGE)).toBeNull();
  });

  it('leaves feature-owned failures to their existing presentation', async () => {
    const client = createClient();
    const screen = renderWithClient(
      client,
      <FailureQuery error={{ response: { status: 503 } }} featureHandled />
    );

    await waitFor(() => {
      expect(client.getQueryState(['api-fallback', 'feature', '503'])?.status).toBe('error');
    });
    expect(screen.queryByText(FALLBACK_MESSAGE)).toBeNull();
  });

  it('does not change the existing authenticated-session 401 ownership', async () => {
    const client = createClient();
    const screen = renderWithClient(client, <FailureQuery error={{ response: { status: 401 } }} />);

    await waitFor(() => {
      expect(client.getQueryState(['api-fallback', 'global', '401'])?.status).toBe('error');
    });
    expect(screen.queryByText(FALLBACK_MESSAGE)).toBeNull();
  });

  it('does not force an explicitly long-running query into the ordinary fallback', async () => {
    const client = createClient();
    const screen = renderWithClient(client, <LongRunningQuery />);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(8_000);
    });

    expect(screen.queryByText('Taking longer than usual…')).toBeNull();
    expect(screen.queryByText(FALLBACK_MESSAGE)).toBeNull();
    expect(client.isFetching()).toBe(1);
  });

  it('also protects ordinary Axios activity outside React Query', async () => {
    const client = createClient();
    const request = beginApiRequest({});
    const screen = renderWithClient(client, <Text>legacy-axios-screen</Text>);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(8_000);
    });

    expect(screen.getByText(FALLBACK_MESSAGE)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
    await act(async () => {
      completeApiRequest(request);
    });
  });

  it('presents an unhandled raw Axios server failure without overriding retry ownership', async () => {
    const client = createClient();
    const screen = renderWithClient(client, <Text>legacy-axios-screen</Text>);
    let request: ReturnType<typeof beginApiRequest>;
    await act(async () => {
      request = beginApiRequest({});
    });

    await act(async () => {
      completeApiRequest(request!, { response: { status: 503 } });
    });

    await waitFor(() => {
      expect(screen.getByText(FALLBACK_MESSAGE)).toBeTruthy();
    });
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
    expect(mockLogError).toHaveBeenCalledWith(
      'api.fallback.transport_failure',
      { response: { status: 503 } }
    );
  });

  it('does not classify a canceled request during navigation as an unexpected failure', async () => {
    const client = createClient();
    const screen = renderWithClient(client, <Text>onboarding-screen</Text>);
    let request: ReturnType<typeof beginApiRequest>;
    await act(async () => {
      request = beginApiRequest({});
    });
    await act(async () => {
      completeApiRequest(request!, { code: 'ERR_CANCELED', name: 'CanceledError' });
    });

    expect(screen.queryByText(FALLBACK_MESSAGE)).toBeNull();
  });
});
