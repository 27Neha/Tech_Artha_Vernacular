import { IsArray, IsNumber, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class CustomBucketFundDto {
  @IsNumber()
  schemeCode: number;

  @IsNumber()
  allocation: number;
}

export class CustomBucketDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomBucketFundDto)
  @ArrayMinSize(1)
  funds: CustomBucketFundDto[];
}
