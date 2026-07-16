import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PayrollScheduler {
  private readonly logger = new Logger(PayrollScheduler.name);

  constructor(private readonly prisma: PrismaService) {}

  // Run every 30 seconds for simulation purposes
  @Cron('*/30 * * * * *')
  async handlePayrollProcessing() {
    this.logger.log('Starting background payroll processing cycle...');

    // Fetch all companies (tenants)
    const companies = await this.prisma.company.findMany();

    for (const company of companies) {
      if (!company.isActive) {
        this.logger.warn(
          `[Payroll Job] Skipping payroll processing for suspended tenant: ${company.name} (${company.id})`
        );
        continue;
      }

      this.logger.log(
        `[Payroll Job] Executing payroll processing for active tenant: ${company.name} (${company.id})`
      );

      // Fetch employees of this tenant
      const employees = await this.prisma.employee.findMany({
        where: { tenantId: company.id },
      });

      this.logger.log(
        `[Payroll Job] Found ${employees.length} employees for tenant ${company.name}.`
      );
      
      for (const employee of employees) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const existing = await this.prisma.payroll.findFirst({
          where: {
            employeeId: employee.id,
            period: startOfMonth,
            tenantId: company.id,
          },
        });

        if (!existing) {
          await this.prisma.payroll.create({
            data: {
              employeeId: employee.id,
              period: startOfMonth,
              grossAmount: 75000,
              deductions: 3500,
              netAmount: 71500,
              status: 'draft',
              tenantId: company.id,
            },
          });
          this.logger.log(`[Payroll Job] Created draft payroll for employee: ${employee.email}`);
        }
      }
    }

    this.logger.log('Background payroll processing cycle completed.');
  }
}
