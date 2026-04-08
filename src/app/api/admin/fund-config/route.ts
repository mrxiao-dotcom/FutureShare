import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * PUT Handler: 更新基金配置
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      fundId,
      name,
      priorityCapitalRate,
      juniorCapitalRate,
      traderShareRatio,
      priorityShareRatio,
      juniorShareRatio,
    } = body;

    // 参数校验
    if (!fundId) {
      return NextResponse.json(
        { success: false, error: '基金ID不能为空' },
        { status: 400 }
      );
    }

    // 验证比例
    if (
      Math.abs(priorityCapitalRate + juniorCapitalRate - 1) > 0.0001
    ) {
      return NextResponse.json(
        { success: false, error: '优先/劣后本金比例总和必须等于1' },
        { status: 400 }
      );
    }

    if (
      Math.abs(traderShareRatio + priorityShareRatio + juniorShareRatio - 1) > 0.0001
    ) {
      return NextResponse.json(
        { success: false, error: '盈利分配比例总和必须等于1' },
        { status: 400 }
      );
    }

    // 更新基金配置
    const fund = await prisma.fund.update({
      where: { id: fundId },
      data: {
        name,
        priorityCapitalRate,
        juniorCapitalRate,
        traderShareRatio,
        priorityShareRatio,
        juniorShareRatio,
      },
    });

    return NextResponse.json({
      success: true,
      message: '配置更新成功',
      data: fund,
    });

  } catch (error) {
    console.error('【更新基金配置】失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
