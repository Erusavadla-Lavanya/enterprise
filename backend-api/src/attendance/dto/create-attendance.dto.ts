import { IsDateString, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateAttendanceDto {
  @IsUUID() employeeId!: string;
  @IsDateString() checkIn!: string;
  @IsOptional() @IsDateString() checkOut?: string;
  @IsIn(['present', 'absent', 'leave', 'remote']) status!: string;
  @IsOptional() @IsString() notes?: string;
}
