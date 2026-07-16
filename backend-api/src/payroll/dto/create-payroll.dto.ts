import { IsDateString, IsIn, IsNumber, IsString, IsUUID, Min } from 'class-validator';

export class CreatePayrollDto {
  @IsUUID() employeeId!: string;
  @IsDateString() period!: string;
  @IsNumber() @Min(0) grossAmount!: number;
  @IsNumber() @Min(0) deductions!: number;
  @IsNumber() @Min(0) netAmount!: number;
  @IsIn(['draft', 'processed', 'paid']) status!: string;
}
