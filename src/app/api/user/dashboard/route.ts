import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '../../auth/route';

const prisma = new PrismaClient();

/**
 * GET Handler: 获取用户仪表盘数据
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || '';

    if (!token) {
      return NextResponse.json(
        { success: false, error: '未登录' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: '登录已过期' },
        { status: 401 }
      );
    }

    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true,
        email: true,
        userType: true,
        totalProfit: true,
        totalLoss: true,
        status: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }

    // 获取用户的参与记录
    const participations = await prisma.fundParticipant.findMany({
      where: {
        userId: payload.userId,
        status: { in: ['ACTIVE', 'SETTLED'] },
      },
      include: {
        fund: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 获取最近交易记录
    const recentTransactions = await prisma.transaction.findMany({
      where: {
        userId: payload.userId,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      success: true,
      data: {
        user,
        participations: participations.map((p) => ({
          id: p.id,
          capitalAmount: p.capitalAmount,
          shareRatio: p.shareRatio,
          status: p.status,
          fund: p.fund,
        })),
        recentTransactions: recentTransactions.map((t) => ({
          id: t.id,
          type: t.type,
          amount: t.amount,
          status: t.status,
          description: t.description,
          createdAt: t.createdAt.toISOString(),
        })),
      },
    });

  } catch (error) {
    console.error('【获取仪表盘数据】失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
