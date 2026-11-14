/** The part of an iframe the web print preview needs; lets the print logic be tested without a DOM. */
export interface PrintableFrame {
  contentWindow?: { focus: () => void; print: () => void } | null;
}

/**
 * Print the document shown in the preview iframe. Printing the iframe itself (rather than opening a pop-up window and
 * writing the HTML into it) cannot be blocked by a pop-up blocker and prints only the document, not the app around it.
 * Returns false when there is nothing to print (the frame is missing or has no window yet).
 */
export const printFrame = (frame: PrintableFrame | null | undefined): boolean => {
  const target = frame?.contentWindow;
  if (!target) return false;
  target.focus();
  target.print();
  return true;
};
