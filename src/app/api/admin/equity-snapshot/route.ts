/**
 * 权益快照 API Handler
 *
 * 用于定时获取并保存基金的每日权益快照
 * 支持手动触发和定时任务调用
 *
 * POST /api/admin/equity-snapshot - 创建权益快照
 * GET /api/admin/equity-snapshot - 获取快照列表
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * POST Handler: 创建权益快照
 *
 * 业务流程：
 * 1. 获取基金当前状态
 * 2. 计算可分配利润 = 当前权益 - 总出资
 * 3. 按比例计算各方应得权益
 * 4. 保存快照记录
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fundId, totalAssets, snapshotDate } = body;

    if (!fundId) {
      return NextResponse.json(
        { success: false, error: '基金ID不能为空' },
        { status: 400 }
      );
    }

    const assets = parseFloat(totalAssets);
    if (isNaN(assets) || assets < 0) {
      return NextResponse.json(
        { success: false, error: '权益金额无效' },
        { status: 400 }
      );
    }

    // 查询基金
    const fund = await prisma.fund.findUnique({
      where: { id: fundId },
      include: {
        participants: {
          where: { status: 'ACTIVE' },
          include: { user: true },
        },
      },
    });

    if (!fund) {
      return NextResponse.json(
        { success: false, error: '基金不存在' },
        { status: 404 }
      );
    }

    // 计算总出资（优先 + 劣后）
    const totalContributions = fund.currentPriorityCapital + fund.currentJuniorCapital;
    
    // 计算可分配利润
    const distributableProfit = assets - totalContributions;
    
    // 按配置比例计算各方理论权益
    const traderShare = distributableProfit > 0 
      ? distributableProfit * fund.traderShareRatio 
      : 0;
    const priorityShare = distributableProfit > 0 
      ? distributableProfit * fund.priorityShareRatio 
      : 0;
    const juniorShare = distributableProfit > 0 
      ? distributableProfit * fund.juniorShareRatio 
      : 0;

    // 计算各方实际权益
    const priorityAssets = fund.currentPriorityCapital + priorityShare;
    const juniorAssets = fund.currentJuniorCapital + juniorShare;
    const traderAssets = traderShare;

    // 快照日期
    const snapshotTime = snapshotDate ? new Date(snapshotDate) : new Date();
    const snapshotDateOnly = new Date(snapshotTime.toISOString().split('T')[0]);

    // 检查是否已存在当日快照（覆盖更新）
    const existingSnapshot = await prisma.dailySnapshot.findFirst({
      where: {
        fundId,
        snapshotDate: {
          gte: new Date(snapshotDateOnly.setHours(0, 0, 0, 0)),
          lt: new Date(snapshotDateOnly.setHours(23, 59, 59, 999)),
        },
      },
    });

    let snapshot;
    if (existingSnapshot) {
      // 更新现有快照
      snapshot = await prisma.dailySnapshot.update({
        where: { id: existingSnapshot.id },
        data: {
          totalAssets: assets,
          priorityAssets,
          juniorAssets,
          traderAssets,
          priorityShare,
          juniorShare,
          traderShare,
          dailyProfit: distributableProfit,
          cumulativeProfit: distributableProfit,
        },
      });
    } else {
      // 创建新快照
      snapshot = await prisma.dailySnapshot.create({
        data: {
          fundId,
          snapshotDate: snapshotTime,
          totalAssets: assets,
          priorityAssets,
          juniorAssets,
          traderAssets,
          priorityShare,
          juniorShare,
          traderShare,
          dailyProfit: distributableProfit,
          cumulativeProfit: distributableProfit,
        },
      });
    }

    // 更新基金的最新权益
    await prisma.fund.update({
      where: { id: fundId },
      data: { totalAssets: assets },
    });

    return NextResponse.json({
      success: true,
      message: '权益快照保存成功',
      data: {
        snapshotId: snapshot.id,
        snapshotDate: snapshot.snapshotDate,
        totalAssets: assets,
        totalContributions,
        distributableProfit,
        priorityAssets,
        juniorAssets,
        traderAssets,
        isProfit: distributableProfit >= 0,
      },
    });

  } catch (error) {
    console.error('【权益快照】失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * GET Handler: 获取权益快照列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fundId = searchParams.get('fundId');
    const days = parseInt(searchParams.get('days') || '30');
    const userId = searchParams.get('userId'); // 可选：获取特定用户的权益

    if (!fundId) {
      return NextResponse.json(
        { success: false, error: '基金ID不能为空' },
        { status: 400 }
      );
    }

    // 计算日期范围
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 获取快照列表
    const snapshots = await prisma.dailySnapshot.findMany({
      where: {
        fundId,
        snapshotDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { snapshotDate: 'desc' },
    });

    // 如果指定了用户，获取该用户的份额信息
    let userEquity = null;
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          participations: {
            where: { fundId, status: 'ACTIVE' },
          },
        },
      });

      if (user && user.participations.length > 0) {
        const participation = user.participations[0];
        userEquity = {
          userId: user.id,
          userName: user.displayName || user.name,
          userType: user.userType,
          capitalAmount: participation.capitalAmount,
          shareRatio: participation.shareRatio,
        };
      }
    }

    // 获取基金信息
    const fund = await prisma.fund.findUnique({
      where: { id: fundId },
      select: {
        id: true,
        name: true,
        totalAssets: true,
        currentPriorityCapital: true,
        currentJuniorCapital: true,
        traderShareRatio: true,
        priorityShareRatio: true,
        juniorShareRatio: true,
      },
    });

    if (!fund) {
      return NextResponse.json(
        { success: false, error: '基金不存在' },
        { status: 404 }
      );
    }

    // 计算总出资
    const totalContributions = fund.currentPriorityCapital + fund.currentJuniorCapital;
    const currentProfit = fund.totalAssets - totalContributions;

    return NextResponse.json({
      success: true,
      data: {
        fund: {
          ...fund,
          totalContributions,
          currentProfit,
          isProfit: currentProfit >= 0,
        },
        snapshots: snapshots.map(s => ({
          id: s.id,
          snapshotDate: s.snapshotDate,
          totalAssets: s.totalAssets,
          priorityAssets: s.priorityAssets,
          juniorAssets: s.juniorAssets,
          traderAssets: s.traderAssets,
          dailyProfit: s.dailyProfit,
          cumulativeProfit: s.cumulativeProfit,
        })),
        userEquity,
      },
    });

  } catch (error) {
    console.error('【获取权益快照】失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
