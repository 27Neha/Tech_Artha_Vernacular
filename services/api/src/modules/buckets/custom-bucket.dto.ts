import { IsArray, IsNumber, IsOptional, IsString, ValidateNested, ArrayMinSize, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CustomBucketFundDto {
  @IsNumber()
  schemeCode: number;

  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsNumber()
  allocation: number;
}

export class CustomBucketDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomBucketFundDto)
  @ArrayMinSize(1)
  funds: CustomBucketFundDto[];
}
