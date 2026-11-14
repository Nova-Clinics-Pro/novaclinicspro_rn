/**
 * The single Save / Discard / Cancel dialog host.
 */
import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { UnsavedWorkDialogHost } from '../../../core/unsavedWork/UnsavedWorkDialogHost';
import {
  confirmUnsavedWork,
  hasDirtyDrafts,
  registerDraft,
  resetUnsavedWorkForTests,
} from '../../../core/unsavedWork/unsavedWorkRegistry';

const open = (opts: { save?: () => Promise<void>; discard?: () => void } = {}) => {
  const save = jest.fn(opts.save ?? (async () => {}));
  const discard = jest.fn(opts.discard ?? (() => {}));
  const handle = registerDraft({ id: 'rx', label: 'Prescription draft', save, discard });
  handle.setDirty(true);
  let answer!: Promise<boolean>;
  act(() => { answer = confirmUnsavedWork('exit'); });
  return { save, discard, answer };
};

afterEach(() => resetUnsavedWorkForTests());

it('renders nothing while there is no pending decision', () => {
  const { queryByTestId } = render(<UnsavedWorkDialogHost />);
  expect(queryByTestId('unsaved-work-dialog')).toBeNull();
});

it('shows the title, the intent line, the draft label and the three actions', () => {
  const view = render(<UnsavedWorkDialogHost />);
  open();
  expect(view.getByTestId('unsaved-work-dialog')).toBeTruthy();
  expect(view.getByText('Unsaved changes')).toBeTruthy();
  expect(view.getByText('You are leaving this consultation.')).toBeTruthy();
  expect(view.getByText(/Prescription draft/)).toBeTruthy();
  expect(view.getByLabelText('Save')).toBeTruthy();
  expect(view.getByLabelText('Discard')).toBeTruthy();
  expect(view.getByLabelText('Cancel')).toBeTruthy();
});

it('Cancel closes the dialog and keeps the draft', async () => {
  const view = render(<UnsavedWorkDialogHost />);
  const { answer, save, discard } = open();
  await act(async () => { fireEvent.press(view.getByLabelText('Cancel')); });
  await expect(answer).resolves.toBe(false);
  expect(view.queryByTestId('unsaved-work-dialog')).toBeNull();
  expect(save).not.toHaveBeenCalled();
  expect(discard).not.toHaveBeenCalled();
  expect(hasDirtyDrafts()).toBe(true);
});

it('Save runs the draft save and closes the dialog on success', async () => {
  const view = render(<UnsavedWorkDialogHost />);
  const { answer, save } = open();
  await act(async () => { fireEvent.press(view.getByLabelText('Save')); });
  await expect(answer).resolves.toBe(true);
  expect(save).toHaveBeenCalledTimes(1);
  expect(view.queryByTestId('unsaved-work-dialog')).toBeNull();
});

it('Discard runs the draft discard and closes the dialog', async () => {
  const view = render(<UnsavedWorkDialogHost />);
  const { answer, discard } = open();
  await act(async () => { fireEvent.press(view.getByLabelText('Discard')); });
  await expect(answer).resolves.toBe(true);
  expect(discard).toHaveBeenCalledTimes(1);
  expect(view.queryByTestId('unsaved-work-dialog')).toBeNull();
});

it('a failed Save keeps the dialog open with the error and the actions available again', async () => {
  const view = render(<UnsavedWorkDialogHost />);
  open({ save: async () => { throw new Error('boom'); } });
  await act(async () => { fireEvent.press(view.getByLabelText('Save')); });
  expect(view.getByTestId('unsaved-work-dialog')).toBeTruthy();
  expect(view.getByText(/could not be saved/i)).toBeTruthy();
  expect(view.getByLabelText('Save').props.accessibilityState.disabled).toBe(false);
  expect(hasDirtyDrafts()).toBe(true);
});

it('disables every action while a save is in flight', async () => {
  const view = render(<UnsavedWorkDialogHost />);
  let release!: () => void;
  open({ save: () => new Promise<void>((resolve) => { release = resolve; }) });
  await act(async () => { fireEvent.press(view.getByLabelText('Save')); });
  expect(view.getByLabelText('Save').props.accessibilityState.disabled).toBe(true);
  expect(view.getByLabelText('Discard').props.accessibilityState.disabled).toBe(true);
  expect(view.getByLabelText('Cancel').props.accessibilityState.disabled).toBe(true);
  await act(async () => { release(); });
  expect(view.queryByTestId('unsaved-work-dialog')).toBeNull();
});
