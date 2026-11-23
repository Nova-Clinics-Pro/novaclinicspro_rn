import React, { useCallback, useRef, useState } from 'react';
import { useTranslation } from '../localization/useTranslation';
import { PrintPaperChoiceModal } from './PrintPaperChoiceModal';
import { printLocaleFor, type PrintOptions, type PrintPaper } from './printOptions';

/**
 * Asks the user which paper they are printing on before every print. `askForPrintOptions()` resolves with the paper and the
 * language to print in, or null if the user backs out; render `printOptionsDialog` once in the screen.
 */
export const usePrintOptions = () => {
  const { locale } = useTranslation();
  const [visible, setVisible] = useState(false);
  const pending = useRef<((paper: PrintPaper | null) => void) | null>(null);

  const askForPrintOptions = useCallback(
    (): Promise<PrintOptions | null> =>
      new Promise((resolve) => {
        pending.current = (paper) => resolve(paper ? { paper, locale: printLocaleFor(locale) } : null);
        setVisible(true);
      }),
    [locale]
  );

  const settle = useCallback((paper: PrintPaper | null) => {
    setVisible(false);
    pending.current?.(paper);
    pending.current = null;
  }, []);

  const printOptionsDialog = <PrintPaperChoiceModal visible={visible} onChoose={settle} onCancel={() => settle(null)} />;
  return { askForPrintOptions, printOptionsDialog };
};
