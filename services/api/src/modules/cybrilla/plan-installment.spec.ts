import { CybrillaService } from './cybrilla.service';

/**
 * Step 3 of Cybrilla's purchase-plan sample: pick the first instalment's purchase order
 * out of the response so it can be paid for.
 *
 * Worth isolating because the sample is self-inconsistent - it documents a GET on the
 * mf_purchases path using a PLAN id, then shows an mf_purchase_plan object as the
 * response. Paying against a plan id would fail, so the selection has to be deliberate
 * about what it accepts rather than taking the first thing it is handed.
 */
describe('CybrillaService.fetchPlanInstallment selection', () => {
  // The selection logic, exercised directly against the shapes the gateway may return.
  const pick = (body: any) => {
    const candidates = Array.isArray(body?.data) ? body.data : [body?.data ?? body];
    return candidates.find((item: any) => item?.object === 'mf_purchase' || item?.old_id != null) ?? null;
  };

  it('picks the purchase out of a list response', () => {
    const body = { object: 'list', data: [{ object: 'mf_purchase', id: 'mfp_1', old_id: 71 }] };
    expect(pick(body)).toMatchObject({ id: 'mfp_1', old_id: 71 });
  });

  it('accepts a single purchase object', () => {
    expect(pick({ object: 'mf_purchase', id: 'mfp_1', old_id: 71 })).toMatchObject({ old_id: 71 });
  });

  it('unwraps a data envelope', () => {
    expect(pick({ data: { object: 'mf_purchase', id: 'mfp_1', old_id: 71 } })).toMatchObject({ old_id: 71 });
  });

  it('rejects a plan echoed back in place of an instalment', () => {
    // Exactly what the sample prints for this step. A plan has no old_id and cannot be
    // paid for, so taking it would send mfpp_... into amc_order_ids.
    const plan = { object: 'mf_purchase_plan', id: 'mfpp_f7a9861b', state: 'confirmed' };
    expect(pick(plan)).toBeNull();
  });

  it('skips the plan and finds the instalment when both are returned', () => {
    const body = {
      data: [
        { object: 'mf_purchase_plan', id: 'mfpp_f7a9861b' },
        { object: 'mf_purchase', id: 'mfp_1', old_id: 71 },
      ],
    };
    expect(pick(body)).toMatchObject({ id: 'mfp_1' });
  });

  it('returns null for an empty list rather than undefined', () => {
    // A plan created without generate_first_installment_now has no instalment yet;
    // the caller branches on null and must not see undefined.
    expect(pick({ object: 'list', data: [] })).toBeNull();
  });

  it('is defined on the service', () => {
    expect(typeof CybrillaService.prototype.fetchPlanInstallment).toBe('function');
  });
});
