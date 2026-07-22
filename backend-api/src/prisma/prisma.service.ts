import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { TenantContext } from './tenant.context';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private _extendedClient: any;

  constructor(
    private readonly tenantContext: TenantContext,
    private readonly configService: ConfigService,
  ) {
    super({
      datasources: {
        db: {
          url: (() => {
            let dbUrl = configService.get<string>('DATABASE_URL');
            if (dbUrl) {
              if ((dbUrl.includes('aivencloud.com') || dbUrl.includes('amazonaws.com') || dbUrl.includes('database.azure.com')) && dbUrl.includes('sslaccept=strict')) {
                dbUrl = dbUrl.replace('sslaccept=strict', 'sslaccept=accept_invalid_certs');
              }
            } else if (configService.get('DB_HOST')) {
              const dbUser = (configService.get<string>('DB_USER') || 'root').trim();
              const dbPass = (configService.get<string>('DB_PASSWORD')?.trim() || 'root');
              const dbHost = (configService.get<string>('DB_HOST') || 'localhost').trim();
              const dbPort = (configService.get<string>('DB_PORT') || '3306').trim();
              const dbName = (configService.get<string>('DB_NAME') || 'enterprise').trim();

              let queryParams = '';
              if (dbHost.includes('aivencloud.com') || dbHost.includes('amazonaws.com') || dbHost.includes('database.azure.com')) {
                queryParams = '?sslaccept=accept_invalid_certs';
              }
              dbUrl = `mysql://${dbUser}:${dbPass}@${dbHost}:${dbPort}/${dbName}${queryParams}`;
            }
            return dbUrl;
          })(),
        },
      },
    });
    this._extendedClient = this.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            const tenantId = tenantContext.getTenantId();

            // Models that are tenant-scoped
            const tenantScopedModels = ['Employee', 'Payroll', 'Attendance', 'Leave', 'Auth'];

            if (tenantId && tenantScopedModels.includes(model)) {
              const anyArgs = args as any;
              // Apply dynamic filter for isolation
              if (['findFirst', 'findFirstOrThrow', 'findMany', 'findUnique', 'findUniqueOrThrow', 'count', 'aggregate', 'groupBy'].includes(operation)) {
                anyArgs.where = anyArgs.where || {};
                anyArgs.where.tenantId = tenantId;
              } else if (['create', 'createMany'].includes(operation)) {
                if (Array.isArray(anyArgs.data)) {
                  anyArgs.data = anyArgs.data.map((item: any) => ({ ...item, tenantId }));
                } else {
                  anyArgs.data = anyArgs.data || {};
                  anyArgs.data.tenantId = tenantId;
                }
              } else if (['update', 'updateMany', 'upsert', 'delete', 'deleteMany'].includes(operation)) {
                anyArgs.where = anyArgs.where || {};
                anyArgs.where.tenantId = tenantId;
                if (operation === 'upsert') {
                  anyArgs.create = anyArgs.create || {};
                  anyArgs.create.tenantId = tenantId;
                  anyArgs.update = anyArgs.update || {};
                  anyArgs.update.tenantId = tenantId;
                }
              }
            }
            return query(args);
          }
        }
      }
    });

    const models = ['auth', 'employee', 'payroll', 'attendance', 'leave', 'company', 'systemLog', 'emailTemplate', 'module', 'tenantModule', 'rolePermission'];
    for (const model of models) {
      Object.defineProperty(this, model, {
        get: () => this._extendedClient[model],
        configurable: true,
        enumerable: true,
      });
    }
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // Dynamic getters to delegate properties to extended client
  get auth() { return this._extendedClient.auth; }
  get employee() { return this._extendedClient.employee; }
  get payroll() { return this._extendedClient.payroll; }
  get attendance() { return this._extendedClient.attendance; }
  get leave() { return this._extendedClient.leave; }
  get company() { return this._extendedClient.company; }
  get systemLog() { return this._extendedClient.systemLog; }
  get emailTemplate() { return this._extendedClient.emailTemplate; }
}
