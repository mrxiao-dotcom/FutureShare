'use server';

/**
 * 结算分红 API Handler
 *
 * POST /api/admin/settlement
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { SettlementStatus, TransactionType, TransactionStatus } from '@/lib/constants';
import { revalidatePath } from 'next/cache';

const prisma = new PrismaClient();

/**
 * POST Handler: 触发结算分红
 */
export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body = await request.json();

    // 参数校验
    const { fundId, currentAssets } = body;

    if (!fundId || typeof fundId !== 'string') {
      return NextResponse.json(
        { success: false, message: '参数错误', error: '基金ID不能为空' },
        { status: 400 }
      );
    }

    const assets = parseFloat(currentAssets);
    if (isNaN(assets) || assets < 0) {
      return NextResponse.json(
        { success: false, message: '参数错误', error: '当前总权益必须是大于等于0的数字' },
        { status: 400 }
      );
    }

    // 查询基金
    const fund = await prisma.fund.findUnique({
      where: { id: fundId },
      include: {
        settlements: {
          orderBy: { cycleNumber: 'desc' },
          take: 1,
        },
      },
    });

    if (!fund) {
      return NextResponse.json(
        { success: false, message: '基金不存在' },
        { status: 404 }
      );
    }

    // 计算周期号
    const lastCycle = fund.settlements[0];
    const cycleNumber = lastCycle ? lastCycle.cycleNumber + 1 : 1;

    // 计算基准本金（如果没有设置，使用当前本金总和）
    const baseCapital = fund.baseCapital || (fund.currentPriorityCapital + fund.currentJuniorCapital);
    const profit = assets - baseCapital;
    const isProfit = profit > 0;

    // 计算各方分配
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
      // 亏损分配
      traderAmount = 0;
      priorityAmount = 0;
      juniorAmount = profit;
      priorityAssets = fund.currentPriorityCapital;
      juniorAssets = fund.currentJuniorCapital + profit;
    }

    // 创建结算记录
    const settlement = await prisma.settlement.create({
      data: {
        fundId,
        cycleNumber,
        startDate: lastCycle?.endDate || fund.createdAt,
        endDate: new Date(),
        startAssets: baseCapital,
        endAssets: assets,
        profit,
        priorityAmount,
        juniorAmount,
        traderAmount,
        newBaseCapital: assets,
        status: SettlementStatus.COMPLETED,
      },
    });

    // 更新基金状态
    await prisma.fund.update({
      where: { id: fundId },
      data: {
        baseCapital: assets,
        currentPriorityCapital: priorityAssets,
        currentJuniorCapital: juniorAssets,
        totalAssets: assets,
      },
    });

    // 创建分红流水
    const dividendTransactions = [];

    if (traderAmount > 0) {
      dividendTransactions.push({
        fundId,
        type: TransactionType.DIVIDEND,
        amount: traderAmount,
        status: TransactionStatus.COMPLETED,
        description: `第${cycleNumber}周期操盘手分红`,
        settledAmount: traderAmount,
      });
    }

    if (juniorAmount > 0) {
      dividendTransactions.push({
        fundId,
        type: TransactionType.DIVIDEND,
        amount: juniorAmount,
        status: TransactionStatus.COMPLETED,
        description: `第${cycleNumber}周期劣后用户分红`,
        settledAmount: juniorAmount,
      });
    }

    if (dividendTransactions.length > 0) {
      await prisma.transaction.createMany({
        data: dividendTransactions,
      });
    }

    // 刷新页面
    revalidatePath('/admin');

    return NextResponse.json({
      success: true,
      message: `第${cycleNumber}周期结算完成${isProfit ? '（盈利）' : '（亏损）'}`,
      data: {
        cycleNumber,
        profit,
        priorityAmount,
        juniorAmount,
        traderAmount,
        newBaseCapital: assets,
      },
    });

  } catch (error) {
    console.error('【结算分红】失败:', error);
    return NextResponse.json(
      {
        success: false,
        message: '结算失败',
        error: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
