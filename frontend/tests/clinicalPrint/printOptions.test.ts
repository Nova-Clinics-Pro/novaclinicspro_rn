import { printModeForPaper, printLocaleFor, printQuery } from '../../core/clinicalPrint/printOptions';

describe('print options', () => {
  it('plain paper prints the clinic letterhead itself; pre-printed letterhead paper prints the body only', () => {
    expect(printModeForPaper('plain')).toBe('FULL');
    expect(printModeForPaper('letterhead')).toBe('BODY_ONLY');
  });

  it('asks the server for the app language, except English which is the default', () => {
    expect(printLocaleFor('hi-IN')).toBe('hi-IN');
    expect(printLocaleFor('te-IN')).toBe('te-IN');
    expect(printLocaleFor('en-US')).toBeUndefined();
    expect(printLocaleFor('en-IN')).toBeUndefined();
    expect(printLocaleFor('')).toBeUndefined();
  });

  it('builds the query the print endpoints take, leaving out what is not chosen', () => {
    expect(printQuery({ paper: 'letterhead', locale: 'hi-IN' })).toEqual({ mode: 'BODY_ONLY', locale: 'hi-IN' });
    expect(printQuery({ paper: 'plain' })).toEqual({ mode: 'FULL' });
  });
});
