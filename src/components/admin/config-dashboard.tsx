'use client';

/**
 * 基金配置客户端组件
 */

import { useRouter, useSearchParams } from 'next/navigation';
import { FundConfigForm } from '@/components/admin/fund-config-form';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Settings } from 'lucide-react';
import Link from 'next/link';

interface Fund {
  id: string;
  name: string;
  priorityCapitalRate: number;
  juniorCapitalRate: number;
  traderShareRatio: number;
  priorityShareRatio: number;
  juniorShareRatio: number;
}

interface ConfigDashboardProps {
  funds: Fund[];
  fund: Fund | null;
}

export function ConfigDashboard({ funds, fund }: ConfigDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedFundId = searchParams.get('fundId');
  const activeFundId = selectedFundId || (funds.length > 0 ? funds[0].id : '');

  const handleFundChange = (newFundId: string) => {
    router.push(`/admin/config?fundId=${newFundId}`);
  };

  // 如果没有基金
  if (funds.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-background/95 backdrop-blur">
          <div className="container flex h-16 items-center">
            <Link href="/admin" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
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

  if (!fund) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-background/95 backdrop-blur">
          <div className="container flex h-16 items-center">
            <Link href="/admin" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
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
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
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
        </div>
      </header>

      {/* 内容区域：侧边栏 + 主内容 */}
      <div className="flex">
        <AdminSidebar fundId={activeFundId} />

        {/* 主内容 */}
        <main className="flex-1 container py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">基金参数配置</h1>
            <p className="text-muted-foreground mt-1">
              配置 {fund.name} 的本金比例和盈利分配规则
            </p>
          </div>

          <FundConfigForm
            fundId={fund.id}
            initialConfig={{
              name: fund.name,
              priorityCapitalRate: fund.priorityCapitalRate,
              juniorCapitalRate: fund.juniorCapitalRate,
              traderShareRatio: fund.traderShareRatio,
              priorityShareRatio: fund.priorityShareRatio,
              juniorShareRatio: fund.juniorShareRatio,
            }}
          />
        </main>
      </div>
    </div>
  );
}
