import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Guest or unauthenticated requests are handled by JwtAuthGuard
    if (!user) {
      return true;
    }

    // Super Admin has global bypass
    if (user.role === 'super_admin') {
      return true;
    }

    const { method, url } = request;
    
    // Parse module name from request path
    let moduleName = '';
    if (url.startsWith('/payroll')) moduleName = 'payroll';
    else if (url.startsWith('/attendance')) moduleName = 'attendance';
    else if (url.startsWith('/leave')) moduleName = 'leave';
    else if (url.startsWith('/employees')) moduleName = 'employees';

    // If no module scope, let roles-decorator or route permissions handle it
    if (!moduleName) {
      return true;
    }

    const tenantId = user.tenantId;
    if (!tenantId) {
      throw new UnauthorizedException('No active tenant ID in user context');
    }

    // 1. Fetch the module from catalogue
    const moduleItem = await this.prisma.module.findUnique({
      where: { name: moduleName },
    });

    if (!moduleItem) {
      throw new ForbiddenException(`Module "${moduleName}" is not registered in platform catalog.`);
    }

    // 2. Check if the module is active/subscribed for the tenant
    const isSubscribed = await this.prisma.tenantModule.findUnique({
      where: {
        tenantId_moduleId: {
          tenantId,
          moduleId: moduleItem.id,
        },
      },
    });

    if (!isSubscribed) {
      throw new ForbiddenException(`Access Denied: Module "${moduleName}" is not active or subscribed for your organization.`);
    }

    if (isSubscribed.status === 'pending' && user.role === 'employee') {
      throw new ForbiddenException(`Access Denied: Module "${moduleName}" subscription is pending.`);
    }

    // 3. Verify user's role permissions for this module
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: {
        role: user.role,
        moduleId: moduleItem.id,
      },
    });

    const userPermissions = rolePermissions.map((rp) => rp.permission); // ["read", "write", "admin", etc.]

    // Determine required permission based on HTTP verb
    let requiredPermission = 'read';
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      requiredPermission = 'write';
    }

    // Admin permission satisfies all checks
    const hasAccess = userPermissions.includes('admin') || 
                      userPermissions.includes(requiredPermission) ||
                      (requiredPermission === 'read' && userPermissions.includes('write'));

    if (!hasAccess) {
      throw new ForbiddenException(`Access Denied: You do not have "${requiredPermission}" permissions for module "${moduleName}".`);
    }

    return true;
  }
}
