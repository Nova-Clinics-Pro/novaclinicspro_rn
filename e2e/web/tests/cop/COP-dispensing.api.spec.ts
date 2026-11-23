import { consultAndSign, expect, far, list, need, ok, stock, test, world, ymd } from '../../../cop/roles';

/**
 * WS11 (DEF_COP_003): the dispensing queue and who may dispense. They need migration 20261125_000001 (the prescription.dispense
 * permission) on the clinic's database. There is no Pharmacist login on the Testing project: that role is covered by the policy tests.
 */
const signedPrescription = async (w: Awaited<ReturnType<typeof world>>, patient: string) => {
  const doc = await need('doctor'); const c = await consultAndSign(w, patient, far());
  const rx = await doc.post(`${w.b}/prescriptions`, { client_id: w.seed.patients[patient], episode_id: c.ep.id, appointment_id: c.ap.id, prescription_data: { medications: [{ name: 'COP Tablet X', dosage: '1', frequency: 'bd', duration: '3 days' }] } });
  expect(ok(rx.status), `prescription ${rx.status}`).toBe(true);
  const sign = await doc.request('PATCH', `${w.b}/prescriptions/${rx.body.id}`, { status: 'SIGNED' }); expect(ok(sign.status), `sign ${sign.status}`).toBe(true);
  return rx.body.id as string;
};
const TABLET = 'COP Tablet X (below reorder point)';

test.describe('13 dispensing (DEF_COP_003)', () => {
  test('TC_COP_DSP_001 a signed prescription is in the queue until it is dispensed, then it shows its bill, and stock leaves when it is paid', async () => {
    const w = await world(); const adm = await need('admin'); const id = await signedPrescription(w, 'P-Male');
    const queue = await adm.get(`${w.b}/dispensing/ready`);
    expect(ok(queue.status), `queue ${queue.status}`).toBe(true);
    const mine = queue.body.items.find((item: any) => item.prescription_id === id);
    expect(mine, 'the signed prescription is waiting to be dispensed').toBeTruthy();
    expect(mine.medicines, 'with the medicine to hand over').toEqual(['COP Tablet X']);
    expect((await adm.get(`${w.b}/dispensing/prescriptions/${id}`)).body.dispensed, 'not dispensed yet').toBe(false);

    const s0 = await stock(w, TABLET);
    const r = await adm.post(`${w.b}/prescriptions/${id}/dispense`, { lines: [{ inventory_item_id: w.seed.inventory[TABLET], quantity: '1' }] });
    expect(ok(r.status), `dispense ${r.status} ${JSON.stringify(r.body)?.slice(0, 160)}`).toBe(true);
    const after = (await adm.get(`${w.b}/dispensing/ready`)).body.items;
    expect(after.find((item: any) => item.prescription_id === id), 'dispensed: out of the queue').toBeFalsy();
    const status = (await adm.get(`${w.b}/dispensing/prescriptions/${id}`)).body;
    expect(status.dispensed).toBe(true); expect(status.invoice_id, 'it links to the bill').toBe(r.body.id);
    expect(await stock(w, TABLET), 'stock does not move until the bill is paid').toBe(s0);
    expect((await adm.post(`${w.b}/prescriptions/${id}/dispense`, { lines: [{ inventory_item_id: w.seed.inventory[TABLET], quantity: '1' }] })).status, 'dispensed once').toBe(409);
    const pay = await adm.post(`/api/v1/finance/${w.t}/payments`, { invoice_id: r.body.id, client_id: w.seed.patients['P-Male'], payment_date: ymd(new Date()), amount: String(r.body.total_amount), payment_method: 'CASH' });
    expect(ok(pay.status), `payment ${pay.status}`).toBe(true);
    let left = s0; for (let i = 0; i < 20 && left === s0; i++) { await new Promise((done) => setTimeout(done, 1000)); left = await stock(w, TABLET); }
    expect(s0 - left, 'the tablet leaves stock once the bill is paid').toBe(1);
  });

  test('TC_COP_DSP_002 the front desk and admin may dispense and see the queue; a doctor and a therapist may not', async () => {
    const w = await world(); const id = await signedPrescription(w, 'P-Female');
    for (const who of ['receptionist', 'admin', 'owner'] as const) {
      const a = await need(who); const r = await a.get(`${w.b}/dispensing/ready`);
      expect(r.status, `${who} sees the queue`).toBe(200);
    }
    for (const who of ['doctor', 'therapist'] as const) {
      const a = await need(who);
      expect((await a.get(`${w.b}/dispensing/ready`)).status, `${who} does not see the queue`).toBe(403);
      const r = await a.post(`${w.b}/prescriptions/${id}/dispense`, { lines: [{ inventory_item_id: w.seed.inventory[TABLET], quantity: '1' }] });
      expect(r.status, `${who} cannot dispense`).toBe(403);
    }
    const desk = await need('receptionist');
    const r = await desk.post(`${w.b}/prescriptions/${id}/dispense`, { lines: [{ inventory_item_id: w.seed.inventory[TABLET], quantity: '1' }] });
    expect(ok(r.status), `the front desk dispenses: ${r.status} ${JSON.stringify(r.body)?.slice(0, 160)}`).toBe(true);
  });

  test('TC_COP_DSP_003 an unsigned prescription cannot be dispensed and another clinic is refused', async () => {
    const w = await world(); const doc = await need('doctor'); const adm = await need('admin');
    const draft = await doc.post(`${w.b}/prescriptions`, { client_id: w.seed.patients['P-Male'], prescription_data: { medications: [{ name: 'COP Tablet X' }] } });
    expect(ok(draft.status), `draft ${draft.status}`).toBe(true);
    const r = await adm.post(`${w.b}/prescriptions/${draft.body.id}/dispense`, { lines: [{ inventory_item_id: w.seed.inventory[TABLET], quantity: '1' }] });
    expect(r.status, 'a draft is not dispensable').toBe(409);
    expect((await adm.get(`${w.b}/dispensing/ready`)).body.items.find((item: any) => item.prescription_id === draft.body.id), 'and it is not in the queue').toBeFalsy();
    const other = await adm.get('/api/v1/clinic/00000000-0000-0000-0000-000000000000/dispensing/ready');
    expect(other.status, "another clinic's queue is refused").toBe(403);
  });
});
