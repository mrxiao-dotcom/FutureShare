'use client';

/**
 * 权益快照管理组件
 *
 * 功能：
 * - 手动录入基金权益
 * - 查看历史快照
 * - 预览计算结果
 */

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  TrendingUp,
  TrendingDown,
  Save,
  RefreshCw,
  Calendar,
  DollarSign,
  Info,
} from 'lucide-react';
import { formatCurrency, formatPercent, formatDate, formatDateTime } from '@/lib/utils';

interface Snapshot {
  id: string;
  snapshotDate: string;
  totalAssets: number;
  totalContributions: number;
  distributableProfit: number;
  priorityAssets: number;
  juniorAssets: number;
  traderAssets: number;
  isProfit: boolean;
}

interface SnapshotManagerProps {
  fundId: string;
  fundName: string;
  currentEquity: number;
  totalContributions: number;
  currentJuniorCapital: number;
  currentPriorityCapital: number;
  traderShareRatio: number;
  priorityShareRatio: number;
  juniorShareRatio: number;
  snapshots: Snapshot[];
}

export function SnapshotManager({
  fundId,
  fundName,
  currentEquity,
  totalContributions,
  currentJuniorCapital,
  currentPriorityCapital,
  traderShareRatio,
  priorityShareRatio,
  juniorShareRatio,
  snapshots,
}: SnapshotManagerProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [totalAssets, setTotalAssets] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 计算预览
  const preview = useMemo(() => {
    const assets = parseFloat(totalAssets);
    if (isNaN(assets) || assets < 0) return null;

    const profit = assets - totalContributions;
    const isProfit = profit >= 0;

    let priorityAssets = currentPriorityCapital;
    let juniorAssets = currentJuniorCapital;
    let traderAssets = 0;

    if (isProfit) {
      priorityAssets = currentPriorityCapital + profit * priorityShareRatio;
      juniorAssets = currentJuniorCapital + profit * juniorShareRatio;
      traderAssets = profit * traderShareRatio;
    } else {
      // 亏损：劣后承担
      juniorAssets = currentJuniorCapital + profit;
    }

    return {
      assets,
      profit,
      isProfit,
      priorityAssets,
      juniorAssets,
      traderAssets,
    };
  }, [totalAssets, totalContributions, currentPriorityCapital, currentJuniorCapital, priorityShareRatio, juniorShareRatio, traderShareRatio]);

  // 保存快照
  const handleSave = async () => {
    if (!preview) {
      toast({
        variant: 'destructive',
        title: '请输入有效权益',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/admin/equity-snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fundId,
          totalAssets: preview.assets,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: '快照保存成功',
          description: `权益：${formatCurrency(preview.assets)}，利润：${formatCurrency(preview.profit)}`,
        });
        setTotalAssets('');
        router.refresh();
      } else {
        toast({
          variant: 'destructive',
          title: '保存失败',
          description: result.error,
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '操作失败',
        description: error instanceof Error ? error.message : '网络请求失败',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 顶部信息卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">基金名称</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{fundName}</div>
            <p className="text-xs text-muted-foreground">ID: {fundId.slice(0, 8)}...</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">当前权益</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(currentEquity)}</div>
            <p className="text-xs text-muted-foreground">最后更新</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总出资</CardTitle>
            <Info className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(totalContributions)}</div>
            <p className="text-xs text-muted-foreground">
              优先：{formatCurrency(currentPriorityCapital)} / 劣后：{formatCurrency(currentJuniorCapital)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">当前利润</CardTitle>
            {currentEquity >= totalContributions ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-xl font-bold ${currentEquity >= totalContributions ? 'text-green-600' : 'text-red-600'}`}>
              {currentEquity >= totalContributions ? '+' : ''}{formatCurrency(currentEquity - totalContributions)}
            </div>
            <p className="text-xs text-muted-foreground">
              {currentEquity >= totalContributions ? '盈利中' : '亏损中'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 录入权益 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            录入权益快照
          </CardTitle>
          <CardDescription>
            输入当前基金总权益，系统将自动计算各方权益并保存快照
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* 权益输入 */}
            <div className="space-y-2">
              <Label htmlFor="totalAssets">基金总权益（元）</Label>
              <Input
                id="totalAssets"
                type="number"
                step="0.01"
                min="0"
                placeholder="请输入当前总权益"
                value={totalAssets}
                onChange={(e) => setTotalAssets(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                请从交易软件获取账户实时权益
              </p>
            </div>

            {/* 预览结果 */}
            {preview && (
              <div className={`p-4 rounded-lg border ${
                preview.isProfit 
                  ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' 
                  : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
              }`}>
                <div className="flex items-center gap-2 mb-3">
                  {preview.isProfit ? (
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  )}
                  <span className={`font-semibold ${preview.isProfit ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                    预览结果
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span>基金利润：</span>
                    <span className={`font-medium ${preview.isProfit ? 'text-green-700' : 'text-red-700'}`}>
                      {preview.isProfit ? '+' : ''}{formatCurrency(preview.profit)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>优先权益：</span>
                    <span className="font-medium">{formatCurrency(preview.priorityAssets)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>劣后权益：</span>
                    <span className="font-medium">{formatCurrency(preview.juniorAssets)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>投顾权益：</span>
                    <span className="font-medium">{formatCurrency(preview.traderAssets)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 保存按钮 */}
          <Button
            onClick={handleSave}
            disabled={!preview || isSubmitting}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                保存快照
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* 历史快照 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            权益快照历史
          </CardTitle>
          <CardDescription>
            近30日权益快照记录
          </CardDescription>
        </CardHeader>
        <CardContent>
          {snapshots.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>快照时间</TableHead>
                  <TableHead className="text-right">基金权益</TableHead>
                  <TableHead className="text-right">可分配利润</TableHead>
                  <TableHead className="text-right">优先权益</TableHead>
                  <TableHead className="text-right">劣后权益</TableHead>
                  <TableHead className="text-right">投顾权益</TableHead>
                  <TableHead>状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshots.map((snapshot) => (
                  <TableRow key={snapshot.id}>
                    <TableCell className="font-medium">
                      {formatDateTime(snapshot.snapshotDate)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(snapshot.totalAssets)}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${snapshot.isProfit ? 'text-green-600' : 'text-red-600'}`}>
                      {snapshot.isProfit ? '+' : ''}{formatCurrency(snapshot.distributableProfit)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(snapshot.priorityAssets)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(snapshot.juniorAssets)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(snapshot.traderAssets)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={snapshot.isProfit ? 'default' : 'secondary'}>
                        {snapshot.isProfit ? '盈利' : '亏损'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              暂无快照记录
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
