import { IsEmail, IsIn, IsString, MinLength } from 'class-validator';

export class CreateAuthDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  passwordHash!: string;

  @IsIn(['admin', 'manager', 'employee'])
  role!: string;
}
