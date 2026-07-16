import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

@Injectable()
export class TenantContext {
  private static readonly storage = new AsyncLocalStorage<Map<string, string | null>>();

  run(tenantId: string | null, callback: () => void) {
    const store = new Map<string, string | null>();
    store.set('tenantId', tenantId);
    TenantContext.storage.run(store, callback);
  }

  getStore() {
    return TenantContext.storage.getStore();
  }

  getTenantId(): string | null {
    const store = TenantContext.storage.getStore();
    return store ? store.get('tenantId') || null : null;
  }

  setTenantId(tenantId: string | null): void {
    const store = TenantContext.storage.getStore();
    if (store) {
      store.set('tenantId', tenantId);
    }
  }
}
