/**
 * Dispensing a signed prescription: who is offered it, which stock item a medicine probably is, what is handed over and an estimate of the bill.
 * Pure. The server decides whether dispensing is allowed and works out the real bill.
 */

export const ALL_DISPENSE_PERMISSION = 'prescription.dispense';

export const canDispense = (permissions: readonly string[]): boolean => permissions.includes(ALL_DISPENSE_PERMISSION);

export interface StockItem {
  id: string;
  name: string;
  current_stock: string;
  price: number | null;
  gst_percentage: number | null;
  unit: string | null;
}

export interface DispenseRow { itemId: string | null; quantity: string }
export interface DispenseLine { inventory_item_id: string; quantity: string }

const normalise = (text: string): string => text.toLowerCase().replace(/[^a-z0-9]+/g, '');

/**
 * The stock item a medicine name most likely refers to: the one with the same name, or the only one whose name contains it or is contained in it.
 * When several fit nothing is suggested: picking the wrong stock item hands the wrong medicine to a patient.
 */
export const suggestInventoryItem = <T extends { id: string; name: string }>(medicine: string, items: readonly T[]): T | null => {
  const wanted = normalise(medicine);
  if (!wanted) return null;
  const exact = items.filter((item) => normalise(item.name) === wanted);
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) return null;
  const partial = items.filter((item) => {
    const name = normalise(item.name);
    return name !== '' && (name.includes(wanted) || wanted.includes(name));
  });
  return partial.length === 1 ? partial[0] : null;
};

/** The lines to send: rows with an item and a quantity above zero. */
export const dispenseLinesFrom = (rows: readonly DispenseRow[]): DispenseLine[] =>
  rows.flatMap((row) => {
    const quantity = row.quantity.trim();
    return row.itemId && Number(quantity) > 0 ? [{ inventory_item_id: row.itemId, quantity }] : [];
  });

/** Whether more is asked for than the clinic has on hand. */
export const exceedsStock = (quantity: string, item: Pick<StockItem, 'current_stock'>): boolean => {
  const wanted = Number(quantity);
  return Number.isFinite(wanted) && wanted > Number(item.current_stock);
};

/** An estimate of the bill (price plus tax per line); the server's own total is the one that counts. */
export const billEstimate = (lines: readonly DispenseLine[], items: readonly StockItem[]): number => {
  const total = lines.reduce((sum, line) => {
    const item = items.find((candidate) => candidate.id === line.inventory_item_id);
    if (!item) return sum;
    return sum + Number(line.quantity) * (item.price ?? 0) * (1 + (item.gst_percentage ?? 0) / 100);
  }, 0);
  return Math.round(total * 100) / 100;
};
