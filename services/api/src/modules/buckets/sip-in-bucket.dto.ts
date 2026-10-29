import { IsIn, IsInt, Max, Min } from 'class-validator';
import { InvestInBucketDto } from './invest-in-bucket.dto';

/**
 * A SIP needs everything a lumpsum does, plus the schedule.
 *
 * /v2/mf_purchase_plans accepts ten frequencies in general, but plans go through the
 * ONDC gateway, which supports only these three (per the purchase plan API reference).
 * Anything else would be accepted here and then rejected at the gateway. Case sensitive.
 */
export const SIP_FREQUENCIES = ['daily', 'calendar_day_daily', 'monthly'] as const;

export class StartSipDto extends InvestInBucketDto {
  @IsIn(SIP_FREQUENCIES as unknown as string[])
  frequency: (typeof SIP_FREQUENCIES)[number];

  /**
   * Day of the month the instalment is collected. Cybrilla rejects 29-31.
   * Narrows the optional field on InvestInBucketDto to a required one - a lumpsum has
   * no instalment day, a SIP must have one.
   */
  @IsInt()
  @Min(1)
  @Max(28)
  declare installmentDay: number;

  @IsInt()
  @Min(1)
  numberOfInstallments: number;
}
