import { IsIn, IsInt, Max, Min } from 'class-validator';
import { InvestInBucketDto } from './invest-in-bucket.dto';

/**
 * A SIP needs everything a lumpsum does, plus the schedule.
 *
 * The frequency list is exactly what /v2/mf_purchase_plans accepts - taken from the
 * gateway's own validation error rather than the docs, which were truncated. It is
 * case sensitive.
 */
export const SIP_FREQUENCIES = [
  'calendar_day_daily',
  'daily',
  'day_in_a_week',
  'four_times_a_month',
  'day_in_a_fortnight',
  'twice_a_month',
  'monthly',
  'quarterly',
  'half_yearly',
  'yearly',
] as const;

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
