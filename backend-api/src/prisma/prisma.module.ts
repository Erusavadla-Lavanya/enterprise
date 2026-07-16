import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { TenantContext } from './tenant.context';
import { TenantMiddleware } from './tenant.middleware';

@Global()
@Module({
  providers: [PrismaService, TenantContext, TenantMiddleware],
  exports: [PrismaService, TenantContext, TenantMiddleware],
})
export class PrismaModule {}
