import type { Logger } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import type { CybrillaService } from './cybrilla.service';

/**
 * The bank account's numeric id, which the payment and mandate endpoints require. Stored
 * when the account is opened; accounts opened before that was stored carry only the
 * bac_... id, so it is looked up once at the gateway and saved.
 */
export async function resolveBankAccountOldId(
  prisma: PrismaService,
  cybrilla: CybrillaService,
  account: { id: string; bankAccountId: string | null; bankAccountOldId: number | null },
  logger?: Logger,
): Promise<number | null> {
  if (account.bankAccountOldId != null) return account.bankAccountOldId;
  if (!account.bankAccountId) return null;
  if (/^\d+$/.test(account.bankAccountId)) return Number(account.bankAccountId);
  try {
    const bank = await cybrilla.fetchBankAccount(account.bankAccountId);
    const oldId = Number(bank?.old_id ?? bank?.data?.old_id);
    if (!Number.isInteger(oldId)) return null;
    await prisma.fpMfInvestmentAccount.update({ where: { id: account.id }, data: { bankAccountOldId: oldId } });
    return oldId;
  } catch {
    logger?.warn(`Could not look up the numeric id of bank account ${account.bankAccountId}.`);
    return null;
  }
}
