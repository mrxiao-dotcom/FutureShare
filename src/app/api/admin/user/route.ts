import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * POST Handler: 添加投资者
 *
 * 业务规则：
 * - 份额 = 投资金额（1元=1份）
 * - 比例 = 个人出资 / 同类总出资（自动计算）
 * - 可分配利润 = 总权益 - 总出资
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      fundId,
      name,
      username,
      password,
      userType,
      capitalAmount,
    } = body;

    // 参数校验
    if (!fundId) {
      return NextResponse.json(
        { success: false, error: '基金ID不能为空' },
        { status: 400 }
      );
    }

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: '姓名不能为空' },
        { status: 400 }
      );
    }

    if (!username || !username.trim()) {
      return NextResponse.json(
        { success: false, error: '用户名不能为空' },
        { status: 400 }
      );
    }

    if (!userType || !['JUNIOR', 'PRIORITY', 'TRADER'].includes(userType)) {
      return NextResponse.json(
        { success: false, error: '用户类型无效' },
        { status: 400 }
      );
    }

    if (!capitalAmount || capitalAmount <= 0) {
      return NextResponse.json(
        { success: false, error: '投资金额必须大于0' },
        { status: 400 }
      );
    }

    // 验证基金是否存在
    const fund = await prisma.fund.findUnique({
      where: { id: fundId },
    });

    if (!fund) {
      return NextResponse.json(
        { success: false, error: '基金不存在' },
        { status: 404 }
      );
    }

    // 检查用户名是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { name: username.trim() },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: '用户名已存在' },
        { status: 400 }
      );
    }

    // 计算当前同类用户的总出资
    const existingParticipants = await prisma.fundParticipant.findMany({
      where: {
        fundId,
        user: { userType },
        status: 'ACTIVE',
      },
    });

    const totalCapital = existingParticipants.reduce(
      (sum, p) => sum + p.capitalAmount,
      0
    );

    // 自动计算新用户的比例: 个人出资 / (个人出资 + 现有总出资)
    const newTotalCapital = totalCapital + capitalAmount;
    const shareRatio = newTotalCapital > 0 ? capitalAmount / newTotalCapital : 0;

    // 密码加密
    const hashedPassword = password ? await hash(password, 12) : null;

    // 创建用户
    const user = await prisma.user.create({
      data: {
        name: username.trim(),
        displayName: name.trim(),
        userType,
        shareRatio,
        password: hashedPassword,
        status: 'ACTIVE',
        totalProfit: 0,
        totalLoss: 0,
      },
    });

    // 创建参与记录
    await prisma.fundParticipant.create({
      data: {
        userId: user.id,
        fundId,
        capitalAmount,
        shareRatio,
        status: 'ACTIVE',
      },
    });

    // 更新基金当前资金
    if (userType === 'JUNIOR') {
      // 计算新的劣后总额
      const newJuniorCapital = fund.currentJuniorCapital + capitalAmount;
      // 自动配齐优先资金：优先 = 劣后 × 9
      const targetPriorityCapital = newJuniorCapital * 9;
      const priorityGap = targetPriorityCapital - fund.currentPriorityCapital;

      await prisma.fund.update({
        where: { id: fundId },
        data: {
          currentJuniorCapital: {
            increment: capitalAmount,
          },
          // 自动补足优先资金差额
          currentPriorityCapital: priorityGap > 0 ? {
            increment: priorityGap,
          } : undefined,
          totalAssets: {
            increment: capitalAmount + (priorityGap > 0 ? priorityGap : 0),
          },
        },
      });
    } else if (userType === 'PRIORITY') {
      await prisma.fund.update({
        where: { id: fundId },
        data: {
          currentPriorityCapital: {
            increment: capitalAmount,
          },
          totalAssets: {
            increment: capitalAmount,
          },
        },
      });
    }

    // 重新计算所有同类用户的比例（确保总和为1）
    await recalculateShareRatios(fundId, userType);

    return NextResponse.json({
      success: true,
      message: '投资者添加成功',
      data: {
        userId: user.id,
        name: user.displayName || user.name,
        username: user.name,
        userType: user.userType,
        capitalAmount,
        shareRatio,
      },
    });

  } catch (error) {
    console.error('【添加投资者】失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * 重新计算某类用户的份额比例
 * 确保所有用户比例之和为1
 */
async function recalculateShareRatios(fundId: string, userType: string) {
  const participants = await prisma.fundParticipant.findMany({
    where: {
      fundId,
      user: { userType },
      status: 'ACTIVE',
    },
    include: { user: true },
  });

  if (participants.length === 0) return;

  // 计算总出资
  const totalCapital = participants.reduce(
    (sum, p) => sum + p.capitalAmount,
    0
  );

  if (totalCapital <= 0) return;

  // 批量更新比例
  const updates = participants.map(p => ({
    where: { id: p.id },
    data: {
      shareRatio: p.capitalAmount / totalCapital,
    },
  }));

  const userUpdates = participants.map(p => ({
    where: { id: p.userId },
    data: {
      shareRatio: p.capitalAmount / totalCapital,
    },
  }));

  // 执行批量更新
  for (const update of updates) {
    await prisma.fundParticipant.update(update);
  }
  for (const update of userUpdates) {
    await prisma.user.update(update);
  }
}

/**
 * GET Handler: 获取用户列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fundId = searchParams.get('fundId');
    const userType = searchParams.get('userType');

    const where: any = {};

    if (userType) {
      where.userType = userType;
    }

    if (fundId) {
      where.participations = {
        some: { fundId },
      };
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        participations: fundId ? {
          where: { fundId },
          include: {
            fund: {
              select: { name: true },
            },
          },
        } : undefined,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: users,
    });

  } catch (error) {
    console.error('【获取用户列表】失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
