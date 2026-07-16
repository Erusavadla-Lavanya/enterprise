import { Controller, Get, Patch, Body, Query } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { Roles } from '../auth/roles.decorator';
import { Public } from '../auth/public.decorator';

@Controller('company')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Public()
  @Get('settings/theme')
  async getTheme(@Query('domain') domain?: string) {
    return this.companiesService.getTheme(domain);
  }

  @Roles('tenant_admin', 'employee')
  @Get('settings')
  async getSettings() {
    return this.companiesService.getSettings();
  }

  @Roles('tenant_admin')
  @Patch('settings')
  async updateSettings(@Body('name') name: string) {
    return this.companiesService.updateSettings(name);
  }

  @Roles('tenant_admin')
  @Patch('settings/theme')
  async updateTheme(
    @Body('primary') primary: string,
    @Body('secondary') secondary: string,
    @Body('fontFamily') fontFamily: string,
    @Body('logoUrl') logoUrl: string,
  ) {
    return this.companiesService.updateTheme(primary, secondary, fontFamily, logoUrl);
  }

  @Roles('tenant_admin')
  @Patch('modules')
  async updateModules(@Body('modules') modules: string) {
    return this.companiesService.updateModules(modules);
  }

  @Roles('tenant_admin')
  @Get('kpis')
  async getKpis() {
    return this.companiesService.getKpis();
  }
}
