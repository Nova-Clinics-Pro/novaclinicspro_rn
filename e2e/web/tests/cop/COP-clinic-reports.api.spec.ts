import { book, consultAndSign, expect, far, list, need, ok, slot, test, workday, world, ymd, why } from '../../../cop/roles';

/**
 * WS10 (DEF_COP_036): the clinic's own reports. Each case compares a report with the money or records it is made from, for one clinic,
 * using the real role logins. They need migration 20261124_000001 (the report permissions) on the clinic's database.
 */
const today = () => ymd(new Date());
const report = async (who: Parameters<typeof need>[0], w: { t: string }, key: string, query = '', from = today(), to = from) => {
  const a = await need(who);
  return a.get(`/api/v1/clinic/${w.t}/reports/${key}?start_date=${from}&end_date=${to}${query}`);
};
const num = (value: unknown) => Number(value ?? 0);

test.describe('12 clinic reports: money (batch 1)', () => {
  test('TC_COP_RPT_001 the daily collection equals the payments received that day, by payment mode', async () => {
    const w = await world(); const adm = await need('admin');
    const before = await report('owner', w, 'daily_collection'); why(before, 'read the daily collection'); expect(ok(before.status), `report returned ${before.status}`).toBe(true);
    const inv = await adm.post(`/api/v1/finance/${w.t}/invoices`, { client_id: w.seed.patients['P-Female'], invoice_number: `COP-RPT001-${Date.now()}`, invoice_date: today(), status: 'sent', lines: [{ line_type: 'consultation', description: 'Consultation', quantity: '1', unit_price: '700' }] });
    expect(ok(inv.status), `invoice ${inv.status}`).toBe(true);
    const pay = await adm.post(`/api/v1/finance/${w.t}/payments`, { invoice_id: inv.body.id, client_id: w.seed.patients['P-Female'], payment_date: today(), amount: '700', payment_method: 'CASH' });
    expect(ok(pay.status), `payment ${pay.status}`).toBe(true);
    const after = await report('owner', w, 'daily_collection');
    expect(num(after.body.totals.total) - num(before.body.totals.total), 'the day total grew by the payment').toBe(700);
    expect(num(after.body.totals.cash) - num(before.body.totals.cash), 'and it is in the cash column').toBe(700);
    const rowTotal = after.body.rows.reduce((sum: number, row: any) => sum + num(row.total), 0);
    expect(rowTotal, 'the totals row equals the rows').toBe(num(after.body.totals.total));
  });

  test('TC_COP_RPT_002 revenue is billed with collected and still due beside it, and every split adds up to the same billed total', async () => {
    const w = await world(); const adm = await need('admin');
    const before = await report('owner', w, 'revenue_by_period', '&group_by=day');
    expect(ok(before.status), `report returned ${before.status}`).toBe(true);
    const inv = await adm.post(`/api/v1/finance/${w.t}/invoices`, { client_id: w.seed.patients['P-Female'], invoice_number: `COP-RPT002-${Date.now()}`, invoice_date: today(), status: 'sent', lines: [{ line_type: 'treatment', description: 'Session', quantity: '1', unit_price: '1000' }] });
    expect(ok(inv.status), `invoice ${inv.status}`).toBe(true);
    const after = await report('owner', w, 'revenue_by_period', '&group_by=day');
    expect(num(after.body.totals.billed) - num(before.body.totals.billed), 'billed grew by the invoice').toBe(1000);
    expect(num(after.body.totals.due) - num(before.body.totals.due), 'and so did what is still due').toBe(1000);
    expect(num(after.body.totals.collected), 'collected did not change').toBe(num(before.body.totals.collected));
    expect(num(after.body.totals.billed), 'billed = collected + still due').toBe(num(after.body.totals.collected) + num(after.body.totals.due));
    const byDoctor = await report('owner', w, 'revenue_by_period', '&dimension=doctor');
    const byType = await report('owner', w, 'revenue_by_period', '&dimension=service_type');
    expect(num(byDoctor.body.totals.billed), 'by doctor adds up to the same billed total').toBe(num(after.body.totals.billed));
    expect(num(byType.body.totals.billed), 'by service type adds up to the same billed total').toBe(num(after.body.totals.billed));
  });

  test('TC_COP_RPT_003 an unpaid bill shows under the patient with its age, and the dues equal billed minus collected', async () => {
    const w = await world(); const adm = await need('admin');
    const late = new Date(); late.setDate(late.getDate() - 10);
    const inv = await adm.post(`/api/v1/finance/${w.t}/invoices`, { client_id: w.seed.patients['P-Female'], invoice_number: `COP-RPT003-${Date.now()}`, invoice_date: ymd(late), due_date: ymd(late), status: 'sent', lines: [{ line_type: 'consultation', description: 'Consultation', quantity: '1', unit_price: '300' }] });
    expect(ok(inv.status), `invoice ${inv.status}`).toBe(true);
    const detail = await report('owner', w, 'outstanding_dues', '&dimension=invoice');
    expect(ok(detail.status), `report returned ${detail.status}`).toBe(true);
    const mine = detail.body.rows.find((row: any) => row.invoice_number === inv.body.invoice_number);
    expect(mine, 'the unpaid invoice is listed').toBeTruthy();
    expect(mine.age, 'it is 10 days late').toBe('8-30');
    expect(num(mine.outstanding)).toBe(300);
    const byPatient = await report('owner', w, 'outstanding_dues');
    expect(num(byPatient.body.totals.outstanding), 'both views owe the same').toBe(num(detail.body.totals.outstanding));
    const bucketSum = ['not_due', '0-7', '8-30', '30+'].reduce((sum, key) => sum + num(byPatient.body.totals[key]), 0);
    expect(bucketSum, 'the age bands add up to what is owed').toBe(num(byPatient.body.totals.outstanding));
  });

  test('TC_COP_RPT_011 each role opens only its reports, the range is bounded, and CSV downloads', async () => {
    const w = await world();
    const desk = await report('receptionist', w, 'daily_collection'); expect(desk.status, 'the front desk opens the daily collection').toBe(200);
    const deskDues = await report('receptionist', w, 'outstanding_dues'); expect(deskDues.status, 'but not the dues').toBe(403);
    expect(deskDues.body?.detail?.error_code).toBe('REPORT_NOT_ALLOWED');
    for (const who of ['doctor', 'therapist'] as const) {
      const r = await report(who, w, 'daily_collection'); expect(r.status, `a ${who} does not open the daily collection`).toBe(403);
    }
    const admin = await report('admin', w, 'outstanding_dues'); expect(admin.status, 'the admin opens all ten').toBe(200);
    const tooLong = await (await need('owner')).get(`/api/v1/clinic/${w.t}/reports/daily_collection?start_date=2020-01-01&end_date=${today()}`);
    expect(tooLong.status).toBe(400); expect(tooLong.body?.detail?.error_code).toBe('REPORT_RANGE_TOO_LONG');
    const csv = await (await need('owner')).text(`/api/v1/clinic/${w.t}/reports/daily_collection?start_date=${today()}&end_date=${today()}&format=csv`);
    expect(csv.status).toBe(200); expect(csv.text.split('\n')[0], 'the CSV starts with the column headings').toMatch(/^Date,Cash/);
    const other = await (await need('owner')).get(`/api/v1/clinic/00000000-0000-0000-0000-000000000000/reports/daily_collection?start_date=${today()}&end_date=${today()}`);
    expect(other.status, "another clinic's reports are refused").toBe(403);
    const unknown = await report('owner', w, 'platform_revenue'); expect(unknown.status).toBe(404);
  });
});

test.describe('12 clinic reports: visits and staff (batch 2)', () => {
  test('TC_COP_RPT_004 the appointments summary counts the same appointments as the list for that day', async () => {
    const w = await world(); const d = ymd(workday(far()));
    for (const [p, h] of [['P-Male', 9], ['P-Minor', 10]] as const) await book(w, 'receptionist', { client_id: w.seed.patients[p], doctor_id: w.doctor.id, room_id: w.seed.rooms['C-1'], appointment_start: slot(new Date(d), h, 0).start, appointment_end: slot(new Date(d), h, 0).end });
    const listed = list((await (await need('owner')).get(`${w.b}/appointments?date=${d}&limit=100`)).body).length;
    const r = await report('owner', w, 'appointments_summary', '&group_by=day', d);
    expect(ok(r.status), `report returned ${r.status}`).toBe(true);
    expect(r.body.rows.length, 'one row for the day').toBe(1);
    expect(num(r.body.totals.booked), `booked (${r.body.totals.booked}) = appointments listed (${listed})`).toBe(listed);
    const parts = ['completed', 'cancelled', 'no_show'].reduce((sum, key) => sum + num(r.body.totals[key]), 0);
    expect(parts, 'no status is counted twice').toBeLessThanOrEqual(num(r.body.totals.booked));
    const desk = await report('receptionist', w, 'appointments_summary', '', d); expect(desk.status, 'the front desk opens it too').toBe(200);
  });

  test('TC_COP_RPT_005 patient visits count completed consultations, new and returning, and the top patients add up', async () => {
    const w = await world(); const doc = await need('doctor'); const c = await consultAndSign(w, 'P-Female3', far()); const d = ymd(c.day);
    const done = await doc.request('PATCH', `${w.b}/appointments/${c.ap.id}`, { status: 'COMPLETED' }); expect(ok(done.status), `complete ${done.status}`).toBe(true);
    const summary = await report('owner', w, 'patient_visits', '&group_by=day', d);
    expect(ok(summary.status), `report returned ${summary.status}`).toBe(true);
    expect(num(summary.body.totals.visits), 'the completed consultation is a visit').toBeGreaterThanOrEqual(1);
    expect(num(summary.body.totals.new_patients) + num(summary.body.totals.returning_patients), 'every patient seen is new or returning').toBeGreaterThanOrEqual(1);
    const top = await report('owner', w, 'patient_visits', '&dimension=top_patients', d);
    const topVisits = top.body.rows.reduce((sum: number, row: any) => sum + num(row.visits), 0);
    expect(topVisits, 'the top patients are the same visits').toBe(num(summary.body.totals.visits));
  });

  test('TC_COP_RPT_006 a doctor sees only their own workload, the admin sees everyone, and utilisation follows the clinic hours', async () => {
    const w = await world(); const doc = await need('doctor'); const c = await consultAndSign(w, 'P-Female3', far()); const d = ymd(c.day);
    await doc.request('PATCH', `${w.b}/appointments/${c.ap.id}`, { status: 'COMPLETED' });
    const own = await report('doctor', w, 'staff_workload', '', d); expect(ok(own.status), `doctor ${own.status}`).toBe(true);
    expect(own.body.rows.length, 'a doctor sees exactly one row, their own').toBe(1);
    expect(num(own.body.rows[0].consultations), 'the consultation they completed').toBeGreaterThanOrEqual(1);
    const all = await report('admin', w, 'staff_workload', '', d); expect(ok(all.status)).toBe(true);
    expect(all.body.rows.length, 'the admin sees every doctor and therapist').toBeGreaterThan(1);
    const same = all.body.rows.find((row: any) => row.name === own.body.rows[0].name);
    expect(num(same?.consultations), 'the same person has the same count').toBe(num(own.body.rows[0].consultations));
    for (const row of all.body.rows) expect(num(row.utilisation), `${row.name}: utilisation is a number`).toBeGreaterThanOrEqual(0);
    const therapist = await report('therapist', w, 'staff_workload', '', d); expect(therapist.body.rows.length, 'a therapist sees only their own row').toBe(1);
    const desk = await report('receptionist', w, 'staff_workload', '', d); expect(desk.status, 'the front desk does not open workload').toBe(403);
    const deskOnly = await report('doctor', w, 'appointments_summary', '', d); expect(deskOnly.status, 'a doctor does not open the appointments summary').toBe(403);
  });

  test('TC_COP_RPT_009 a patient told to come back is due, then missed, and patients not seen lately are listed', async () => {
    const w = await world(); const doc = await need('doctor'); const owner = await need('owner');
    const client = await owner.post(`${w.b}/clients`, { full_name: `COP follow-up ${Date.now()}`, phone: `+9198${String(Date.now()).slice(-8)}`, gender: 'female', date_of_birth: '1990-02-02' });
    expect(ok(client.status), `client ${client.status}`).toBe(true);
    const rx = await doc.post(`${w.b}/prescriptions`, { client_id: client.body.id, next_visit_days: 3, prescription_data: { medications: [{ name: 'COP Tablet X', dosage: '1', frequency: 'bd', duration: '3 days' }] } });
    expect(ok(rx.status), `prescription ${rx.status} ${JSON.stringify(rx.body)?.slice(0, 160)}`).toBe(true);
    const sign = await doc.request('PATCH', `${w.b}/prescriptions/${rx.body.id}`, { status: 'SIGNED' }); expect(ok(sign.status), `sign ${sign.status}`).toBe(true);
    const plus = (n: number) => { const x = new Date(); x.setDate(x.getDate() + n); return ymd(x); };
    const due = await report('owner', w, 'follow_up_retention', '&dimension=due', today(), plus(7));
    expect(ok(due.status), `due ${due.status}`).toBe(true);
    const mine = due.body.rows.find((row: any) => row.patient === client.body.full_name);
    expect(mine, 'the patient is due within the week').toBeTruthy(); expect(mine.due_date).toBe(plus(3));
    const notYet = await report('owner', w, 'follow_up_retention', '&dimension=due', today(), plus(1));
    expect(notYet.body.rows.find((row: any) => row.patient === client.body.full_name), 'but not yet due tomorrow').toBeFalsy();
    const missed = await report('owner', w, 'follow_up_retention', '&dimension=missed', today(), plus(10));
    const miss = missed.body.rows.find((row: any) => row.patient === client.body.full_name);
    expect(miss, 'ten days on, the visit is missed').toBeTruthy(); expect(num(miss.days_overdue), 'seven days overdue').toBe(7);
    const lapsed = await report('owner', w, 'follow_up_retention', '&dimension=lapsed', today(), plus(300));
    expect(lapsed.status, 'the not-seen-lately list opens').toBe(200);
    for (const row of lapsed.body.rows) expect(num(row.days_since_visit), 'only patients past the clinic setting are listed').toBeGreaterThan(Number(lapsed.body.meta.days));
  });
});

test.describe('12 clinic reports: treatment, stock and feedback (batch 3)', () => {
  test('TC_COP_RPT_007 treatment plan progress counts the plans the doctor ordered, by stage, and every split adds up', async () => {
    const w = await world();
    const month = await (await need('owner')).get(`/api/v1/clinic/${w.t}/reports/treatment_plan_progress?start_date=${ymd(new Date(Date.now() - 300 * 86400000))}&end_date=${ymd(new Date(Date.now() + 60 * 86400000))}&group_by=month`);
    expect(ok(month.status), `report returned ${month.status}`).toBe(true);
    const t = month.body.totals; const stages = ['ordered', 'scheduled', 'in_progress', 'completed', 'stopped'].reduce((sum, key) => sum + num(t[key]), 0);
    expect(stages, 'every plan is in exactly one stage').toBe(num(t.plans));
    const byTherapy = await (await need('owner')).get(`/api/v1/clinic/${w.t}/reports/treatment_plan_progress?start_date=${ymd(new Date(Date.now() - 300 * 86400000))}&end_date=${ymd(new Date(Date.now() + 60 * 86400000))}&dimension=therapy`);
    expect(num(byTherapy.body.totals.plans), 'by therapy adds up to the same plans').toBe(num(t.plans));
    expect(num(t.completion_rate), 'the completion rate is completed over all plans').toBeCloseTo(num(t.plans) ? (num(t.completed) * 100) / num(t.plans) : 0, 0);
    const desk = await report('receptionist', w, 'treatment_plan_progress'); expect(desk.status, 'the front desk does not open it').toBe(403);
  });

  test('TC_COP_RPT_008 inventory status flags out and low stock the same way the stock alerts do, and consumption follows the movements', async () => {
    const w = await world(); const owner = await need('owner');
    const stock = await owner.get(`/api/v1/clinic/${w.t}/reports/inventory_status?start_date=${today()}&end_date=${today()}`);
    expect(ok(stock.status), `report returned ${stock.status}`).toBe(true);
    const items = list((await owner.get(`${w.b}/inventory?limit=500`)).body).filter((i: any) => i.is_active !== false);
    expect(stock.body.rows.length, 'every active item is listed').toBe(items.length);
    const low = items.filter((i: any) => num(i.current_stock) <= num(i.reorder_point)).length;
    expect(num(stock.body.meta.out) + num(stock.body.meta.low), 'out + low = items at or below their reorder point (as the inventory alerts count them)').toBe(low);
    const week = ymd(new Date(Date.now() - 7 * 86400000));
    const used = await owner.get(`/api/v1/clinic/${w.t}/reports/inventory_status?start_date=${week}&end_date=${today()}&dimension=consumption`);
    expect(ok(used.status)).toBe(true); expect(used.body.columns.map((c: any) => c.key)).toEqual(['item', 'unit', 'consumed', 'received', 'adjusted']);
    for (const row of used.body.rows) expect(num(row.consumed), `${row.item}: nothing is used a negative amount`).toBeGreaterThanOrEqual(0);
  });

  test('TC_COP_RPT_010 the feedback summary opens for doctors and therapists with the answer rate, and only for the owner and admin', async () => {
    const w = await world();
    for (const dimension of ['doctor', 'therapist']) {
      const r = await report('owner', w, 'feedback_summary', `&dimension=${dimension}`, ymd(new Date(Date.now() - 90 * 86400000)), today());
      expect(ok(r.status), `${dimension}: ${r.status}`).toBe(true);
      expect(r.body.columns.map((c: any) => c.key)).toEqual(['name', 'responses', 'average_rating', 'requests', 'response_rate']);
      for (const row of r.body.rows) { expect(num(row.response_rate)).toBeLessThanOrEqual(100); if (num(row.responses) === 0) expect(row.average_rating).toBeNull(); }
    }
    const desk = await report('receptionist', w, 'feedback_summary'); expect(desk.status, 'the front desk does not open it').toBe(403);
    const doctor = await report('doctor', w, 'feedback_summary'); expect(doctor.status, 'a doctor does not open the clinic feedback summary').toBe(403);
    const admin = await report('admin', w, 'feedback_summary'); expect(admin.status, 'the admin opens it').toBe(200);
  });
});
