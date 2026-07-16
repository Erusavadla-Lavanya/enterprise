import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    
    return next.handle().pipe(
      tap(() => {
        // Run asynchronously without blocking the client response
        const user = request.user;
        const tenantId = user?.tenantId || null;
        const userId = user?.sub || null;
        const email = user?.email || 'Anonymous';
        const role = user?.role || 'Guest';

        // Filter out highly verbose logs (e.g. system log checks) to prevent infinite loops
        if (url.includes('/auth/system/logs') || url.includes('/company/settings/theme')) {
          return;
        }

        this.prisma.systemLog.create({
          data: {
            action: `${method} ${url.split('?')[0]}`,
            details: `User ${email} (${role}) triggered request.`,
            userId,
            tenantId,
          },
        }).catch((err: any) => {
          console.error('AuditInterceptor failed to write to SystemLog:', err);
        });
      })
    );
  }
}
