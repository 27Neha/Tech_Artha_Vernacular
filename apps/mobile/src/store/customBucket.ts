import * as SecureStore from 'expo-secure-store';

/**
 * Draft custom bucket, held between the fund detail screen and the custom bucket screen.
 *
 * Mirrors the web's `customBucketFunds` localStorage entry (apps/web/app/funds/[id] and
 * apps/web/app/buckets/custom) so the two apps behave the same: you add funds while
 * browsing, then balance the allocations and save.
 *
 * Persisted so a draft survives the app being backgrounded mid-build.
 */

const DRAFT_KEY = 'techartha.customBucketDraft';

export type DraftFund = {
  schemeCode: number;
  name: string;
  category?: string;
  /** Whole percent of the bucket. The API requires these to total exactly 100. */
  allocation: number;
};

/**
 * Splits 100% as evenly as possible, giving the remainder to the first funds so the
 * total is always exactly 100 - the API rejects anything else.
 */
export function autoBalance(funds: DraftFund[]): DraftFund[] {
  if (funds.length === 0) return [];
  const equalShare = Math.floor(100 / funds.length);
  let remainder = 100 % funds.length;
  return funds.map((fund) => {
    let allocation = equalShare;
    if (remainder > 0) {
      allocation += 1;
      remainder -= 1;
    }
    return { ...fund, allocation };
  });
}

export async function readDraft(): Promise<DraftFund[]> {
  try {
    const raw = await SecureStore.getItemAsync(DRAFT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DraftFund[]) : [];
  } catch {
    return [];
  }
}

export async function writeDraft(funds: DraftFund[]): Promise<void> {
  try {
    if (funds.length === 0) await SecureStore.deleteItemAsync(DRAFT_KEY);
    else await SecureStore.setItemAsync(DRAFT_KEY, JSON.stringify(funds));
  } catch {
    // A draft that cannot be persisted is still usable in memory for this session.
  }
}

/** Adds a fund if it is not already in the draft, then rebalances. Returns the new draft. */
export async function addToDraft(fund: Omit<DraftFund, 'allocation'>): Promise<DraftFund[]> {
  const current = await readDraft();
  if (current.some((f) => f.schemeCode === fund.schemeCode)) return current;
  const next = autoBalance([...current, { ...fund, allocation: 0 }]);
  await writeDraft(next);
  return next;
}
