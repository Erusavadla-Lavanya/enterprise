import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LeaveService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: any, user: any) {
    let employeeId = data.employeeId;
    if (user.role === 'employee') {
      const employee = await this.prisma.employee.findUnique({
        where: { email: user.email },
      });
      if (!employee) {
        throw new BadRequestException('Employee record not found');
      }
      employeeId = employee.id;
    }

    return this.prisma.leave.create({
      data: {
        employeeId,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        status: 'pending',
        type: data.type || 'annual',
        tenantId: '', // Set dynamically by Prisma extension
      }
    });
  }

  async findAll(user: any) {
    if (user.role === 'employee') {
      const employee = await this.prisma.employee.findUnique({
        where: { email: user.email },
      });
      if (!employee) return [];
      return this.prisma.leave.findMany({
        where: { employeeId: employee.id },
        orderBy: { startDate: 'desc' }
      });
    }
    return this.prisma.leave.findMany({
      orderBy: { startDate: 'desc' }
    });
  }

  async updateStatus(id: string, status: string) {
    const leave = await this.prisma.leave.findUnique({ where: { id } });
    if (!leave) {
      throw new NotFoundException('Leave application not found');
    }

    const updated = await this.prisma.leave.update({
      where: { id },
      data: { status }
    });

    await this.prisma.systemLog.create({
      data: {
        action: 'LEAVE_STATUS_UPDATE',
        details: `Leave application ${id} status updated to: ${status}`,
      }
    });

    return updated;
  }
}
