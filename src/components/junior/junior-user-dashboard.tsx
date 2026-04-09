'use client';

/**
 * 劣后用户权益仪表盘
 *
 * 功能：
 * - 显示基金净值和权益曲线
 * - 显示用户当前可分配利润和最新权益
 * - 显示用户历史分红
 * - 显示基金历史分红
 */

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  Calendar,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  History,
  PieChart,
  LogOut,
} from 'lucide-react';
import { formatCurrency, formatPercent, formatDate, formatDateTime } from '@/lib/utils';

interface Snapshot {
  id: string;
  snapshotDate: string;
  totalAssets: number;
  priorityAssets: number;
  juniorAssets: number;
  traderAssets: number;
  dailyProfit: number;
  cumulativeProfit: number;
}

interface FundInfo {
  id: string;
  name: string;
  totalAssets: number;
  currentPriorityCapital: number;
  currentJuniorCapital: number;
  traderShareRatio: number;
  priorityShareRatio: number;
  juniorShareRatio: number;
  totalContributions: number;
  currentProfit: number;
  isProfit: boolean;
}

interface UserEquity {
  userId: string;
  userName: string;
  userType: string;
  capitalAmount: number;
  shareRatio: number;
}

interface JuniorUserDashboardProps {
  fundId: string;
  fundInfo: FundInfo;
  snapshots: Snapshot[];
  userEquity: UserEquity | null;
  userDividends: Array<{
    id: string;
    cycleNumber: number;
    amount: number;
    date: string;
    status: string;
  }>;
  fundDividends: Array<{
    id: string;
    cycleNumber: number;
    profit: number;
    traderAmount: number;
    priorityAmount: number;
    juniorAmount: number;
    date: string;
  }>;
}

export function JuniorUserDashboard({
  fundId,
  fundInfo,
  snapshots,
  userEquity,
  userDividends,
  fundDividends,
}: JuniorUserDashboardProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 计算用户权益
  const myEquity = useMemo(() => {
    if (!userEquity) return null;

    const { capitalAmount, shareRatio } = userEquity;
    const totalContributions = fundInfo.currentJuniorCapital;
    const totalProfit = fundInfo.currentProfit > 0 ? fundInfo.currentProfit : 0;

    // 用户可分配利润 = 劣后池总利润 × 用户份额比例
    const myDistributableProfit = totalProfit * shareRatio;
    
    // 用户最新权益 = 出资本金 + 可分配利润
    const myCurrentEquity = capitalAmount + myDistributableProfit;
    
    // 收益率
    const profitRate = myDistributableProfit / capitalAmount;

    return {
      capitalAmount,
      shareRatio,
      myDistributableProfit,
      myCurrentEquity,
      profitRate,
    };
  }, [userEquity, fundInfo]);

  // 转换图表数据（反转数组使时间从左到右）
  const chartData = useMemo(() => {
    return [...snapshots].reverse().map((s) => ({
      date: formatDate(s.snapshotDate),
      totalAssets: s.totalAssets,
      juniorAssets: s.juniorAssets,
      profit: s.dailyProfit,
    }));
  }, [snapshots]);

  // 计算统计数据
  const stats = useMemo(() => {
    if (snapshots.length === 0) {
      return {
        maxEquity: 0,
        minEquity: 0,
        avgEquity: 0,
        change: 0,
        changePercent: 0,
      };
    }

    const equities = snapshots.map((s) => s.totalAssets);
    const maxEquity = Math.max(...equities);
    const minEquity = Math.min(...equities);
    const avgEquity = equities.reduce((a, b) => a + b, 0) / equities.length;
    const firstEquity = equities[0];
    const lastEquity = equities[equities.length - 1];
    const change = lastEquity - firstEquity;
    const changePercent = firstEquity > 0 ? (change / firstEquity) * 100 : 0;

    return { maxEquity, minEquity, avgEquity, change, changePercent };
  }, [snapshots]);

  return (
    <div className="space-y-6">
      {/* 顶部状态卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* 基金权益 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">基金权益</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(fundInfo.totalAssets)}</div>
            <p className="text-xs text-muted-foreground">
              总出资：{formatCurrency(fundInfo.totalContributions)}
            </p>
          </CardContent>
        </Card>

        {/* 可分配利润 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">可分配利润</CardTitle>
            {fundInfo.isProfit ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${fundInfo.isProfit ? 'text-green-600' : 'text-red-600'}`}>
              {fundInfo.isProfit ? '+' : ''}{formatCurrency(fundInfo.currentProfit)}
            </div>
            <p className="text-xs text-muted-foreground">
              {fundInfo.isProfit ? '盈利中' : '亏损中'}
            </p>
          </CardContent>
        </Card>

        {/* 我的本金 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">我的本金</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myEquity ? formatCurrency(myEquity.capitalAmount) : '-'}</div>
            <p className="text-xs text-muted-foreground">
              份额占比：{myEquity ? formatPercent(myEquity.shareRatio) : '-'}
            </p>
          </CardContent>
        </Card>

        {/* 我的预期分红 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">我的预期分红</CardTitle>
            {myEquity && myEquity.myDistributableProfit >= 0 ? (
              <ArrowUpRight className="h-4 w-4 text-green-600" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${myEquity ? (myEquity.myDistributableProfit >= 0 ? 'text-green-600' : 'text-red-600') : ''}`}>
              {myEquity ? (myEquity.myDistributableProfit >= 0 ? '+' : '') + formatCurrency(myEquity.myDistributableProfit) : '-'}
            </div>
            <p className="text-xs text-muted-foreground">
              收益率：{myEquity ? formatPercent(myEquity.profitRate) : '-'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 我的最新权益 */}
      {myEquity && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              我的最新权益
            </CardTitle>
            <CardDescription>
              本金 + 可分配利润 = 最新权益
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">出资本金</div>
                <div className="text-xl font-bold">{formatCurrency(myEquity.capitalAmount)}</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">+ 可分配利润</div>
                <div className={`text-xl font-bold ${myEquity.myDistributableProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {myEquity.myDistributableProfit >= 0 ? '+' : ''}{formatCurrency(myEquity.myDistributableProfit)}
                </div>
              </div>
              <div className="text-center p-4 bg-primary/10 rounded-lg border-2 border-primary">
                <div className="text-sm text-muted-foreground mb-1">= 最新权益</div>
                <div className="text-2xl font-bold text-primary">{formatCurrency(myEquity.myCurrentEquity)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 权益曲线 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            基金权益曲线
          </CardTitle>
          <CardDescription>
            近{snapshots.length}日权益走势
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${(value / 10000).toFixed(0)}万`}
                    className="text-muted-foreground"
                  />
                  <Tooltip 
                    formatter={(value) => formatCurrency(value as number)}
                    labelFormatter={(label) => `日期：${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="totalAssets"
                    fill="hsl(var(--primary) / 0.1)"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    name="总资产"
                  />
                  <Line
                    type="monotone"
                    dataKey="juniorAssets"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="劣后池权益"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              暂无权益数据
            </div>
          )}

          {/* 统计信息 */}
          {chartData.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground">最高权益</div>
                <div className="font-medium">{formatCurrency(stats.maxEquity)}</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground">最低权益</div>
                <div className="font-medium">{formatCurrency(stats.minEquity)}</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground">平均权益</div>
                <div className="font-medium">{formatCurrency(stats.avgEquity)}</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground">区间涨跌</div>
                <div className={`font-medium ${stats.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.change >= 0 ? '+' : ''}{formatCurrency(stats.change)}
                  ({stats.changePercent >= 0 ? '+' : ''}{stats.changePercent.toFixed(2)}%)
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 双栏：我的分红 + 基金分红历史 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 我的历史分红 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              我的历史分红
            </CardTitle>
            <CardDescription>
              个人累计分红记录
            </CardDescription>
          </CardHeader>
          <CardContent>
            {userDividends.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>周期</TableHead>
                    <TableHead className="text-right">分红金额</TableHead>
                    <TableHead className="text-right">日期</TableHead>
                    <TableHead>状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userDividends.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">第{d.cycleNumber}期</TableCell>
                      <TableCell className="text-right text-green-600 font-medium">
                        +{formatCurrency(d.amount)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatDate(d.date)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="default">{d.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                暂无分红记录
              </div>
            )}
          </CardContent>
        </Card>

        {/* 基金分红历史 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              基金分红历史
            </CardTitle>
            <CardDescription>
              全部分红周期记录
            </CardDescription>
          </CardHeader>
          <CardContent>
            {fundDividends.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>周期</TableHead>
                    <TableHead className="text-right">基金利润</TableHead>
                    <TableHead className="text-right">劣后分配</TableHead>
                    <TableHead>日期</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fundDividends.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">第{d.cycleNumber}期</TableCell>
                      <TableCell className={`text-right font-medium ${d.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {d.profit >= 0 ? '+' : ''}{formatCurrency(d.profit)}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {d.juniorAmount > 0 ? '+' : ''}{formatCurrency(d.juniorAmount)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(d.date)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                暂无分红记录
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
