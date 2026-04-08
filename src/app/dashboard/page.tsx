/**
 * 劣后用户权益页面
 *
 * 入口: /dashboard
 * 功能：展示基金净值、权益曲线、个人权益、历史分红
 */

import { PrismaClient } from '@prisma/client';
import { JuniorUserDashboard } from '@/components/junior/junior-user-dashboard';
import { DashboardHeader } from '@/components/junior/dashboard-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

const prisma = new PrismaClient();

interface PageProps {
  searchParams: { fundId?: string };
}

async function getFundWithEquity(fundId: string) {
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

  return fund;
}

async function getEquitySnapshots(fundId: string, days: number = 30) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

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

  return snapshots;
}

async function getFundDividends(fundId: string) {
  const settlements = await prisma.settlement.findMany({
    where: {
      fundId,
      status: 'COMPLETED',
    },
    orderBy: { cycleNumber: 'desc' },
  });

  return settlements.map((s) => ({
    id: s.id,
    cycleNumber: s.cycleNumber,
    profit: s.profit,
    traderAmount: s.traderAmount,
    priorityAmount: s.priorityAmount,
    juniorAmount: s.juniorAmount,
    date: s.endDate.toISOString(),
  }));
}

async function getAllFunds() {
  return prisma.fund.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export default async function JuniorDashboardPage({ searchParams }: PageProps) {
  const selectedFundId = searchParams.fundId;
  const funds = await getAllFunds();

  // 如果没有基金
  if (funds.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              暂无基金数据
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              目前没有可查询的基金数据。
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeFundId = selectedFundId || funds[0].id;
  const fund = await getFundWithEquity(activeFundId);

  if (!fund) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-8 text-center text-muted-foreground">
            基金不存在
          </CardContent>
        </Card>
      </div>
    );
  }

  const snapshots = await getEquitySnapshots(activeFundId);
  const fundDividends = await getFundDividends(activeFundId);

  // 计算基金统计
  const totalContributions = fund.currentPriorityCapital + fund.currentJuniorCapital;
  const currentProfit = fund.totalAssets - totalContributions;

  const fundInfo = {
    ...fund,
    totalContributions,
    currentProfit,
    isProfit: currentProfit >= 0,
  };

  // 转换快照数据
  const snapshotData = snapshots.map((s) => ({
    id: s.id,
    snapshotDate: s.snapshotDate.toISOString(),
    totalAssets: s.totalAssets,
    priorityAssets: s.priorityAssets,
    juniorAssets: s.juniorAssets,
    traderAssets: s.traderAssets,
    dailyProfit: s.dailyProfit,
    cumulativeProfit: s.cumulativeProfit,
  }));

  // 获取第一个劣后用户作为示例（实际应该从登录用户获取）
  const juniorUser = await prisma.user.findFirst({
    where: {
      userType: 'JUNIOR',
      participations: {
        some: { fundId: activeFundId, status: 'ACTIVE' },
      },
    },
    include: {
      participations: {
        where: { fundId: activeFundId, status: 'ACTIVE' },
        take: 1,
      },
    },
  });

  let userEquity = null;
  if (juniorUser && juniorUser.participations.length > 0) {
    const participation = juniorUser.participations[0];
    userEquity = {
      userId: juniorUser.id,
      userName: juniorUser.displayName || juniorUser.name,
      userType: juniorUser.userType,
      capitalAmount: participation.capitalAmount,
      shareRatio: participation.shareRatio,
    };
  }

  // 计算用户分红历史
  let userDividends: Array<{
    id: string;
    cycleNumber: number;
    amount: number;
    date: string;
    status: string;
  }> = [];

  if (userEquity) {
    const settlements = await prisma.settlement.findMany({
      where: {
        fundId: activeFundId,
        status: 'COMPLETED',
      },
      orderBy: { cycleNumber: 'desc' },
    });

    userDividends = settlements.map((s) => ({
      id: s.id,
      cycleNumber: s.cycleNumber,
      amount: s.juniorAmount * userEquity!.shareRatio,
      date: s.endDate.toISOString(),
      status: '已完成',
    }));
  }

  return (
    <div className="container py-8 mx-auto">
      {/* 页面标题 */}
      <DashboardHeader userName={userEquity?.userName || '用户'} />

      <JuniorUserDashboard
        fundId={fund.id}
        fundInfo={fundInfo}
        snapshots={snapshotData}
        userEquity={userEquity}
        userDividends={userDividends}
        fundDividends={fundDividends}
      />
    </div>
  );
}
