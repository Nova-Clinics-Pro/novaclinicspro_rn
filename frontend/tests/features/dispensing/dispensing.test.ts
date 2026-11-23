import {
  ALL_DISPENSE_PERMISSION, billEstimate, canDispense, dispenseLinesFrom, exceedsStock, suggestInventoryItem,
} from '../../../features/dispensing/domain/dispensing';

const items = [
  { id: 'a', name: 'COP Tablet X', current_stock: '10', price: 20, gst_percentage: 5, unit: 'pcs' },
  { id: 'b', name: 'Sesame oil', current_stock: '500', price: 1.5, gst_percentage: 0, unit: 'ml' },
  { id: 'c', name: 'Sesame oil (Kerala)', current_stock: '200', price: 2, gst_percentage: 0, unit: 'ml' },
  { id: 'd', name: 'Herbal powder', current_stock: '0', price: 3, gst_percentage: null, unit: 'g' },
];

describe('who is offered dispensing', () => {
  it('needs the dispense permission', () => {
    expect(canDispense([ALL_DISPENSE_PERMISSION, 'invoice.read'])).toBe(true);
    expect(canDispense(['invoice.create', 'prescription.read'])).toBe(false);
    expect(canDispense([])).toBe(false);
  });
});

describe('suggesting the stock item for a medicine', () => {
  it('an exact name, ignoring case, spaces and punctuation, is suggested', () => {
    expect(suggestInventoryItem('cop tablet  x', items)?.id).toBe('a');
    expect(suggestInventoryItem('Sesame Oil', items)?.id).toBe('b');       // exact wins over the longer "Sesame oil (Kerala)"
  });

  it('a name that only partly matches is suggested only when a single item fits', () => {
    expect(suggestInventoryItem('Herbal', items)?.id).toBe('d');
    expect(suggestInventoryItem('Sesame', items)).toBeNull();               // two items fit: nothing is guessed
  });

  it('a medicine the clinic does not stock gets no suggestion', () => {
    expect(suggestInventoryItem('Ashwagandha', items)).toBeNull();
    expect(suggestInventoryItem('', items)).toBeNull();
  });
});

describe('what is handed over', () => {
  it('only rows with an item and a quantity above zero become lines, quantities as the server wants them', () => {
    const lines = dispenseLinesFrom([
      { itemId: 'a', quantity: '2' }, { itemId: null, quantity: '5' }, { itemId: 'b', quantity: '0' }, { itemId: 'b', quantity: '' }, { itemId: 'c', quantity: ' 30.5 ' },
    ]);
    expect(lines).toEqual([{ inventory_item_id: 'a', quantity: '2' }, { inventory_item_id: 'c', quantity: '30.5' }]);
  });

  it('flags a quantity above the stock on hand, and an item with no stock', () => {
    expect(exceedsStock('11', items[0])).toBe(true);
    expect(exceedsStock('10', items[0])).toBe(false);
    expect(exceedsStock('1', items[3])).toBe(true);
    expect(exceedsStock('abc', items[0])).toBe(false);                      // not a number is for the quantity check, not the stock check
  });

  it('estimates the bill from price and tax (the server works out the real one)', () => {
    expect(billEstimate([{ inventory_item_id: 'a', quantity: '2' }, { inventory_item_id: 'b', quantity: '100' }], items)).toBe(192);   // 2*20*1.05 + 100*1.5
    expect(billEstimate([], items)).toBe(0);
    expect(billEstimate([{ inventory_item_id: 'zzz', quantity: '3' }], items)).toBe(0);            // an unknown item adds nothing
  });
});
