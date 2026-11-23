/** What the user chooses before printing, and how it reaches the print endpoints. */

/** Plain paper: the clinic's own header and footer are printed. Letterhead: the paper already carries them, so only the document is printed. */
export type PrintPaper = 'plain' | 'letterhead';
export type PrintMode = 'FULL' | 'BODY_ONLY';

export interface PrintOptions {
  paper: PrintPaper;
  /** The language the document is printed in (omitted for English, the server default). */
  locale?: string;
}

export interface PrintQuery {
  mode: PrintMode;
  locale?: string;
}

export const printModeForPaper = (paper: PrintPaper): PrintMode => (paper === 'letterhead' ? 'BODY_ONLY' : 'FULL');

/** The locale to ask the server for: the app's language, or nothing for English (which is what the server prints by default). */
export const printLocaleFor = (appLocale: string): string | undefined => (appLocale && !appLocale.toLowerCase().startsWith('en') ? appLocale : undefined);

export const printQuery = (options: PrintOptions): PrintQuery => ({
  mode: printModeForPaper(options.paper),
  ...(options.locale ? { locale: options.locale } : {}),
});
