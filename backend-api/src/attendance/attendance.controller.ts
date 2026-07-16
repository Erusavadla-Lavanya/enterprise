import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Req } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { Roles } from '../auth/roles.decorator';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Roles('tenant_admin', 'employee', 'super_admin')
  @Post()
  create(@Body() dto: CreateAttendanceDto, @Req() req: any) {
    return this.attendanceService.create(dto, req.user);
  }

  @Roles('tenant_admin', 'employee', 'super_admin')
  @Get()
  findAll(@Req() req: any) {
    return this.attendanceService.findAll(req.user);
  }

  @Roles('tenant_admin', 'employee', 'super_admin')
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.attendanceService.findOne(id);
  }

  @Roles('tenant_admin', 'employee', 'super_admin')
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAttendanceDto, @Req() req: any) {
    return this.attendanceService.update(id, dto, req.user);
  }

  @Roles('tenant_admin', 'employee', 'super_admin')
  @Post(':id/checkout')
  checkOut(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.attendanceService.checkOut(id, req.user);
  }

  @Roles('tenant_admin', 'super_admin')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.attendanceService.remove(id);
  }
}
