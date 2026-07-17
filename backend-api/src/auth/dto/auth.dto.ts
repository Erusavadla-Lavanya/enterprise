import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

export class RegisterTenantDto {
  @IsString()
  companyName!: string;

  @IsString()
  domain!: string;

  @IsEmail()
  adminEmail!: string;

  @IsString()
  @IsOptional()
  subscriptionPlan?: string;

  @IsString()
  @IsOptional()
  @MinLength(6)
  password?: string;
}
