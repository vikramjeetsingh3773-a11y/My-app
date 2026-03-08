import { createClient, RedisClientType } from 'redis';
import { Logger } from '../utils/logger';

const logger = Logger.getInstance();

export class RedisClient {
  private static instance: RedisClient;
  private client: RedisClientType | null = null;
  private isConnected: boolean = false;

  private constructor() {}

  static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  async connect(): Promise<void> {
    try {
      this.client = createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            return new Error('Redis connection refused');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            return new Error('Redis retry time exhausted');
          }
          if (options.attempt > 10) {
            return undefined;
          }
          return Math.min(options.attempt * 100, 3000);
        }
      }) as any;

      await this.client.connect();
      this.isConnected = true;
      logger.info('Redis connection established');
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      this.isConnected = false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
      logger.info('Redis connection closed');
    }
  }

  async set(key: string, value: any, expiry?: number): Promise<void> {
    if (!this.isConnected || !this.client) return;
    try {
      const serialized = JSON.stringify(value);
      if (expiry) {
        await this.client.setEx(key, expiry, serialized);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (error) {
      logger.error(`Error setting Redis key ${key}:`, error);
    }
  }

  async get<T = any>(key: string): Promise<T | null> {
    if (!this.isConnected || !this.client) return null;
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Error getting Redis key ${key}:`, error);
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.isConnected || !this.client) return;
    try {
      await this.client.del(key);
    } catch (error) {
      logger.error(`Error deleting Redis key ${key}:`, error);
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    if (!this.isConnected || !this.client) return;
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
    } catch (error) {
      logger.error(`Error deleting Redis pattern ${pattern}:`, error);
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isConnected || !this.client) return false;
    try {
      const exists = await this.client.exists(key);
      return exists === 1;
    } catch (error) {
      logger.error(`Error checking Redis key existence ${key}:`, error);
      return false;
    }
  }

  async setHash(key: string, field: string, value: any): Promise<void> {
    if (!this.isConnected || !this.client) return;
    try {
      await this.client.hSet(key, field, JSON.stringify(value));
    } catch (error) {
      logger.error(`Error setting Redis hash ${key}:${field}:`, error);
    }
  }

  async getHash<T = any>(key: string, field: string): Promise<T | null> {
    if (!this.isConnected || !this.client) return null;
    try {
      const value = await this.client.hGet(key, field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Error getting Redis hash ${key}:${field}:`, error);
      return null;
    }
  }

  async getAllHash<T = any>(key: string): Promise<Record<string, T>> {
    if (!this.isConnected || !this.client) return {};
    try {
      const data = await this.client.hGetAll(key);
      const result: Record<string, T> = {};
      for (const [field, value] of Object.entries(data)) {
        result[field] = JSON.parse(value as string);
      }
      return result;
    } catch (error) {
      logger.error(`Error getting all Redis hash ${key}:`, error);
      return {};
    }
  }

  async deleteHash(key: string, field: string): Promise<void> {
    if (!this.isConnected || !this.client) return;
    try {
      await this.client.hDel(key, field);
    } catch (error) {
      logger.error(`Error deleting Redis hash ${key}:${field}:`, error);
    }
  }

  async increment(key: string, value: number = 1): Promise<number> {
    if (!this.isConnected || !this.client) return 0;
    try {
      return await this.client.incrBy(key, value);
    } catch (error) {
      logger.error(`Error incrementing Redis key ${key}:`, error);
      return 0;
    }
  }

  isConnectedStatus(): boolean {
    return this.isConnected;
  }
}
