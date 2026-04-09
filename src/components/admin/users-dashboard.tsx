'use client';

/**
 * 投资者管理客户端组件
 */

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { UserForm } from '@/components/admin/user-form';
import { UserList } from '@/components/admin/user-list';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Users, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface Fund {
  id: string;
  name: string;
  currentJuniorCapital: number;
  currentPriorityCapital: number;
}

interface User {
  id: string;
  name: string;
  email: string | null;
  capitalAmount: number;
  shareRatio: number;
  status: string;
  createdAt: Date;
}

interface UsersDashboardProps {
  funds: Fund[];
  fund: Fund | null;
  juniorUsers: User[];
  priorityUsers: User[];
}

/**
 * 加载状态组件
 */
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">加载中...</p>
      </div>
    </div>
  );
}

/**
 * 用户管理主内容组件
 */
function UsersManagementContent({ funds, fund, juniorUsers, priorityUsers }: UsersDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedFundId = searchParams.get('fundId');
  const activeFundId = selectedFundId || (funds.length > 0 ? funds[0].id : '');

  const handleFundChange = (newFundId: string) => {
    router.push(`/admin/users?fundId=${newFundId}`);
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
            <h1 className="text-3xl font-bold tracking-tight">投资者管理</h1>
            <p className="text-muted-foreground mt-1">
              管理 {fund.name} 的劣后和优先投资者
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* 添加用户表单 */}
            <UserForm
              fundId={fund.id}
              totalJuniorCapital={fund.currentJuniorCapital}
              totalPriorityCapital={fund.currentPriorityCapital}
              existingJuniorUsers={juniorUsers.map((u) => ({
                id: u.id,
                name: u.name,
                capitalAmount: u.capitalAmount,
              }))}
              existingPriorityUsers={priorityUsers.map((u) => ({
                id: u.id,
                name: u.name,
                capitalAmount: u.capitalAmount,
              }))}
            />

            {/* 用户列表 */}
            <UserList
              juniorUsers={juniorUsers}
              priorityUsers={priorityUsers}
              totalJuniorCapital={fund.currentJuniorCapital}
              totalPriorityCapital={fund.currentPriorityCapital}
              fundId={fund.id}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

/**
 * 主导出组件 - 使用 Suspense 包裹
 */
export function UsersDashboard(props: UsersDashboardProps) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <UsersManagementContent {...props} />
    </Suspense>
  );
}
