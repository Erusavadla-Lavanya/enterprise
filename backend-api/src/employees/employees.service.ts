import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { AuthService } from '../auth/auth.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async create(data: CreateEmployeeDto) {
    const { password, ...employeeData } = data as any;

    // 1. Create the Employee profile record
    const employee = await this.prisma.employee.create({ data: employeeData });

    // 2. Create corresponding Auth credentials
    const rawPassword = password || 'Password@123';
    const passwordHash = bcrypt.hashSync(rawPassword, 10);
    await this.prisma.auth.create({
      data: {
        email: data.email,
        passwordHash,
        role: 'employee',
        tenantId: employee.tenantId,
      },
    });

    // 3. Provision employee in AWS Cognito if configured
    await this.authService.cognitoCreateUser(data.email, 'employee', employee.tenantId);

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
    await this.findOne(id);
    return this.prisma.employee.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.employee.delete({ where: { id } });
  }
}
