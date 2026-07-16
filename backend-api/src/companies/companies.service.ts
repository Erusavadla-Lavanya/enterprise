import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../prisma/tenant.context';

@Injectable()
export class CompaniesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
  ) {}

  private getActiveTenantId(): string {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) {
      throw new BadRequestException('No active tenant context found');
    }
    return tenantId;
  }

  async getTheme(domain?: string) {
    let company;
    if (domain) {
      // Find company bypassing isolation Context since domain queries happen pre-auth
      company = await this.prisma.company.findUnique({
        where: { domain },
      });
    } else {
      const tenantId = this.tenantContext.getTenantId();
      if (tenantId) {
        company = await this.prisma.company.findUnique({
          where: { id: tenantId },
        });
      }
    }

    const defaultTheme = {
      primary: '#3b82f6',
      secondary: '#1e3a8a',
      fontFamily: 'Inter, sans-serif',
      logoUrl: '',
    };

    if (!company || !company.themeSettings) {
      return defaultTheme;
    }

    try {
      return JSON.parse(company.themeSettings);
    } catch {
      return defaultTheme;
    }
  }

  async updateTheme(primary: string, secondary: string, fontFamily: string, logoUrl: string) {
    const tenantId = this.getActiveTenantId();
    const existing = await this.prisma.company.findUnique({
      where: { id: tenantId },
      select: { themeSettings: true },
    });
    let plan = 'premium';
    if (existing?.themeSettings) {
      try {
        const parsed = JSON.parse(existing.themeSettings);
        if (parsed.plan) plan = parsed.plan;
      } catch (e) {}
    }
    const updatedTheme = JSON.stringify({ primary, secondary, fontFamily, logoUrl, plan });

    const company = await this.prisma.company.update({
      where: { id: tenantId },
      data: { themeSettings: updatedTheme },
    });

    return JSON.parse(company.themeSettings);
  }

  async getSettings() {
    const tenantId = this.getActiveTenantId();
    const company = await this.prisma.company.findUnique({
      where: { id: tenantId },
      include: {
        tenantModules: {
          include: {
            module: true
          }
        }
      }
    });
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    return company;
  }

  async updateSettings(name: string) {
    const tenantId = this.getActiveTenantId();
    return this.prisma.company.update({
      where: { id: tenantId },
      data: { name },
    });
  }

  async updateModules(subscribedModules: string) {
    const tenantId = this.getActiveTenantId();
    return this.prisma.company.update({
      where: { id: tenantId },
      data: { subscribedModules },
    });
  }

  async getKpis() {
    const tenantId = this.getActiveTenantId();
    
    const employeeCount = await this.prisma.employee.count({
      where: { tenantId }
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const attendanceCount = await this.prisma.attendance.count({
      where: {
        tenantId,
        checkIn: {
          gte: todayStart
        }
      }
    });

    const payrolls = await this.prisma.payroll.findMany({
      where: { tenantId }
    });
    const totalPayroll = payrolls.reduce((acc: number, curr: any) => acc + curr.netAmount, 0);

    const company = await this.prisma.company.findUnique({
      where: { id: tenantId },
    });

    return {
      employeeCount,
      activeTodayCount: attendanceCount,
      totalPayrollBudget: totalPayroll,
      subscribedModules: company?.subscribedModules || '',
    };
  }
}
