'use server';

/**
 * 资金变动录入 API Handler
 *
 * POST /api/admin/transaction
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { TransactionType, TransactionStatus } from '@/lib/constants';

const prisma = new PrismaClient();

/**
 * 参数校验
 */
function validateParams(body: any): { valid: boolean; error?: string; data?: any } {
  const errors: string[] = [];
  const data: any = {};

  // fundId
  if (!body.fundId || typeof body.fundId !== 'string') {
    errors.push('fundId不能为空');
  } else {
    data.fundId = body.fundId;
  }

  // userId
  if (!body.userId || typeof body.userId !== 'string') {
    errors.push('userId不能为空');
  } else {
    data.userId = body.userId;
  }

  // type
  if (!body.type || !['DEPOSIT', 'WITHDRAWAL'].includes(body.type)) {
    errors.push('type必须是 DEPOSIT 或 WITHDRAWAL');
  } else {
    data.type = body.type;
  }

  // amount
  const amount = parseFloat(body.amount);
  if (isNaN(amount) || amount <= 0) {
    errors.push('金额必须大于0');
  } else {
    data.amount = amount;
  }

  // description
  data.description = body.description || null;

  if (errors.length > 0) {
    return { valid: false, error: errors.join('; ') };
  }

  return { valid: true, data };
}

/**
 * POST Handler: 录入资金变动
 */
export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body = await request.json();

    // 参数校验
    const validation = validateParams(body);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, message: '参数校验失败', error: validation.error },
        { status: 400 }
      );
    }

    const { fundId, userId, type, amount, description } = validation.data;

    // 查询基金
    const fund = await prisma.fund.findUnique({
      where: { id: fundId },
    });

    if (!fund) {
      return NextResponse.json(
        { success: false, message: '基金不存在' },
        { status: 404 }
      );
    }

    // 查询用户
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: '用户不存在' },
        { status: 404 }
      );
    }

    // 创建交易记录
    const transaction = await prisma.transaction.create({
      data: {
        fundId,
        userId,
        type: type as string,
        amount,
        status: TransactionStatus.COMPLETED,
        description,
      },
    });

    // 更新基金劣后本金
    const capitalChange = type === 'DEPOSIT' ? amount : -amount;
    await prisma.fund.update({
      where: { id: fundId },
      data: {
        currentJuniorCapital: {
          increment: capitalChange,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `成功录入${type === 'DEPOSIT' ? '入金' : '出金'}记录`,
      data: {
        id: transaction.id,
        fundId: transaction.fundId,
        userId: transaction.userId,
        type: transaction.type,
        amount: transaction.amount,
        status: transaction.status,
        description: transaction.description,
        createdAt: transaction.createdAt,
      },
    });

  } catch (error) {
    console.error('【资金变动录入】失败:', error);
    return NextResponse.json(
      {
        success: false,
        message: '操作失败',
        error: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
