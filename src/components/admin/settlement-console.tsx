'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Loader2, TrendingUp, TrendingDown, DollarSign, Percent, AlertTriangle, CheckCircle2, Calculator } from 'lucide-react';
import { formatCurrency, formatPercent, formatDateTime } from '@/lib/utils';

/**
 * 结算控制台组件
 * 客户端组件，处理结算表单和状态展示
 */

interface SettlementConsoleProps {
  /** 基金ID */
  fundId: string;
  /** 当前基金数据 */
  fundData: {
    name: string;
    totalAssets: number;
    baseCapital: number;
    currentPriorityCapital: number;
    currentJuniorCapital: number;
    traderShareRatio: number;
    priorityShareRatio: number;
    juniorShareRatio: number;
  };
  /** 上次结算信息 */
  lastSettlement?: {
    cycleNumber: number;
    endDate: Date;
    profit: number;
    status: string;
  };
  /** 刷新回调 */
  onSuccess?: () => void;
}

export function SettlementConsole({ fundId, fundData, lastSettlement, onSuccess }: SettlementConsoleProps) {
  const router = useRouter();
  const { toast } = useToast();

  // 表单状态
  const [currentAssets, setCurrentAssets] = React.useState(fundData.totalAssets.toString());
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [previewResult, setPreviewResult] = React.useState<{
    profit: number;
    traderFee: number;
    priorityAssets: number;
    juniorAssets: number;
  } | null>(null);

  /**
   * 实时预览结算结果
   */
  React.useEffect(() => {
    const assets = parseFloat(currentAssets);
    if (isNaN(assets) || assets < 0) {
      setPreviewResult(null);
      return;
    }

    const baseCapital = fundData.baseCapital || (fundData.currentPriorityCapital + fundData.currentJuniorCapital);
    const profit = assets - baseCapital;
    const isProfit = profit > 0;

    if (isProfit) {
      setPreviewResult({
        profit,
        traderFee: profit * fundData.traderShareRatio,
        priorityAssets: fundData.currentPriorityCapital + profit * fundData.priorityShareRatio,
        juniorAssets: fundData.currentJuniorCapital + profit * fundData.juniorShareRatio,
      });
    } else {
      setPreviewResult({
        profit,
        traderFee: 0,
        priorityAssets: fundData.currentPriorityCapital, // 保本
        juniorAssets: fundData.currentJuniorCapital + profit, // 劣后承担亏损
      });
    }
  }, [currentAssets, fundData]);

  /**
   * 提交结算
   */
  const handleSettle = async () => {
    const assets = parseFloat(currentAssets);
    if (isNaN(assets) || assets < 0) {
      toast({
        variant: 'destructive',
        title: '输入无效',
        description: '请输入有效的总权益数值',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/admin/settlement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fundId, currentAssets: assets }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          variant: 'success',
          title: '结算成功',
          description: `第${result.data.cycleNumber}周期结算完成，利润：${formatCurrency(result.data.profit)}`,
        });
        setCurrentAssets('');
        router.refresh();
        onSuccess?.();
      } else {
        toast({
          variant: 'destructive',
          title: '结算失败',
          description: result.error || '未知错误',
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

  // 计算盈亏状态
  const isProfit = previewResult ? previewResult.profit > 0 : null;

  return (
    <div className="space-y-6">
      {/* 顶部状态卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* 高水位线 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">高水位线</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(fundData.baseCapital)}</div>
            <p className="text-xs text-muted-foreground">当前基准本金</p>
          </CardContent>
        </Card>

        {/* 当前总资产 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">当前总资产</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(fundData.totalAssets)}</div>
            <p className="text-xs text-muted-foreground">动态权益</p>
          </CardContent>
        </Card>

        {/* 优先本金 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">优先本金</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(fundData.currentPriorityCapital)}</div>
            <p className="text-xs text-muted-foreground">{formatPercent(fundData.priorityShareRatio)} 份额</p>
          </CardContent>
        </Card>

        {/* 劣后本金 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">劣后本金</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(fundData.currentJuniorCapital)}</div>
            <p className="text-xs text-muted-foreground">{formatPercent(fundData.juniorShareRatio)} 份额</p>
          </CardContent>
        </Card>
      </div>

      {/* 结算表单 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            结算控制台
          </CardTitle>
          <CardDescription>
            {lastSettlement ? (
              <span>上次结算：第{lastSettlement.cycleNumber}周期（{formatDateTime(lastSettlement.endDate)}），利润 {formatCurrency(lastSettlement.profit)}</span>
            ) : (
              <span>暂无结算记录，这是第一个结算周期</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 结算表单 */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentAssets">当前实际总权益（元）</Label>
              <Input
                id="currentAssets"
                type="number"
                step="0.01"
                min="0"
                placeholder="请输入当前总权益"
                value={currentAssets}
                onChange={(e) => setCurrentAssets(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                请根据实际账户权益填写，系统将据此计算盈亏并执行分配
              </p>
            </div>

            {/* 预览结果 */}
            {previewResult && (
              <div className={`rounded-lg border p-4 ${isProfit ? 'border-green-200 bg-green-50 dark:bg-green-950' : 'border-red-200 bg-red-50 dark:bg-red-950'}`}>
                <div className="flex items-center gap-2 mb-3">
                  {isProfit ? (
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  )}
                  <span className={`font-semibold ${isProfit ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                    {isProfit ? '盈利预览' : '亏损预览'}
                  </span>
                </div>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span>盈亏金额：</span>
                    <span className={`font-medium ${isProfit ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                      {formatCurrency(previewResult.profit)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>操盘手分配：</span>
                    <span>{formatCurrency(previewResult.traderFee)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>优先方总权益：</span>
                    <span>{formatCurrency(previewResult.priorityAssets)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>劣后池总权益：</span>
                    <span className={!isProfit ? 'text-red-700 dark:text-red-300' : ''}>
                      {formatCurrency(previewResult.juniorAssets)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 结算确认按钮 */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  className="w-full"
                  size="lg"
                  disabled={!currentAssets || isSubmitting}
                >
                  <Calculator className="mr-2 h-5 w-5" />
                  确认结算分红
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>确认执行结算？</AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-2">
                      <p>此操作将：</p>
                      <ol className="list-decimal list-inside space-y-1 text-sm">
                        <li>基于输入的总权益计算盈亏</li>
                        <li>按照分配比例计算各方应得金额</li>
                        <li>更新基金的高水位线（基准本金）</li>
                        <li>创建结算记录和分红流水</li>
                      </ol>
                      <p className="font-medium text-foreground mt-2">此操作不可撤销，请确认数据无误。</p>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSettle} disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        结算中...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        确认结算
                      </>
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* 分配比例说明 */}
          <div className="rounded-lg bg-muted p-4">
            <h4 className="font-medium mb-2">当前分配比例</h4>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span>操盘手分成：</span>
                <span className="font-medium">{formatPercent(fundData.traderShareRatio)}</span>
              </div>
              <div className="flex justify-between">
                <span>优先方分成：</span>
                <span className="font-medium">{formatPercent(fundData.priorityShareRatio)}</span>
              </div>
              <div className="flex justify-between">
                <span>劣后方分成：</span>
                <span className="font-medium">{formatPercent(fundData.juniorShareRatio)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
