/**
 * 权益快照管理页面
 *
 * 入口: /admin/snapshot
 */

import { PrismaClient } from '@prisma/client';
import { SnapshotManager } from '@/components/admin/snapshot-manager';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';

const prisma = new PrismaClient();

interface PageProps {
  searchParams: { fundId?: string };
}

async function getFundData(fundId: string) {
  const fund = await prisma.fund.findUnique({
    where: { id: fundId },
    include: {
      settlements: {
        orderBy: { cycleNumber: 'desc' },
        take: 1,
      },
    },
  });

  return fund;
}

async function getSnapshots(fundId: string) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

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

async function getAllFunds() {
  return prisma.fund.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export default async function SnapshotPage({ searchParams }: PageProps) {
  const selectedFundId = searchParams.fundId;
  const funds = await getAllFunds();

  if (funds.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-background/95 backdrop-blur">
          <div className="container flex h-16 items-center">
            <Link href="/admin" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              返回管理后台
            </Link>
          </div>
        </header>
        <main className="container py-8">
          <Card>
            <CardHeader>
              <CardTitle>暂无基金数据</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">请先创建基金数据。</p>
              <Link href="/admin/setup" className="text-primary hover:underline mt-2 inline-block">
                创建示例基金
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const activeFundId = selectedFundId || funds[0].id;
  const fund = await getFundData(activeFundId);

  if (!fund) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-background/95 backdrop-blur">
          <div className="container flex h-16 items-center">
            <Link href="/admin" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              返回管理后台
            </Link>
          </div>
        </header>
        <main className="container py-8">
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              基金不存在
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const snapshots = await getSnapshots(activeFundId);

  // 计算总出资
  const totalContributions = fund.currentPriorityCapital + fund.currentJuniorCapital;

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-xl font-bold">
              <span className="text-primary">Future</span>
              <span className="text-blue-600">Shares</span>
            </span>
            <span className="text-sm text-muted-foreground">管理后台</span>
          </div>

          {funds.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">当前基金：</span>
              <select
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                defaultValue={activeFundId}
                onChange={(e) => {
                  window.location.href = `/admin/snapshot?fundId=${e.target.value}`;
                }}
              >
                {funds.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </header>

      {/* 内容区域：侧边栏 + 主内容 */}
      <div className="flex">
        <AdminSidebar fundId={activeFundId} />

        <main className="flex-1 container py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">权益快照管理</h1>
            <p className="text-muted-foreground mt-1">
              定时录入基金权益，为劣后用户计算可分配利润
            </p>
          </div>

          <SnapshotManager
            fundId={fund.id}
            fundName={fund.name}
            currentEquity={fund.totalAssets}
            totalContributions={totalContributions}
            currentJuniorCapital={fund.currentJuniorCapital}
            currentPriorityCapital={fund.currentPriorityCapital}
            traderShareRatio={fund.traderShareRatio}
            priorityShareRatio={fund.priorityShareRatio}
            juniorShareRatio={fund.juniorShareRatio}
            snapshots={snapshots.map((s) => ({
              id: s.id,
              snapshotDate: s.snapshotDate.toISOString(),
              totalAssets: s.totalAssets,
              totalContributions,
              distributableProfit: s.totalAssets - totalContributions,
              priorityAssets: s.priorityAssets,
              juniorAssets: s.juniorAssets,
              traderAssets: s.traderAssets,
              isProfit: s.totalAssets >= totalContributions,
            }))}
          />
        </main>
      </div>
    </div>
  );
}
