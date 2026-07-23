import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client!: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL', 'redis://localhost:6379');
    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.client
      .connect()
      .then(() => {
        this.logger.log('Connected to Redis');
      })
      .catch((err) => {
        this.logger.warn(`Redis connection failed: ${err.message}. Running in fallback mode.`);
      });
  }

  onModuleDestroy() {
    this.client?.disconnect();
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (err) {
      this.logger.error(`Redis set failed: ${err}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (err) {
      this.logger.error(`Redis del failed: ${err}`);
    }
  }

  /**
   * Atomically increment a counter. If key doesn't exist it is set to 1.
   * Returns the new value after increment.
   */
  async incr(key: string): Promise<number> {
    try {
      return await this.client.incr(key);
    } catch {
      return 0;
    }
  }

  /**
   * Set TTL (seconds) on existing key only if key has no expiry yet.
   * Used to set expiry on the first failed-login counter increment.
   */
  async expireIfNotSet(key: string, ttlSeconds: number): Promise<void> {
    try {
      const ttl = await this.client.ttl(key);
      // ttl === -1 means key exists but has no expiry
      if (ttl === -1) {
        await this.client.expire(key, ttlSeconds);
      }
    } catch (err) {
      this.logger.error(`Redis expireIfNotSet failed: ${err}`);
    }
  }
}
