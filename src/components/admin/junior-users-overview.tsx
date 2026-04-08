'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, TrendingDown, RefreshCw, DollarSign } from 'lucide-react';
import { formatCurrency, formatPercent, formatDateTime } from '@/lib/utils';

/**
 * 劣后用户份额明细组件
 * 客户端组件，展示用户列表和份额信息
 */

interface JuniorUsersOverviewProps {
  /** 用户列表 */
  users: Array<{
    id: string;
    name: string;
    email: string | null;
    shareRatio: number;
    status: string;
    totalProfit: number;
    totalLoss: number;
    currentCapital: number;
    createdAt: Date;
  }>;
  /** 当前劣后池总权益（用于计算用户权益） */
  juniorPoolAssets: number;
  /** 刷新回调 */
  onRefresh?: () => void;
}

/**
 * 状态徽章映射
 */
const STATUS_BADGES: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  ACTIVE: { label: '参与中', variant: 'default' },
  SUSPENDED: { label: '已停用', variant: 'secondary' },
  WITHDRAWN: { label: '已退出', variant: 'destructive' },
};

export function JuniorUsersOverview({ users, juniorPoolAssets, onRefresh }: JuniorUsersOverviewProps) {
  const router = useRouter();

  /**
   * 刷新数据
   */
  const handleRefresh = () => {
    router.refresh();
    onRefresh?.();
  };

  /**
   * 计算用户当前权益
   */
  const calculateUserEquity = (user: typeof users[0]) => {
    if (juniorPoolAssets === 0 || user.shareRatio === 0) {
      return user.currentCapital;
    }
    return juniorPoolAssets * user.shareRatio;
  };

  /**
   * 计算用户盈亏
   */
  const calculateUserProfit = (user: typeof users[0]) => {
    const equity = calculateUserEquity(user);
    return equity - user.currentCapital;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              劣后用户份额明细
            </CardTitle>
            <CardDescription>
              共 {users.length} 位劣后用户，劣后池总权益 {formatCurrency(juniorPoolAssets)}
            </CardDescription>
          </div>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground h-9 px-3"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            刷新
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">暂无劣后用户</p>
            <p className="text-sm text-muted-foreground mt-1">
              请先在基金中录入劣后用户
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>用户信息</TableHead>
                <TableHead>份额比例</TableHead>
                <TableHead>本金</TableHead>
                <TableHead>当前权益</TableHead>
                <TableHead>累计盈亏</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>加入时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const equity = calculateUserEquity(user);
                const profit = calculateUserProfit(user);
                const isProfit = profit >= 0;
                const badge = STATUS_BADGES[user.status] || { label: user.status, variant: 'outline' as const };

                return (
                  <TableRow key={user.id}>
                    {/* 用户信息 */}
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{user.name}</span>
                        {user.email && (
                          <span className="text-xs text-muted-foreground">
                            {user.email}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* 份额比例 */}
                    <TableCell>
                      <span className="font-medium text-primary">
                        {formatPercent(user.shareRatio)}
                      </span>
                    </TableCell>

                    {/* 本金 */}
                    <TableCell>
                      <span>{formatCurrency(user.currentCapital)}</span>
                    </TableCell>

                    {/* 当前权益 */}
                    <TableCell>
                      <span className="font-medium">
                        {formatCurrency(equity)}
                      </span>
                    </TableCell>

                    {/* 累计盈亏 */}
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {isProfit ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        )}
                        <span className={isProfit ? 'text-green-600' : 'text-red-600'}>
                          {isProfit ? '+' : ''}{formatCurrency(profit)}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        盈: {formatCurrency(user.totalProfit)} / 亏: {formatCurrency(user.totalLoss)}
                      </div>
                    </TableCell>

                    {/* 状态 */}
                    <TableCell>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </TableCell>

                    {/* 加入时间 */}
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(user.createdAt)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
