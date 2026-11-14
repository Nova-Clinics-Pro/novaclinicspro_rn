/**
 * One workspace instance per appointment (dangerouslySingular, identity = route + episode + appointment).
 * Real Expo Router; the production identity function.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { act, renderRouter, screen } from 'expo-router/testing-library';
import { router } from 'expo-router';
import { workspaceRouteIdentity } from '../../../../features/episodes/presentation/navigation/workspaceRouteIdentity';
import { bumpers, buildContext, CS, labels, log, resetHarness, WS } from './routerHarness';

beforeEach(resetHarness);

const boot = () => renderRouter(buildContext(), { initialUrl: '/clinic-admin' });
const go = (fn: () => void) => act(() => { fn(); });

describe('workspaceRouteIdentity', () => {
  it('is route + episode + appointment, and contains no tenant', () => {
    expect(workspaceRouteIdentity('episodes/[episodeId]/workspace', { episodeId: 'e1', appointmentId: 'a1', clientId: 'c1' }))
      .toBe('episodes/[episodeId]/workspace|e1|a1');
  });
  it('has no identity without an appointment id (default navigation behavior is preserved)', () => {
    expect(workspaceRouteIdentity('x', { episodeId: 'e1' })).toBeUndefined();
    expect(workspaceRouteIdentity('x', { episodeId: 'e1', appointmentId: '' })).toBeUndefined();
    expect(workspaceRouteIdentity('x', undefined)).toBeUndefined();
  });
  it('differs by route name, episode and appointment', () => {
    const id = (route: string, e: string, a: string) => workspaceRouteIdentity(route, { episodeId: e, appointmentId: a });
    expect(id('w', 'e1', 'a1')).not.toBe(id('c', 'e1', 'a1'));
    expect(id('w', 'e1', 'a1')).not.toBe(id('w', 'e2', 'a1'));
    expect(id('w', 'e1', 'a1')).not.toBe(id('w', 'e1', 'a2'));
  });
  it('accepts repeated query params by taking the first value', () => {
    expect(workspaceRouteIdentity('w', { episodeId: 'e1', appointmentId: ['a1', 'a2'] })).toBe('w|e1|a1');
  });
});

describe('the production layout registers the identity on both workspace routes', () => {
  const source = readFileSync(resolve(__dirname, '../../../../app/clinic-admin/_layout.tsx'), 'utf8');
  it('workspace route', () => {
    expect(source).toMatch(/name="episodes\/\[episodeId\]\/workspace"\s+dangerouslySingular=\{workspaceRouteIdentity\}/);
  });
  it('consultation route', () => {
    expect(source).toMatch(/name="episodes\/\[episodeId\]\/consultation"[\s\S]*?dangerouslySingular=\{workspaceRouteIdentity\}/);
  });
  it('no tenant parameter is added to the route identity or builders', () => {
    expect(readFileSync(resolve(__dirname, '../../../../features/doctorDashboard/application/consultationRoutes.ts'), 'utf8')).not.toMatch(/tenant/i);
  });
});

describe.each([['workspace', WS], ['consultation', CS]])('%s route', (label, url) => {
  const mounts = () => log.filter((entry) => entry.startsWith(`mount:${label}#`)).length;

  it('push and navigate to the same appointment reuse ONE instance: same state, params replaced, nothing unmounted', () => {
    const view = boot();
    go(() => router.push(url('e1', 'a1') as never));
    go(() => bumpers[2]());
    go(() => router.push(url('e1', 'a1', '&step=prescription') as never));
    go(() => router.navigate(url('e1', 'a1', '&step=completion') as never));
    expect(mounts()).toBe(1);
    expect(labels(view.getRouterState())).toEqual(['index', `${label}(a1,completion)`]);
    expect(screen.getByTestId(`${label}-counter`).props.children).toBe('1');
    expect(log.filter((entry) => entry.startsWith('unmount'))).toEqual([]);
  });

  it('a different appointment gets its own instance; the first stays mounted', () => {
    const view = boot();
    go(() => router.push(url('e1', 'a1') as never));
    go(() => router.push(url('e1', 'a2') as never));
    expect(mounts()).toBe(2);
    expect(labels(view.getRouterState())).toEqual(['index', `${label}(a1)`, `${label}(a2)`]);
  });

  it('a different episode with the same appointment id is a different instance', () => {
    boot();
    go(() => router.push(url('e1', 'a1') as never));
    go(() => router.push(url('e2', 'a1') as never));
    expect(mounts()).toBe(2);
  });

  it('without an appointment id the default behavior applies (push makes a new instance each time)', () => {
    boot();
    go(() => router.push(url('e1') as never));
    go(() => router.push(url('e1') as never));
    expect(mounts()).toBe(2);
  });

  it('a notification-style push of the same appointment from a deeper screen reuses the instance', () => {
    const view = boot();
    go(() => router.push(url('e1', 'a1') as never));
    go(() => router.push('/clinic-admin/other' as never));
    go(() => router.push(`${url('e1', 'a1')}&clientId=c1` as never));
    expect(mounts()).toBe(1);
    expect(labels(view.getRouterState())).toEqual(['index', 'other', `${label}(a1)`]);
  });

  it('two competing drafts cannot exist for one appointment: repeated navigation never creates a second instance', () => {
    boot();
    for (let i = 0; i < 4; i += 1) go(() => router.push(url('e1', 'a1', `&n=${i}`) as never));
    expect(mounts()).toBe(1);
  });
});

it('the workspace and consultation routes are separate identities', () => {
  boot();
  go(() => router.push(WS('e1', 'a1') as never));
  go(() => router.push(CS('e1', 'a1') as never));
  expect(log.filter((entry) => /^mount:(workspace|consultation)#/.test(entry))).toHaveLength(2);
});
