import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { Roles } from '../auth/roles.decorator';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) { }

  @Roles('tenant_admin', 'super_admin')
  @Post() 
  create(@Body() dto: CreateEmployeeDto) { 
    return this.employeesService.create(dto); 
  }

  @Roles('tenant_admin', 'employee', 'super_admin')
  @Get() 
  findAll() { 
    return this.employeesService.findAll(); 
  }

  @Roles('tenant_admin', 'employee', 'super_admin')
  @Get(':id') 
  findOne(@Param('id', ParseUUIDPipe) id: string) { 
    return this.employeesService.findOne(id); 
  }

  @Roles('tenant_admin', 'super_admin')
  @Patch(':id') 
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateEmployeeDto) { 
    return this.employeesService.update(id, dto); 
  }

  @Roles('tenant_admin', 'super_admin')
  @Delete(':id') 
  remove(@Param('id', ParseUUIDPipe) id: string) { 
    return this.employeesService.remove(id); 
  }
}
