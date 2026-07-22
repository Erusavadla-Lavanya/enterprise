import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { AuthService } from '../auth/auth.service';
import { RedisService } from '../auth/redis.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly redisService: RedisService,
  ) {}

  async create(data: CreateEmployeeDto) {
    const { password, ...employeeData } = data as any;
    employeeData.email = employeeData.email.toLowerCase().trim();

    // 1. Create the Employee profile record
    const employee = await this.prisma.employee.create({
      data: {
        ...employeeData,
        tenantId: '', // Set dynamically by Prisma extension
      },
    });

    // 2. Create corresponding Auth credentials
    const rawPassword = password || 'Password@123';
    const passwordHash = bcrypt.hashSync(rawPassword, 10);
    const auth = await this.prisma.auth.create({
      data: {
        email: employeeData.email,
        passwordHash,
        role: 'employee',
        tenantId: employee.tenantId,
      },
      include: { company: true },
    });

    // Cache user credentials in Redis
    await this.redisService.set(`user:${employeeData.email}`, JSON.stringify(auth));

    // 3. Provision employee in AWS Cognito if configured
    await this.authService.cognitoCreateUser(employeeData.email, 'employee', employee.tenantId);

    return employee;
  }

  async findAll() {
    return this.prisma.employee.findMany();
  }

  async findOne(id: string) {
    return this.prisma.employee
      .findUniqueOrThrow({ where: { id } })
      .catch(() => {
        throw new NotFoundException(`Employee ${id} not found`);
      });
  }

  async update(id: string, data: UpdateEmployeeDto) {
    const oldEmployee = await this.findOne(id);
    const { password, ...employeeData } = data as any;
    if (employeeData.email) {
      employeeData.email = employeeData.email.toLowerCase().trim();
    }

    // Update the Employee record
    const updatedEmployee = await this.prisma.employee.update({
      where: { id },
      data: employeeData,
    });

    // Also update corresponding Auth record if email or password changed
    const authUpdateData: any = {};
    if (employeeData.email) {
      authUpdateData.email = employeeData.email;
    }
    if (password) {
      authUpdateData.passwordHash = bcrypt.hashSync(password, 10);
    }

    if (Object.keys(authUpdateData).length > 0) {
      const updatedAuth = await this.prisma.auth.update({
        where: { email: oldEmployee.email },
        data: authUpdateData,
        include: { company: true },
      });

      // Sync user to Redis:
      if (oldEmployee.email !== updatedAuth.email) {
        // Delete old key
        await this.redisService.del(`user:${oldEmployee.email}`);
      }
      // Set new key/updated values
      await this.redisService.set(`user:${updatedAuth.email}`, JSON.stringify(updatedAuth));
    }

    return updatedEmployee;
  }

  async remove(id: string) {
    const employee = await this.findOne(id);

    // Delete corresponding Auth record
    try {
      await this.prisma.auth.delete({
        where: { email: employee.email },
      });
    } catch (err: any) {
      console.warn(`Could not delete Auth record for email ${employee.email}:`, err.message || err);
    }

    // Delete from Redis cache
    await this.redisService.del(`user:${employee.email}`);

    // Delete Employee record
    return this.prisma.employee.delete({ where: { id } });
  }
}
