import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * POST Handler: 用户操作（停用/启用/退出/删除）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, action } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '用户ID不能为空' },
        { status: 400 }
      );
    }

    if (!action || !['suspend', 'activate', 'withdraw', 'delete'].includes(action)) {
      return NextResponse.json(
        { success: false, error: '无效的操作类型' },
        { status: 400 }
      );
    }

    // 获取用户
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        participations: {
          where: { status: 'ACTIVE' },
          take: 1,
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }

    const participation = user.participations[0];

    // 删除操作：直接删除用户及其关联数据
    if (action === 'delete') {
      // 先更新基金资金（如果需要）
      if (participation) {
        if (user.userType === 'JUNIOR') {
          await prisma.fund.update({
            where: { id: participation.fundId },
            data: {
              currentJuniorCapital: {
                decrement: participation.capitalAmount,
              },
            },
          });
        } else if (user.userType === 'PRIORITY') {
          await prisma.fund.update({
            where: { id: participation.fundId },
            data: {
              currentPriorityCapital: {
                decrement: participation.capitalAmount,
              },
            },
          });
        }
      }

      // 删除用户（关联的参与记录会通过Cascade自动删除）
      await prisma.user.delete({
        where: { id: userId },
      });

      return NextResponse.json({
        success: true,
        message: `已删除用户 ${user.name}`,
      });
    }

    // 根据操作类型更新状态
    let newStatus: string;
    let message: string;

    switch (action) {
      case 'suspend':
        newStatus = 'SUSPENDED';
        message = `已停用用户 ${user.name}`;
        break;
      case 'activate':
        newStatus = 'ACTIVE';
        message = `已启用用户 ${user.name}`;
        break;
      case 'withdraw':
        newStatus = 'WITHDRAWN';
        message = `用户 ${user.name} 已退出`;
        break;
      default:
        return NextResponse.json(
          { success: false, error: '无效操作' },
          { status: 400 }
        );
    }

    // 更新用户状态
    await prisma.user.update({
      where: { id: userId },
      data: { status: newStatus },
    });

    // 如果是退出，同时更新参与记录
    if (action === 'withdraw' && participation) {
      await prisma.fundParticipant.update({
        where: { id: participation.id },
        data: { status: 'WITHDRAWN' },
      });

      // 更新基金资金
      if (user.userType === 'JUNIOR') {
        await prisma.fund.update({
          where: { id: participation.fundId },
          data: {
            currentJuniorCapital: {
              decrement: participation.capitalAmount,
            },
          },
        });
      } else if (user.userType === 'PRIORITY') {
        await prisma.fund.update({
          where: { id: participation.fundId },
          data: {
            currentPriorityCapital: {
              decrement: participation.capitalAmount,
            },
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message,
    });

  } catch (error) {
    console.error('【用户操作】失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
