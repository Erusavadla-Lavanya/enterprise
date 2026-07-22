import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from './redis.service';
import { LoginDto, RegisterTenantDto } from './dto/auth.dto';
import * as bcrypt from 'bcryptjs';
import { Response } from 'express';
import { 
  CognitoIdentityProviderClient, 
  AdminCreateUserCommand,
  InitiateAuthCommand,
  AuthFlowType
} from '@aws-sdk/client-cognito-identity-provider';

@Injectable()
export class AuthService {
  private cognitoClient?: CognitoIdentityProviderClient;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
  ) {
    const poolId = process.env.COGNITO_USER_POOL_ID;
    const region = process.env.COGNITO_REGION || 'us-east-1';
    if (poolId) {
      this.cognitoClient = new CognitoIdentityProviderClient({ region });
    }
  }

  // Get permissions list based on role
  getPermissions(role: string): string[] {
    if (role === 'super_admin') {
      return ['tenant:read', 'tenant:write', 'module:write', 'system:read', 'system:write'];
    }
    if (role === 'tenant_admin') {
      return [
        'employee:read', 'employee:write',
        'payroll:read', 'payroll:write',
        'attendance:read', 'attendance:write',
        'leave:read', 'leave:write',
        'module:read', 'module:write',
        'settings:write'
      ];
    }
    return [
      'employee:read',
      'attendance:read', 'attendance:write',
      'leave:read', 'leave:write',
      'payroll:read'
    ];
  }

  async cognitoCreateUser(email: string, role: string, tenantId: string | null) {
    const cleanEmail = email.toLowerCase().trim();
    const poolId = process.env.COGNITO_USER_POOL_ID;
    if (this.cognitoClient && poolId) {
      try {
        const attributes = [
          { Name: 'email', Value: cleanEmail },
          { Name: 'email_verified', Value: 'true' },
          { Name: 'custom:role', Value: role },
        ];
        if (tenantId) {
          attributes.push({ Name: 'custom:tenantId', Value: tenantId });
        }
        await this.cognitoClient.send(
          new AdminCreateUserCommand({
            UserPoolId: poolId,
            Username: cleanEmail,
            UserAttributes: attributes,
            DesiredDeliveryMediums: ['EMAIL'],
          })
        );
        console.log(`Cognito: Successfully provisioned user ${cleanEmail} (${role})`);
      } catch (err: any) {
        console.error('Failed to provision user in Cognito pool:', err.message || err);
      }
    }
  }

  async login(dto: LoginDto, res: Response) {
    const cleanEmail = dto.email.toLowerCase().trim();
    let authUser: any = null;
    const poolId = process.env.COGNITO_USER_POOL_ID;
    const clientId = process.env.COGNITO_CLIENT_ID;

    // 1. Try Authenticating via AWS Cognito if variables are set
    if (this.cognitoClient && poolId && clientId) {
      try {
        const response = await this.cognitoClient.send(
          new InitiateAuthCommand({
            AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
            ClientId: clientId,
            AuthParameters: {
              USERNAME: cleanEmail,
              PASSWORD: dto.password,
            },
          })
        );

        const idToken = response.AuthenticationResult?.IdToken;
        if (idToken) {
          const decoded: any = this.jwtService.decode(idToken);
          const email = (decoded.email || cleanEmail).toLowerCase().trim();
          const role = decoded['custom:role'] || 'employee';
          const tenantId = decoded['custom:tenantId'] || null;

          // Synchronize / upsert the local Auth record
          const localAuth = await this.prisma.auth.upsert({
            where: { email },
            create: {
              email,
              role,
              tenantId,
              passwordHash: '', // Cognito‑managed password
              lastLoginAt: new Date(),
            },
            update: {
              role,
              tenantId,
              lastLoginAt: new Date(),
            },
            include: { company: true },
          });
          authUser = localAuth;
          await this.redisService.set(`user:${email}`, JSON.stringify(localAuth));
        }
      } catch (err: any) {
        console.warn('Cognito login attempt bypassed/failed. Error:', err.message || err);
      }
    }

    // 2. Redis & Local Database Authentication Fallback
    if (!authUser) {
      // First try fetching from Redis
      const cachedUserStr = await this.redisService.get(`user:${cleanEmail}`);
      if (cachedUserStr) {
        try {
          const cachedAuth = JSON.parse(cachedUserStr);
          if (cachedAuth) {
            // Check tenant suspension
            if (cachedAuth.company && !cachedAuth.company.isActive) {
              throw new UnauthorizedException('Organization has been suspended');
            }
            const isPasswordValid = bcrypt.compareSync(dto.password, cachedAuth.passwordHash);
            if (isPasswordValid) {
              authUser = cachedAuth;
              console.log(`Auth: Login authenticated successfully from Redis cache for ${cleanEmail}`);
            }
          }
        } catch (err) {
          console.error('Failed to parse cached user or verify password from Redis:', err);
        }
      }

      if (!authUser) {
        const auth = await this.prisma.auth.findUnique({
          where: { email: cleanEmail },
          include: { company: true },
        });

        if (!auth) {
          throw new UnauthorizedException('Invalid credentials');
        }

        // Check tenant suspension
        if (auth.company && !auth.company.isActive) {
          throw new UnauthorizedException('Organization has been suspended');
        }

        const isPasswordValid = bcrypt.compareSync(dto.password, auth.passwordHash);
        if (!isPasswordValid) {
          throw new UnauthorizedException('Invalid credentials');
        }
        authUser = auth;

        // Cache user details in Redis
        await this.redisService.set(`user:${cleanEmail}`, JSON.stringify(auth));
        console.log(`Auth: Login authenticated successfully from Database for ${cleanEmail} (cached in Redis)`);
      }
    }

    const permissions = this.getPermissions(authUser.role);

    const payload = {
      sub: authUser.id,
      email: authUser.email,
      role: authUser.role,
      tenantId: authUser.tenantId,
      permissions,
    };

    const token = this.jwtService.sign(payload);

    // Set cookie
    res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Secure on HTTPS (CloudFront)
      sameSite: 'lax', // Use 'lax' for same-domain cookies (CloudFront routes both frontend & backend)
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    return {
      user: {
        id: authUser.id,
        email: authUser.email,
        role: authUser.role,
        tenantId: authUser.tenantId,
        permissions,
      },
    };
  }

  async oauthLogin(email: string, res: Response) {
    const cleanEmail = email.toLowerCase().trim();
    const auth = await this.prisma.auth.findUnique({
      where: { email: cleanEmail },
      include: { company: true },
    });

    if (!auth) {
      throw new UnauthorizedException('User is not authorized');
    }

    // Check tenant suspension
    if (auth.company && !auth.company.isActive) {
      throw new UnauthorizedException('Organization has been suspended');
    }

    const permissions = this.getPermissions(auth.role);

    const payload = {
      sub: auth.id,
      email: auth.email,
      role: auth.role,
      tenantId: auth.tenantId,
      permissions,
    };

    const token = this.jwtService.sign(payload);

    // Set cookie
    res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Secure on HTTPS (CloudFront)
      sameSite: 'lax', // Use 'lax' for same-domain cookies (CloudFront routes both frontend & backend)
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    return {
      user: {
        id: auth.id,
        email: auth.email,
        role: auth.role,
        tenantId: auth.tenantId,
        permissions,
      },
    };
  }

  async logout(token: string, res: Response) {
    if (token) {
      // Blacklist token in Redis (1 day TTL)
      await this.redisService.set(`blacklist:${token}`, '1', 24 * 60 * 60);
    }
    res.clearCookie('access_token');
    return { success: true };
  }

  async verifyToken(token: string) {
    const isBlacklisted = await this.redisService.exists(`blacklist:${token}`);
    if (isBlacklisted) {
      throw new UnauthorizedException('Token is blacklisted');
    }

    try {
      const payload = this.jwtService.verify(token);

      // Check if tenant has been invalidated (suspended)
      if (payload.tenantId) {
        const tenantInvalidatedAt = await this.redisService.get(`tenant_invalidated_at:${payload.tenantId}`);
        if (tenantInvalidatedAt) {
          const invalidatedTime = parseInt(tenantInvalidatedAt, 10);
          if (payload.iat * 1000 < invalidatedTime) {
            throw new UnauthorizedException('Token invalidated due to tenant action');
          }
        }

        // Fetch company to ensure it exists and is active
        const company = await this.prisma.company.findUnique({
          where: { id: payload.tenantId },
        });
        if (!company || !company.isActive) {
          throw new UnauthorizedException('Organization is inactive or suspended');
        }
      }

      return payload;
    } catch (err) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  // Super Admin registers tenant
  async registerTenant(dto: RegisterTenantDto) {
    const cleanAdminEmail = dto.adminEmail.toLowerCase().trim();
    const existing = await this.prisma.company.findUnique({
      where: { domain: dto.domain },
    });
    if (existing) {
      throw new BadRequestException('Domain is already registered');
    }

    // Check if admin email already exists in Auth
    const existingAuth = await this.prisma.auth.findUnique({
      where: { email: cleanAdminEmail },
    });
    if (existingAuth) {
      throw new BadRequestException('Admin email is already registered');
    }

    // Generate temporary password
    const tempPassword = dto.password || Math.random().toString(36).substring(2, 10) + '@123';
    const passwordHash = bcrypt.hashSync(tempPassword, 10);

    // Create company record
    const allModules = await this.prisma.module.findMany();
    const plan = dto.subscriptionPlan || 'premium';

    let subscribedList = 'attendance,payroll,leave';
    if (plan === 'basic') {
      subscribedList = 'attendance,leave';
    } else if (plan === 'subscription') {
      subscribedList = 'attendance,leave,payroll';
    } else {
      subscribedList = 'attendance,payroll,leave';
    }

    const company = await this.prisma.company.create({
      data: {
        name: dto.companyName,
        domain: dto.domain,
        isActive: true,
        status: 'active',
        subscribedModules: subscribedList,
      },
    });

    for (const mod of allModules) {
      let modStatus = 'pending';
      const mName = mod.name.toLowerCase();
      
      if (mName === 'auth' || mName === 'employees') {
        modStatus = 'active';
      } else if (plan === 'premium') {
        modStatus = 'active';
      } else if (plan === 'subscription') {
        if (mName === 'attendance' || mName === 'leave') {
          modStatus = 'active';
        } else {
          modStatus = 'pending';
        }
      } else if (plan === 'basic') {
        if (mName === 'attendance' || mName === 'leave') {
          modStatus = 'active';
        } else {
          modStatus = 'pending';
        }
      }

      await this.prisma.tenantModule.create({
        data: {
          tenantId: company.id,
          moduleId: mod.id,
          status: modStatus,
        }
      });
    }

    // Create Tenant Admin auth record
    const auth = await this.prisma.auth.create({
      data: {
        email: cleanAdminEmail,
        passwordHash,
        role: 'tenant_admin',
        tenantId: company.id,
      },
    });

    // Cache the tenant admin in Redis
    await this.redisService.set(`user:${cleanAdminEmail}`, JSON.stringify({ ...auth, company }));

    // Provision Tenant Admin user in AWS Cognito if configured
    await this.cognitoCreateUser(cleanAdminEmail, 'tenant_admin', company.id);

    // System Log
    await this.prisma.systemLog.create({
      data: {
        action: 'TENANT_REGISTRATION',
        details: `Tenant ${dto.companyName} registered by Super Admin. Admin: ${dto.adminEmail}`,
      },
    });

    return {
      company,
      adminUser: {
        id: auth.id,
        email: auth.email,
      },
      temporaryPassword: tempPassword,
    };
  }

  // Public self-registration (creates pending tenant)
  async selfRegisterTenant(dto: RegisterTenantDto) {
    const cleanAdminEmail = dto.adminEmail.toLowerCase().trim();
    const existing = await this.prisma.company.findUnique({
      where: { domain: dto.domain },
    });
    if (existing) {
      throw new BadRequestException('Domain is already registered');
    }

    const existingAuth = await this.prisma.auth.findUnique({
      where: { email: cleanAdminEmail },
    });
    if (existingAuth) {
      throw new BadRequestException('Admin email is already registered');
    }

    if (!dto.password) {
      throw new BadRequestException('Password is required for self-registration');
    }

    const passwordHash = bcrypt.hashSync(dto.password, 10);
    const plan = dto.subscriptionPlan || 'basic';

    let subscribedList = 'attendance,leave';
    if (plan === 'premium') {
      subscribedList = 'attendance,payroll,leave';
    } else if (plan === 'standard' || plan === 'subscription') {
      subscribedList = 'attendance,leave,payroll';
    }

    const themeSettings = JSON.stringify({
      primary: '#3b82f6',
      secondary: '#1e3a8a',
      fontFamily: 'Inter, sans-serif',
      logoUrl: '',
      plan,
    });

    // Create company record with pending status
    const company = await this.prisma.company.create({
      data: {
        name: dto.companyName,
        domain: dto.domain,
        isActive: true, // Allow log-in or guard will handle pending
        status: 'pending',
        subscribedModules: subscribedList,
        themeSettings,
      },
    });

    // Populate TenantModules catalog for the tenant
    const allModules = await this.prisma.module.findMany();
    for (const mod of allModules) {
      let modStatus = 'pending';
      const mName = mod.name.toLowerCase();

      if (mName === 'auth' || mName === 'employees') {
        modStatus = 'active';
      } else if (plan === 'premium') {
        modStatus = 'active';
      } else if (plan === 'standard' || plan === 'subscription') {
        if (mName === 'attendance' || mName === 'leave' || mName === 'payroll') {
          modStatus = 'active';
        }
      } else if (plan === 'basic') {
        if (mName === 'attendance' || mName === 'leave') {
          modStatus = 'active';
        }
      }

      await this.prisma.tenantModule.create({
        data: {
          tenantId: company.id,
          moduleId: mod.id,
          status: modStatus,
        }
      });
    }

    // Create Tenant Admin auth record
    const auth = await this.prisma.auth.create({
      data: {
        email: cleanAdminEmail,
        passwordHash,
        role: 'tenant_admin',
        tenantId: company.id,
      },
    });

    // Cache the tenant admin in Redis
    await this.redisService.set(`user:${cleanAdminEmail}`, JSON.stringify({ ...auth, company }));

    // Provision User in Cognito if configured
    await this.cognitoCreateUser(cleanAdminEmail, 'tenant_admin', company.id);

    // System Log
    await this.prisma.systemLog.create({
      data: {
        action: 'TENANT_SELF_REGISTRATION',
        details: `Tenant ${dto.companyName} self-registered with plan: ${plan}. Pending approval. Admin: ${cleanAdminEmail}`,
      },
    });

    return {
      company,
      status: 'pending_approval',
    };
  }

  // Suspend or Reactivate Tenant
  async toggleTenantActivation(id: string, isActive: boolean) {
    const company = await this.prisma.company.findUnique({
      where: { id },
    });
    if (!company) {
      throw new NotFoundException('Tenant not found');
    }

    const updated = await this.prisma.company.update({
      where: { id },
      data: { isActive },
    });

    if (!isActive) {
      // Invalidate all active JWT tokens for that tenant via Redis
      await this.redisService.set(`tenant_invalidated_at:${id}`, Date.now().toString());
    }

    // Invalidate user cache for all users belonging to this tenant in Redis
    try {
      const tenantAuths = await this.prisma.auth.findMany({
        where: { tenantId: id },
      });
      for (const auth of tenantAuths) {
        await this.redisService.del(`user:${auth.email}`);
      }
    } catch (err) {
      console.error('Failed to invalidate tenant users from Redis cache:', err);
    }

    // System Log
    await this.prisma.systemLog.create({
      data: {
        action: isActive ? 'TENANT_REACTIVATED' : 'TENANT_SUSPENDED',
        details: `Tenant ${company.name} (${id}) status changed to isActive=${isActive}`,
      },
    });

    return updated;
  }

  async getTenants() {
    return this.prisma.company.findMany({
      include: {
        _count: {
          select: { employees: true }
        },
        tenantModules: {
          include: {
            module: true
          }
        }
      }
    });
  }

  async toggleModuleStatus(tenantId: string, moduleId: string) {
    const tm = await this.prisma.tenantModule.findUnique({
      where: { tenantId_moduleId: { tenantId, moduleId } },
    });
    if (!tm) {
      throw new NotFoundException('Tenant module subscription not found');
    }
    const newStatus = tm.status === 'active' ? 'pending' : 'active';
    const updated = await this.prisma.tenantModule.update({
      where: { id: tm.id },
      data: { status: newStatus },
    });

    await this.prisma.systemLog.create({
      data: {
        action: 'TENANT_MODULE_STATUS_TOGGLE',
        details: `Module subscription for tenant ${tenantId} set to status=${newStatus}`,
      },
    });

    return updated;
  }

  async getSystemLogs() {
    return this.prisma.systemLog.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async getEmailTemplates() {
    return this.prisma.emailTemplate.findMany();
  }

  async updateEmailTemplate(id: string, subject: string, body: string) {
    return this.prisma.emailTemplate.update({
      where: { id },
      data: { subject, body }
    });
  }

  async forgotPassword(email: string) {
    console.log('Mock forgot password for:', email);
    return true;
  }

  async confirmForgotPassword(email: string, code: string, newPassword: string) {
    console.log('Mock reset password for:', email);
    return true;
  }
}
