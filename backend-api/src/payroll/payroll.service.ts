import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePayrollDto } from './dto/create-payroll.dto';
import { UpdatePayrollDto } from './dto/update-payroll.dto';

@Injectable()
export class PayrollService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreatePayrollDto) {
    return this.prisma.payroll.create({ data });
  }

  async findAll(user: any) {
    if (user.role === 'employee') {
      // Resolve the employee record
      const employee = await this.prisma.employee.findUnique({
        where: { email: user.email },
      });
      if (!employee) return [];
      
      return this.prisma.payroll.findMany({
        where: { employeeId: employee.id },
      });
    }
    
    // Otherwise, return all for the active tenant (Prisma ORM extension will auto-scope this by tenantId)
    return this.prisma.payroll.findMany();
  }

  async findOne(id: string) {
    return this.prisma.payroll
      .findUniqueOrThrow({ where: { id } })
      .catch(() => {
        throw new NotFoundException(`Payroll record ${id} not found`);
      });
  }

  async update(id: string, data: UpdatePayrollDto) {
    await this.findOne(id);
    return this.prisma.payroll.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.payroll.delete({ where: { id } });
  }
}
