import { IsBoolean, IsOptional } from 'class-validator';
import { InvestInBucketDto } from './invest-in-bucket.dto';
import { StartSipDto } from './sip-in-bucket.dto';

/**
 * A single-fund order takes the same investor details as a bucket order. The scheme
 * comes from the URL's MFAPI scheme code and is resolved to an ISIN server-side, so the
 * client never supplies the ISIN that is actually bought.
 */
export class InvestInFundDto extends InvestInBucketDto {
  /**
   * Required when the fund is riskier than the investor's profile. See fund-suitability.
   * Optional at validation so the service can explain the mismatch rather than
   * class-validator saying the field is missing.
   */
  @IsBoolean()
  @IsOptional()
  acknowledgeRiskMismatch?: boolean;
}

export class StartFundSipDto extends StartSipDto {
  @IsBoolean()
  @IsOptional()
  acknowledgeRiskMismatch?: boolean;
}
