import { IsEmail, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class InvestInBucketDto {
  @IsNumber()
  @Min(100)
  amount: number;

  @IsInt()
  @Min(1)
  @Max(28)
  @IsOptional()
  installmentDay?: number;

  @IsIn(['male', 'female', 'transgender'])
  gender: 'male' | 'female' | 'transgender';

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(3)
  bankAccountHolderName: string;

  @IsString()
  @MinLength(5)
  bankAccountNumber: string;

  @IsString()
  @MinLength(11)
  ifscCode: string;

  @IsIn(['savings', 'current'])
  @IsOptional()
  accountType?: 'savings' | 'current';

  @IsString()
  @MinLength(3)
  addressLine1!: string;

  @IsString()
  @MinLength(6)
  postalCode!: string;
}
