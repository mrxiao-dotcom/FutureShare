import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Vercel Cron: 每天下午3点生成权益快照
// 触发时间: 0 15 * * * (北京时间 23:00 UTC)
export async function GET(request: Request) {
  try {
    // 验证 cron secret（如果配置了的话）
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 获取第一个基金（或指定基金）
    const fund = await prisma.fund.findFirst();
    
    if (!fund) {
      return NextResponse.json({ message: 'No fund found, skipped' });
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 15, 0, 0);

    // 检查今天是否已有快照
    const existingSnapshot = await prisma.dailySnapshot.findFirst({
      where: {
        fundId: fund.id,
        snapshotDate: {
          gte: today,
          lt: new Date(today.getTime() + 86400000),
        },
      },
    });

    if (existingSnapshot) {
      return NextResponse.json({ 
        message: 'Snapshot already exists today',
        snapshotId: existingSnapshot.id 
      });
    }

    // 计算可分配利润
    const totalContributions = fund.currentPriorityCapital + fund.currentJuniorCapital;
    const profit = fund.totalAssets - totalContributions;

    // 创建快照
    const snapshot = await prisma.dailySnapshot.create({
      data: {
        fundId: fund.id,
        snapshotDate: today,
        totalAssets: fund.totalAssets,
        priorityAssets: fund.currentPriorityCapital + (profit > 0 ? profit * fund.priorityShareRatio : 0),
        juniorAssets: fund.currentJuniorCapital + (profit > 0 ? profit * fund.juniorShareRatio : Math.max(0, -profit)),
        traderAssets: profit > 0 ? profit * fund.traderShareRatio : 0,
        priorityShare: profit > 0 ? profit * fund.priorityShareRatio : 0,
        juniorShare: profit > 0 ? profit * fund.juniorShareRatio : 0,
        traderShare: profit > 0 ? profit * fund.traderShareRatio : 0,
        dailyProfit: profit,
        cumulativeProfit: profit,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Daily snapshot created',
      snapshotId: snapshot.id,
      fundId: fund.id,
      totalAssets: fund.totalAssets,
      profit: profit,
      createdAt: today.toISOString(),
    });

  } catch (error) {
    console.error('Cron error:', error);
    return NextResponse.json(
      { error: 'Failed to create snapshot' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// 允许 GET 请求（Vercel Cron 使用 GET）
export const dynamic = 'force-dynamic';