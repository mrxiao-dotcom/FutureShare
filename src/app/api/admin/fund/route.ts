import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/admin/fund - 获取基金列表
 *
 * 返回所有基金的基本信息（ID和名称）
 */
export async function GET() {
  try {
    const funds = await prisma.fund.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: funds,
    });
  } catch (error) {
    console.error('【获取基金列表】失败:', error);
    return NextResponse.json(
      { success: false, error: '获取基金列表失败' },
      { status: 500 }
    );
  }
}
