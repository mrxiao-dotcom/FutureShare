'use client';

/**
 * 管理员后台客户端组件
 *
 * 包含交互逻辑：基金切换、退出登录等
 */

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SettlementConsole } from '@/components/admin/settlement-console';
import { TransactionForm } from '@/components/admin/transaction-form';
import { JuniorUsersOverview } from '@/components/admin/junior-users-overview';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Plus } from 'lucide-react';
import Link from 'next/link';

interface Fund {
  id: string;
  name: string;
}

interface Settlement {
  cycleNumber: number;
  endDate: Date | null;
  profit: number;
  status: string;
}

interface JuniorUser {
  id: string;
  name: string;
  email: string;
  shareRatio: number;
  status: string;
  totalProfit: number;
  totalLoss: number;
  currentCapital: number;
  createdAt: Date;
}

interface FundWithData {
  id: string;
  name: string;
  totalAssets: number;
  baseCapital: number;
  currentPriorityCapital: number;
  currentJuniorCapital: number;
  traderShareRatio: number;
  priorityShareRatio: number;
  juniorShareRatio: number;
  settlements: Settlement[];
}

interface AdminDashboardProps {
  funds: Fund[];
  fund: FundWithData | null;
  juniorUsers: JuniorUser[];
}

export function AdminDashboard({ funds, fund, juniorUsers }: AdminDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // 获取当前选中的基金ID
  const selectedFundId = searchParams.get('fundId');
  const activeFundId = selectedFundId || (funds.length > 0 ? funds[0].id : '');

  // 获取上次结算信息
  const lastSettlement = fund?.settlements[0];

  const handleFundChange = (newFundId: string) => {
    router.push(`/admin?fundId=${newFundId}`);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/admin/auth', { method: 'DELETE' });
      router.push('/admin/login');
    } catch (error) {
      console.error('Logout failed:', error);
      setIsLoggingOut(false);
    }
  };

  // 如果没有基金，显示提示
  if (funds.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold">
                <span className="text-primary">Future</span>
                <span className="text-blue-600">Shares</span>
              </span>
              <span className="text-sm text-muted-foreground">管理后台</span>
            </div>
          </div>
        </header>

        <main className="container py-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                暂无基金数据
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                请先创建基金数据，然后才能使用管理后台功能。
              </p>
              <div className="flex gap-4">
                <Link
                  href="/admin/setup"
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  创建示例基金
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

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

          {/* 基金切换器 */}
          {funds.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">当前基金：</span>
              <select
                className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={activeFundId}
                onChange={(e) => handleFundChange(e.target.value)}
              >
                {funds.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 退出登录 */}
          <button
            type="button"
            className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? '退出中...' : '退出登录'}
          </button>
        </div>
      </header>

      {/* 内容区域：侧边栏 + 主内容 */}
      <div className="flex">
        {/* 侧边导航 */}
        <AdminSidebar fundId={activeFundId} />

        {/* 主内容 */}
        <main className="flex-1 container py-8 space-y-8">
          {/* 页面标题 */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">大盘状态与结算控制台</h1>
            <p className="text-muted-foreground mt-1">
              管理基金状态、触发结算、录入资金变动
            </p>
          </div>

          {/* 结算控制台 */}
          {fund && (
            <SettlementConsole
              fundId={fund.id}
              fundData={{
                name: fund.name,
                totalAssets: fund.totalAssets,
                baseCapital: fund.baseCapital,
                currentPriorityCapital: fund.currentPriorityCapital,
                currentJuniorCapital: fund.currentJuniorCapital,
                traderShareRatio: fund.traderShareRatio,
                priorityShareRatio: fund.priorityShareRatio,
                juniorShareRatio: fund.juniorShareRatio,
              }}
              lastSettlement={
                lastSettlement
                  ? {
                      cycleNumber: lastSettlement.cycleNumber,
                      endDate: lastSettlement.endDate,
                      profit: lastSettlement.profit,
                      status: lastSettlement.status,
                    }
                  : undefined
              }
            />
          )}

          {/* 下半部分：资金录入 + 用户列表 */}
          <div className="grid gap-8 lg:grid-cols-2">
            {/* 资金变更录入 */}
            <TransactionForm
              fundId={activeFundId}
              juniorUsers={juniorUsers}
            />

            {/* 劣后用户份额明细 */}
            <JuniorUsersOverview
              users={juniorUsers}
              juniorPoolAssets={fund?.currentJuniorCapital || 0}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
