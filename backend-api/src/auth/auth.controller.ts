import { Body, Controller, Post, Get, Req, Res, UnauthorizedException, Param, Patch, BadRequestException } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, RegisterTenantDto } from './dto/auth.dto';
import { Public } from './public.decorator';
import { Roles } from './roles.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.login(dto, res);
  }

  @Public()
  @Post('oauth-login')
  async oauthLogin(@Body('email') email: string, @Res({ passthrough: true }) res: Response) {
    if (!email) {
      throw new BadRequestException('Email is required');
    }
    return this.authService.oauthLogin(email, res);
  }

  @Public()
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.['access_token'];
    return this.authService.logout(token, res);
  }

  @Get('me')
  async me(@Req() req: Request) {
    const token = req.cookies?.['access_token'];
    if (!token) {
      throw new UnauthorizedException('No active session found');
    }
    const payload = await this.authService.verifyToken(token);
    return {
      user: {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        tenantId: payload.tenantId,
        permissions: payload.permissions,
      }
    };
  }

  // Public self-registration (creates pending tenant)
  @Public()
  @Post('register')
  async selfRegister(@Body() dto: RegisterTenantDto) {
    return this.authService.selfRegisterTenant(dto);
  }

  // Super Admin registers tenant
  @Roles('super_admin')
  @Post('register-tenant')
  async registerTenant(@Body() dto: RegisterTenantDto) {
    return this.authService.registerTenant(dto);
  }

  // Super Admin toggle activation
  @Roles('super_admin')
  @Patch('tenants/:id/toggle')
  async toggleTenant(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.authService.toggleTenantActivation(id, isActive);
  }

  // Super Admin toggle module status
  @Roles('super_admin')
  @Patch('tenants/:tenantId/modules/:moduleId/toggle-status')
  async toggleModuleStatus(
    @Param('tenantId') tenantId: string,
    @Param('moduleId') moduleId: string,
  ) {
    return this.authService.toggleModuleStatus(tenantId, moduleId);
  }

  // Super Admin list tenants
  @Roles('super_admin')
  @Get('tenants')
  async getTenants() {
    return this.authService.getTenants();
  }

  // Super Admin list logs
  @Roles('super_admin')
  @Get('system/logs')
  async getSystemLogs() {
    return this.authService.getSystemLogs();
  }

  // Super Admin list templates
  @Roles('super_admin')
  @Get('system/templates')
  async getEmailTemplates() {
    return this.authService.getEmailTemplates();
  }

  // Super Admin update template
  @Roles('super_admin')
  @Patch('system/templates/:id')
  async updateEmailTemplate(@Param('id') id: string, @Body('subject') subject: string, @Body('body') body: string) {
    return this.authService.updateEmailTemplate(id, subject, body);
  }
}
