import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * POST: 补齐优先资金
 * 
 * 按1:9比例，自动补足优先资金差额
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fundId } = body;

    if (!fundId) {
      return NextResponse.json(
        { success: false, error: '基金ID不能为空' },
        { status: 400 }
      );
    }

    // 获取基金信息
    const fund = await prisma.fund.findUnique({
      where: { id: fundId },
    });

    if (!fund) {
      return NextResponse.json(
        { success: false, error: '基金不存在' },
        { status: 404 }
      );
    }

    // 计算目标优先资金和差额
    const targetPriorityCapital = fund.currentJuniorCapital * 9;
    const priorityGap = targetPriorityCapital - fund.currentPriorityCapital;

    if (priorityGap <= 0) {
      return NextResponse.json({
        success: true,
        message: '优先资金已充足，无需补齐',
        data: { suppliedAmount: 0 },
      });
    }

    // 更新基金优先资金
    await prisma.fund.update({
      where: { id: fundId },
      data: {
        currentPriorityCapital: {
          increment: priorityGap,
        },
        totalAssets: {
          increment: priorityGap,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: '优先资金补齐成功',
      data: {
        suppliedAmount: priorityGap,
        newPriorityCapital: targetPriorityCapital,
      },
    });

  } catch (error) {
    console.error('【补齐优先资金】失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
