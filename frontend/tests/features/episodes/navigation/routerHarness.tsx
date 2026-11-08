/**
 * Shared fixtures for the workspace navigation tests (real Expo Router via expo-router/testing-library).
 * Mirrors the app's nesting: root Stack -> clinic-admin Stack -> episodes/[episodeId]/{workspace,consultation}, with the
 * production identity function wired as `dangerouslySingular`.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { workspaceRouteIdentity } from '../../../../features/episodes/presentation/navigation/workspaceRouteIdentity';

export const log: string[] = [];
let instanceCounter = 0;
export const bumpers: Record<number, () => void> = {};

export const resetHarness = () => {
  log.length = 0;
  instanceCounter = 0;
  Object.keys(bumpers).forEach((key) => delete bumpers[Number(key)]);
};

/** A screen that records mount/unmount, owns local state (to prove instance preservation) and shows its params. */
export const makeProbeScreen = (label: string) =>
  function ProbeScreen() {
    const params = useLocalSearchParams<Record<string, string>>();
    const idRef = useRef<number>(0);
    if (idRef.current === 0) idRef.current = ++instanceCounter;
    const id = idRef.current;
    const [counter, setCounter] = useState(0);
    bumpers[id] = () => setCounter((value) => value + 1);
    useEffect(() => {
      log.push(`mount:${label}#${id}`);
      return () => {
        log.push(`unmount:${label}#${id}`);
      };
    }, [id]);
    return (
      <View>
        <Text testID={`${label}-instance`}>{`${label}#${id}`}</Text>
        <Text testID={`${label}-counter`}>{String(counter)}</Text>
        <Text testID={`${label}-params`}>{JSON.stringify(params)}</Text>
      </View>
    );
  };

const RootLayout = () => <Stack screenOptions={{ headerShown: false }} />;

export const ClinicLayout = () => (
  <Stack screenOptions={{ headerShown: false }}>
    <Stack.Screen name="index" />
    <Stack.Screen name="other" />
    <Stack.Screen name="episodes/[episodeId]/workspace" dangerouslySingular={workspaceRouteIdentity} />
    <Stack.Screen name="episodes/[episodeId]/consultation" dangerouslySingular={workspaceRouteIdentity} />
  </Stack>
);

export const buildContext = (
  overrides: { workspace?: React.ComponentType; consultation?: React.ComponentType; extra?: Record<string, unknown> } = {},
) => ({
  _layout: RootLayout,
  index: makeProbeScreen('root-index'),
  'clinic-admin/_layout': ClinicLayout,
  'clinic-admin/index': makeProbeScreen('clinic-index'),
  'clinic-admin/other': makeProbeScreen('other'),
  'clinic-admin/episodes/[episodeId]/workspace': overrides.workspace ?? makeProbeScreen('workspace'),
  'clinic-admin/episodes/[episodeId]/consultation': overrides.consultation ?? makeProbeScreen('consultation'),
  ...(overrides.extra ?? {}),
});

const findClinicState = (state: any): any => {
  if (!state) return undefined;
  if (state.routeNames?.includes('other')) return state;
  for (const route of state.routes ?? []) {
    const hit = findClinicState(route.state);
    if (hit) return hit;
  }
  return undefined;
};

export const clinicStack = (state: any): { name: string; key: string; params: any }[] =>
  (findClinicState(state)?.routes ?? []).map((route: any) => ({ name: route.name, key: route.key, params: route.params }));

/** Compact labels such as `workspace(a1,prescription)` for assertions. */
export const labels = (state: any): string[] =>
  clinicStack(state).map((route) => {
    const short = route.name.replace('episodes/[episodeId]/', '');
    return route.params?.appointmentId
      ? `${short}(${route.params.appointmentId}${route.params.step ? ',' + route.params.step : ''})`
      : short;
  });

export const WS = (episode: string, appointment?: string, extra = '') =>
  `/clinic-admin/episodes/${episode}/workspace${appointment ? `?appointmentId=${appointment}` : ''}${extra}`;
export const CS = (episode: string, appointment?: string, extra = '') =>
  `/clinic-admin/episodes/${episode}/consultation${appointment ? `?appointmentId=${appointment}` : ''}${extra}`;

/** Controls for a stand-in workspace host that registers a draft with the unsaved-work registry. */
export const draftControl: {
  save: jest.Mock<Promise<void>, []>;
  discard: jest.Mock<void, []>;
  handle: { setDirty: (dirty: boolean) => void; unregister: () => void } | null;
} = { save: jest.fn(), discard: jest.fn(), handle: null };
