import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateAttendanceDto, user: any) {
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
    
    return this.prisma.attendance.create({
      data: {
        employeeId,
        checkIn: new Date(data.checkIn),
        checkOut: data.checkOut ? new Date(data.checkOut) : null,
        status: data.status || 'present',
        notes: data.notes,
        tenantId: '', // Set dynamically by Prisma extension
      },
    });
  }

  async findAll(user: any) {
    if (user.role === 'employee') {
      const employee = await this.prisma.employee.findUnique({
        where: { email: user.email },
      });
      if (!employee) return [];
      return this.prisma.attendance.findMany({
        where: { employeeId: employee.id },
        orderBy: { checkIn: 'desc' },
      });
    }
    return this.prisma.attendance.findMany({
      orderBy: { checkIn: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.attendance
      .findUniqueOrThrow({ where: { id } })
      .catch(() => {
        throw new NotFoundException(`Attendance record ${id} not found`);
      });
  }

  async update(id: string, data: UpdateAttendanceDto, user: any) {
    const attendance = await this.findOne(id);
    if (user.role === 'employee') {
      const employee = await this.prisma.employee.findUnique({
        where: { email: user.email },
      });
      if (!employee || attendance.employeeId !== employee.id) {
        throw new ForbiddenException('Cannot modify other employee\'s attendance');
      }
    }
    
    return this.prisma.attendance.update({
      where: { id },
      data: {
        checkIn: data.checkIn ? new Date(data.checkIn) : undefined,
        checkOut: data.checkOut ? new Date(data.checkOut) : undefined,
        status: data.status,
        notes: data.notes,
      },
    });
  }

  async checkOut(id: string, user: any) {
    const attendance = await this.findOne(id);
    if (user.role === 'employee') {
      const employee = await this.prisma.employee.findUnique({
        where: { email: user.email },
      });
      if (!employee || attendance.employeeId !== employee.id) {
        throw new ForbiddenException('Cannot check out for another employee');
      }
    }
    return this.prisma.attendance.update({
      where: { id },
      data: { checkOut: new Date() },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.attendance.delete({ where: { id } });
  }
}
