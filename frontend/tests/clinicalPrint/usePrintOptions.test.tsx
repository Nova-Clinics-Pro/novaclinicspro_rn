import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import { usePrintOptions } from '../../core/clinicalPrint/usePrintOptions';
import type { PrintOptions } from '../../core/clinicalPrint/printOptions';

const Host = ({ onResult }: { onResult: (value: PrintOptions | null) => void }) => {
  const { askForPrintOptions, printOptionsDialog } = usePrintOptions();
  return (
    <>
      <TouchableOpacity testID="ask" onPress={async () => onResult(await askForPrintOptions())}>
        <Text>ask</Text>
      </TouchableOpacity>
      {printOptionsDialog}
    </>
  );
};

describe('asking which paper to print on', () => {
  it('offers letterhead and plain paper, and nothing before it is asked', () => {
    const screen = render(<Host onResult={jest.fn()} />);
    expect(screen.queryByTestId('print-paper-letterhead')).toBeNull();
    fireEvent.press(screen.getByTestId('ask'));
    expect(screen.getByText('Letterhead paper')).toBeTruthy();
    expect(screen.getByText('Plain paper')).toBeTruthy();
    expect(screen.getByText(/only the document is printed/i)).toBeTruthy();
  });

  it.each([['letterhead'], ['plain']])('resolves with the chosen paper: %s', async (paper) => {
    const onResult = jest.fn();
    const screen = render(<Host onResult={onResult} />);
    fireEvent.press(screen.getByTestId('ask'));
    await act(async () => { fireEvent.press(screen.getByTestId(`print-paper-${paper}`)); });
    await waitFor(() => expect(onResult).toHaveBeenCalledTimes(1));
    expect(onResult.mock.calls[0][0]).toMatchObject({ paper });
    expect(screen.queryByTestId('print-paper-plain')).toBeNull();
  });

  it('resolves with null when the user cancels, so nothing is printed', async () => {
    const onResult = jest.fn();
    const screen = render(<Host onResult={onResult} />);
    fireEvent.press(screen.getByTestId('ask'));
    await act(async () => { fireEvent.press(screen.getByTestId('print-paper-cancel')); });
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(null));
  });
});
