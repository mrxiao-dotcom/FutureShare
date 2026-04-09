'use server';

/**
 * 管理员资金变动录入 Server Action
 *
 * 功能：管理员直接录入用户的入金/出金操作
 * 注意：由于是管理员直接操作，状态直接设置为 COMPLETED（立即生效）
 */

import { PrismaClient } from '@prisma/client';
import { TransactionType, TransactionStatus } from '@/lib/constants';
import { z } from 'zod';

// ============================================
// 类型定义
// ============================================

/**
 * 资金变动类型枚举（简化版，用于入参）
 */
export const TransactionTypeEnum = {
  DEPOSIT: 'DEPOSIT',     // 入金
  WITHDRAWAL: 'WITHDRAWAL', // 出金
} as const;

export type TransactionTypeInput = typeof TransactionTypeEnum[keyof typeof TransactionTypeEnum];

/**
 * 操作结果返回类型
 */
export interface ActionResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

/**
 * 新建交易记录的数据结构
 */
export interface TransactionRecord {
  id: string;
  fundId: string;
  userId: string | null;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  description: string | null;
  createdAt: Date;
}

// ============================================
// 数据校验 Schema（使用 Zod）
// ============================================

const RecordTransactionSchema = z.object({
  fundId: z.string().min(1, '基金ID不能为空'),
  userId: z.string().min(1, '用户ID不能为空'),
  type: z.enum(['DEPOSIT', 'WITHDRAWAL'], {
    errorMap: () => ({ message: '类型必须是 DEPOSIT(入金) 或 WITHDRAWAL(出金)' }),
  }),
  amount: z.number({
    required_error: '金额不能为空',
    invalid_type_error: '金额必须是数字',
  }).positive('金额必须大于0'),
  description: z.string().optional().nullable(),
});

// ============================================
// Prisma 客户端实例
// ============================================

const prisma = new PrismaClient();

// ============================================
// Server Action: 管理员录入资金变动
// ============================================

/**
 * 管理员录入资金变动
 *
 * @param params.fundId - 基金ID
 * @param params.userId - 对应的劣后用户ID
 * @param params.type - 变动类型：DEPOSIT(入金) / WITHDRAWAL(出金)
 * @param params.amount - 变动金额（正数）
 * @param params.description - 备注描述（可选）
 *
 * @returns 操作结果，包含成功状态和新建记录
 *
 * @example
 * ```typescript
 * const result = await adminRecordTransaction({
 *   fundId: 'fund_xxx',
 *   userId: 'user_yyy',
 *   type: 'DEPOSIT',
 *   amount: 10000,
 *   description: '用户追加投资'
 * });
 * ```
 */
export async function adminRecordTransaction(
  params: {
    fundId: string;
    userId: string;
    type: TransactionTypeInput;
    amount: number;
    description?: string;
  }
): Promise<ActionResult<TransactionRecord>> {
  try {
    // ==================== 第一步：参数校验 ====================
    const validation = RecordTransactionSchema.safeParse(params);

    if (!validation.success) {
      return {
        success: false,
        message: '参数校验失败',
        error: validation.error.errors.map((e) => e.message).join('; '),
      };
    }

    const { fundId, userId, type, amount, description } = validation.data;

    // ==================== 第二步：查询基金是否存在 ====================
    const fund = await prisma.fund.findUnique({
      where: { id: fundId },
      select: { id: true, name: true, currentJuniorCapital: true },
    });

    if (!fund) {
      return {
        success: false,
        message: '基金不存在',
        error: `未找到ID为 ${fundId} 的基金`,
      };
    }

    // ==================== 第三步：查询用户是否存在 ====================
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, userType: true },
    });

    if (!user) {
      return {
        success: false,
        message: '用户不存在',
        error: `未找到ID为 ${userId} 的用户`,
      };
    }

    // ==================== 第四步：创建交易记录 ====================
    // 由于是管理员直接操作，状态直接设置为 COMPLETED
    const transaction = await prisma.transaction.create({
      data: {
        fundId,
        userId,
        type: type as TransactionType,
        amount,
        status: TransactionStatus.COMPLETED,
        description: description || null,
      },
    });

    // ==================== 第五步：更新基金劣后本金 ====================
    // 根据类型调整基金的劣后本金
    const capitalChange = type === 'DEPOSIT' ? amount : -amount;

    // 计算新的劣后总额
    const newJuniorCapital = fund.currentJuniorCapital + capitalChange;
    // 自动配齐优先资金：优先 = 劣后 × 9
    const targetPriorityCapital = newJuniorCapital * 9;

    // 查询当前优先资金
    const fundWithPriority = await prisma.fund.findUnique({
      where: { id: fundId },
      select: { currentPriorityCapital: true },
    });
    const currentPriorityCapital = fundWithPriority?.currentPriorityCapital || 0;
    const priorityGap = targetPriorityCapital - currentPriorityCapital;

    await prisma.fund.update({
      where: { id: fundId },
      data: {
        currentJuniorCapital: {
          increment: capitalChange,
        },
        // 自动补足优先资金差额（入金时补足，出金时不减少优先）
        ...(priorityGap > 0 && type === 'DEPOSIT' ? {
          currentPriorityCapital: { increment: priorityGap },
        } : {}),
        totalAssets: {
          increment: capitalChange + (priorityGap > 0 && type === 'DEPOSIT' ? priorityGap : 0),
        },
      },
    });

    // ==================== 返回成功结果 ====================
    return {
      success: true,
      message: `成功录入${type === 'DEPOSIT' ? '入金' : '出金'}记录`,
      data: {
        id: transaction.id,
        fundId: transaction.fundId,
        userId: transaction.userId,
        type: transaction.type as TransactionType,
        amount: transaction.amount,
        status: transaction.status as TransactionStatus,
        description: transaction.description,
        createdAt: transaction.createdAt,
      },
    };

  } catch (error) {
    // ==================== 错误处理 ====================
    console.error('【管理员录入资金变动】操作失败:', error);

    const errorMessage = error instanceof Error ? error.message : '未知错误';

    return {
      success: false,
      message: '操作失败',
      error: errorMessage,
    };

  } finally {
    // ==================== 关闭数据库连接 ====================
    await prisma.$disconnect();
  }
}

// ============================================
// 批量录入资金变动（可选扩展功能）
// ============================================

/**
 * 批量录入资金变动
 * 用于新周期开始时批量处理多用户的入金/出金
 *
 * @param transactions - 资金变动数组
 *
 * @example
 * ```typescript
 * const result = await adminBatchRecordTransactions([
 *   { fundId: 'fund_xxx', userId: 'user_1', type: 'DEPOSIT', amount: 10000 },
 *   { fundId: 'fund_xxx', userId: 'user_2', type: 'DEPOSIT', amount: 20000 },
 * ]);
 * ```
 */
export async function adminBatchRecordTransactions(
  transactions: Array<{
    fundId: string;
    userId: string;
    type: TransactionTypeInput;
    amount: number;
    description?: string;
  }>
): Promise<ActionResult<{ successCount: number; failedCount: number; records: TransactionRecord[] }>> {
  const successRecords: TransactionRecord[] = [];
  let failedCount = 0;

  for (const tx of transactions) {
    const result = await adminRecordTransaction(tx);

    if (result.success && result.data) {
      successRecords.push(result.data);
    } else {
      failedCount++;
      console.error(`批量录入失败 [userId: ${tx.userId}]:`, result.error);
    }
  }

  return {
    success: failedCount === 0,
    message: `批量录入完成：成功 ${successRecords.length} 条，失败 ${failedCount} 条`,
    data: {
      successCount: successRecords.length,
      failedCount,
      records: successRecords,
    },
  };
}
