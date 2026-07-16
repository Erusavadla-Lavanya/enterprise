import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from './auth.service';
import { TenantContext } from '../prisma/tenant.context';
import { IS_PUBLIC_KEY } from './public.decorator';
import { ROLES_KEY } from './roles.decorator';
import { PERMISSIONS_KEY } from './permissions.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
    private readonly tenantContext: TenantContext,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const token = request.cookies?.['access_token'];

    if (isPublic) {
      if (token) {
        try {
          const payload = await this.authService.verifyToken(token);
          this.tenantContext.setTenantId(payload.tenantId);
          request.user = payload;
        } catch {
          // Bypassed for public route
        }
      }
      return true;
    }

    if (!token) {
      throw new UnauthorizedException('Authentication token missing');
    }

    const payload = await this.authService.verifyToken(token);
    request.user = payload;

    // Inject tenantId into AsyncLocalStorage context
    this.tenantContext.setTenantId(payload.tenantId);

    // 1. Role-based check
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(payload.role)) {
        throw new ForbiddenException(`User role '${payload.role}' does not have access to this resource`);
      }
    }

    // 2. Permission-based check
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (requiredPermissions && requiredPermissions.length > 0) {
      const userPermissions = payload.permissions || [];
      const hasPermission = requiredPermissions.every((p) => userPermissions.includes(p));
      if (!hasPermission) {
        throw new ForbiddenException('User lacks required granular permissions');
      }
    }

    return true;
  }
}
