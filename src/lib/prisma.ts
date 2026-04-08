import { PrismaClient } from '@prisma/client';

/**
 * Prisma Client 实例
 * 用于服务端组件和 API Routes
 */

declare global {
  // 允许全局变量类型扩展
  // 避免在开发环境中因热重载导致多个 Prisma Client 实例
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

/**
 * 缓存的 Prisma Client 实例
 *
 * 在开发环境中，全局变量可以防止因 Next.js 热重载导致的
 * Prisma Client 连接耗尽问题
 */
export const prisma =
  global.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

// 在非生产环境中，将实例缓存到全局变量
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}
