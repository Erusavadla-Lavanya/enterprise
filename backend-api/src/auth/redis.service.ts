import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private memoryStore = new Map<string, string>();

  async onModuleInit() {
    console.log('RedisService: Using in-memory store for JWT blacklisting.');
  }

  async onModuleDestroy() {
    this.memoryStore.clear();
  }

  async get(key: string): Promise<string | null> {
    return this.memoryStore.get(key) || null;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    this.memoryStore.set(key, value);
    if (ttlSeconds) {
      setTimeout(() => {
        this.memoryStore.delete(key);
      }, ttlSeconds * 1000);
    }
  }

  async del(key: string): Promise<void> {
    this.memoryStore.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.memoryStore.has(key);
  }
}
