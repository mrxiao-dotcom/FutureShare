'use server';

/**
 * 基金结算 Server Action
 *
 * 功能：管理员触发结算分红操作
 * 核心逻辑：
 * 1. 验证输入数据
 * 2. 获取基金当前状态
 * 3. 计算分配结果
 * 4. 创建结算记录
 * 5. 更新高水位线（基准本金）
 */

import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';

// ============================================
// 类型定义
// ============================================

/**
 * 结算输入参数
 */
export interface SettlementInput {
  /** 基金ID */
  fundId: string;
  /** 当前实际总权益 */
  currentAssets: number;
}

/**
 * 结算返回结果
 */
export interface SettlementResult {
  success: boolean;
  message: string;
  data?: {
    cycleNumber: number;
    profit: number;
    priorityAmount: number;
    juniorAmount: number;
    traderAmount: number;
    newBaseCapital: number;
  };
  error?: string;
}

// ============================================
// Prisma 客户端
// ============================================

const prisma = new PrismaClient();

// ============================================
// Server Action: 触发结算分红
// ============================================

/**
 * 管理员触发结算分红
 *
 * @param input.fundId - 基金ID
 * @param input.currentAssets - 当前实际总权益（管理员填写）
 *
 * @returns 结算结果
 *
 * @example
 * ```typescript
 * const result = await adminTriggerSettlement({
 *   fundId: 'fund_xxx',
 *   currentAssets: 1100000
 * });
 * ```
 */
export async function adminTriggerSettlement(
  input: SettlementInput
): Promise<SettlementResult> {
  try {
    // ==================== 第一步：参数校验 ====================
    if (!input.fundId || typeof input.fundId !== 'string') {
      return {
        success: false,
        message: '参数错误',
        error: '基金ID不能为空',
      };
    }

    if (typeof input.currentAssets !== 'number' || input.currentAssets < 0) {
      return {
        success: false,
        message: '参数错误',
        error: '当前总权益必须是大于等于0的数字',
      };
    }

    // ==================== 第二步：查询基金信息 ====================
    const fund = await prisma.fund.findUnique({
      where: { id: input.fundId },
      include: {
        settlements: {
          orderBy: { cycleNumber: 'desc' },
          take: 1,
        },
      },
    });

    if (!fund) {
      return {
        success: false,
        message: '基金不存在',
        error: `未找到ID为 ${input.fundId} 的基金`,
      };
    }

    // ==================== 第三步：计算当前周期号 ====================
    const lastCycle = fund.settlements[0];
    const cycleNumber = lastCycle ? lastCycle.cycleNumber + 1 : 1;

    // ==================== 第四步：计算盈亏 ====================
    const baseCapital = fund.baseCapital || fund.currentPriorityCapital + fund.currentJuniorCapital;
    const profit = input.currentAssets - baseCapital;
    const isProfit = profit > 0;

    // ==================== 第五步：计算各方分配金额 ====================
    let traderAmount: number;
    let priorityAmount: number;
    let juniorAmount: number;
    let priorityAssets: number;
    let juniorAssets: number;

    if (isProfit) {
      // 盈利分配
      traderAmount = profit * fund.traderShareRatio;
      priorityAmount = profit * fund.priorityShareRatio;
      juniorAmount = profit * fund.juniorShareRatio;
      priorityAssets = fund.currentPriorityCapital + priorityAmount;
      juniorAssets = fund.currentJuniorCapital + juniorAmount;
    } else {
      // 亏损分配：优先保本，劣后承担
      traderAmount = 0;
      priorityAmount = 0;
      juniorAmount = profit; // 负数
      priorityAssets = fund.currentPriorityCapital; // 保本
      juniorAssets = fund.currentJuniorCapital + profit;
    }

    // ==================== 第六步：创建结算记录 ====================
    const settlement = await prisma.settlement.create({
      data: {
        fundId: input.fundId,
        cycleNumber,
        startDate: lastCycle?.endDate || fund.createdAt,
        endDate: new Date(),
        startAssets: baseCapital,
        endAssets: input.currentAssets,
        profit,
        priorityAmount,
        juniorAmount,
        traderAmount,
        newBaseCapital: input.currentAssets,
        status: 'COMPLETED',
      },
    });

    // ==================== 第七步：更新基金状态 ====================
    await prisma.fund.update({
      where: { id: input.fundId },
      data: {
        // 更新基准本金为当前总权益（新高水位线）
        baseCapital: input.currentAssets,
        // 更新各方本金
        currentPriorityCapital: priorityAssets,
        currentJuniorCapital: juniorAssets,
        // 重置总资产
        totalAssets: input.currentAssets,
      },
    });

    // ==================== 第八步：创建结算分红交易记录 ====================
    await prisma.transaction.createMany({
      data: [
        // 操盘手分红
        ...(traderAmount > 0
          ? [
              {
                fundId: input.fundId,
                type: 'DIVIDEND' as const,
                amount: traderAmount,
                status: 'COMPLETED' as const,
                description: `第${cycleNumber}周期操盘手分红`,
                settledAmount: traderAmount,
              },
            ]
          : []),
        // 劣后用户分红（汇总）
        ...(juniorAmount > 0
          ? [
              {
                fundId: input.fundId,
                type: 'DIVIDEND' as const,
                amount: juniorAmount,
                status: 'COMPLETED' as const,
                description: `第${cycleNumber}周期劣后用户分红`,
                settledAmount: juniorAmount,
              },
            ]
          : []),
      ],
    });

    // ==================== 第九步：刷新页面数据 ====================
    revalidatePath('/admin');

    // ==================== 返回成功结果 ====================
    return {
      success: true,
      message: `第${cycleNumber}周期结算完成${isProfit ? '（盈利）' : '（亏损）'}`,
      data: {
        cycleNumber,
        profit,
        priorityAmount,
        juniorAmount,
        traderAmount,
        newBaseCapital: input.currentAssets,
      },
    };

  } catch (error) {
    // ==================== 错误处理 ====================
    console.error('【结算分红】操作失败:', error);

    const errorMessage = error instanceof Error ? error.message : '未知错误';

    return {
      success: false,
      message: '结算失败',
      error: errorMessage,
    };

  } finally {
    await prisma.$disconnect();
  }
}

// ============================================
// Server Action: 获取基金简要信息
// ============================================

/**
 * 获取指定基金的核心数据
 * 用于管理员页面展示
 */
export async function getFundSummary(fundId: string) {
  try {
    const fund = await prisma.fund.findUnique({
      where: { id: fundId },
      select: {
        id: true,
        name: true,
        totalAssets: true,
        baseCapital: true,
        currentPriorityCapital: true,
        currentJuniorCapital: true,
        traderShareRatio: true,
        priorityShareRatio: true,
        juniorShareRatio: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!fund) {
      return { success: false, error: '基金不存在' };
    }

    return {
      success: true,
      data: fund,
    };
  } catch (error) {
    console.error('【获取基金信息】失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

// ============================================
// Server Action: 获取劣后用户列表
// ============================================

/**
 * 获取所有劣后用户及其份额信息
 */
export async function getJuniorUsers(fundId?: string) {
  try {
    const users = await prisma.user.findMany({
      where: {
        userType: 'JUNIOR',
        ...(fundId && {
          participations: {
            some: { fundId },
          },
        }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        userType: true,
        shareRatio: true,
        status: true,
        totalProfit: true,
        totalLoss: true,
        createdAt: true,
        participations: {
          where: fundId ? { fundId } : undefined,
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: users.map((user) => ({
        ...user,
        currentCapital: user.participations[0]?.capitalAmount || 0,
        shareRatio: user.participations[0]?.shareRatio || user.shareRatio,
      })),
    };
  } catch (error) {
    console.error('【获取劣后用户】失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

// ============================================
// Server Action: 获取所有基金
// ============================================

/**
 * 获取所有基金列表
 */
export async function getAllFunds() {
  try {
    const funds = await prisma.fund.findMany({
      select: {
        id: true,
        name: true,
        totalAssets: true,
        baseCapital: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: funds,
    };
  } catch (error) {
    console.error('【获取基金列表】失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}
