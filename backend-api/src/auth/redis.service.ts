import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType | null = null;
  private memoryStore = new Map<string, string>();
  private useMemoryFallback = false;

  async onModuleInit() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    try {
      this.client = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: false,
        },
      });
      this.client.on('error', (err) => {
        // Only log if we are not already falling back to memory
        if (!this.useMemoryFallback) {
          console.error('Redis Client Error:', err.message || err);
          this.useMemoryFallback = true;
        }
      });
      await this.client.connect();
      console.log(`RedisService: Connected successfully to Redis at ${redisUrl}`);
    } catch (err: any) {
      console.warn(`Redis connection failed (${err.message || err}). Falling back to in-memory store.`);
      this.useMemoryFallback = true;
      this.client = null;
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      try {
        await this.client.disconnect();
      } catch (err) {
        // Ignore disconnect errors
      }
    }
    this.memoryStore.clear();
  }

  async get(key: string): Promise<string | null> {
    if (this.useMemoryFallback || !this.client) {
      return this.memoryStore.get(key) || null;
    }
    try {
      return await this.client.get(key);
    } catch (err) {
      console.error('Redis GET error, falling back to memory:', err);
      return this.memoryStore.get(key) || null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.useMemoryFallback || !this.client) {
      this.memoryStore.set(key, value);
      if (ttlSeconds) {
        setTimeout(() => {
          this.memoryStore.delete(key);
        }, ttlSeconds * 1000);
      }
      return;
    }
    try {
      if (ttlSeconds) {
        await this.client.set(key, value, { EX: ttlSeconds });
      } else {
        await this.client.set(key, value);
      }
    } catch (err) {
      console.error('Redis SET error, falling back to memory:', err);
      this.memoryStore.set(key, value);
      if (ttlSeconds) {
        setTimeout(() => {
          this.memoryStore.delete(key);
        }, ttlSeconds * 1000);
      }
    }
  }

  async del(key: string): Promise<void> {
    this.memoryStore.delete(key);
    if (this.useMemoryFallback || !this.client) {
      return;
    }
    try {
      await this.client.del(key);
    } catch (err) {
      console.error('Redis DEL error:', err);
    }
  }

  async exists(key: string): Promise<boolean> {
    if (this.useMemoryFallback || !this.client) {
      return this.memoryStore.has(key);
    }
    try {
      const res = await this.client.exists(key);
      return res > 0;
    } catch (err) {
      console.error('Redis EXISTS error, falling back to memory:', err);
      return this.memoryStore.has(key);
    }
  }
}
