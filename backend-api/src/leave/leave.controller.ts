import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Req } from '@nestjs/common';
import { LeaveService } from './leave.service';
import { Roles } from '../auth/roles.decorator';

@Controller('leave')
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Roles('tenant_admin', 'employee', 'super_admin')
  @Post()
  create(@Body() dto: any, @Req() req: any) {
    return this.leaveService.create(dto, req.user);
  }

  @Roles('tenant_admin', 'employee', 'super_admin')
  @Get()
  findAll(@Req() req: any) {
    return this.leaveService.findAll(req.user);
  }

  @Roles('tenant_admin', 'super_admin')
  @Patch(':id/status')
  updateStatus(@Param('id', ParseUUIDPipe) id: string, @Body('status') status: string) {
    return this.leaveService.updateStatus(id, status);
  }
}
