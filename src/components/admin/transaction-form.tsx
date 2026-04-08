'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, TrendingUp, TrendingDown, DollarSign, Percent, AlertCircle } from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/utils';

/**
 * 资金变更录入表单组件
 * 客户端组件，处理用户交互和表单提交
 */

interface TransactionFormProps {
  /** 基金ID */
  fundId: string;
  /** 劣后用户列表 */
  juniorUsers: Array<{
    id: string;
    name: string;
    shareRatio: number;
    status: string;
  }>;
  /** 刷新回调 */
  onSuccess?: () => void;
}

/**
 * 交易类型选项
 */
const TRANSACTION_TYPES = [
  { value: 'DEPOSIT', label: '入金（追加投资）', color: 'text-green-600' },
  { value: 'WITHDRAWAL', label: '出金（提取资金）', color: 'text-red-600' },
] as const;

export function TransactionForm({ fundId, juniorUsers, onSuccess }: TransactionFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  // 表单状态
  const [userId, setUserId] = React.useState('');
  const [type, setType] = React.useState<'DEPOSIT' | 'WITHDRAWAL'>('DEPOSIT');
  const [amount, setAmount] = React.useState('');
  const [description, setDescription] = React.useState('');

  // 提交状态
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  /**
   * 表单提交处理
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 基础校验
    if (!userId) {
      toast({
        variant: 'destructive',
        title: '请选择用户',
        description: '必须选择一个劣后用户',
      });
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({
        variant: 'destructive',
        title: '金额无效',
        description: '金额必须大于0',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // 调用 Server Action
      const response = await fetch('/api/admin/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fundId,
          userId,
          type,
          amount: amountNum,
          description: description || undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // 成功通知
        toast({
          variant: 'success',
          title: '录入成功',
          description: `已成功录入${type === 'DEPOSIT' ? '入金' : '出金'}记录，金额：${formatCurrency(amountNum)}`,
        });

        // 重置表单
        setUserId('');
        setAmount('');
        setDescription('');

        // 刷新页面数据
        router.refresh();
        onSuccess?.();
      } else {
        // 失败通知
        toast({
          variant: 'destructive',
          title: '录入失败',
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          资金变更录入
        </CardTitle>
        <CardDescription>
          管理员录入用户的入金/出金操作，系统将立即更新基金状态
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 选择用户 */}
          <div className="space-y-2">
            <Label htmlFor="user">选择劣后用户</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger id="user">
                <SelectValue placeholder="请选择用户" />
              </SelectTrigger>
              <SelectContent className="z-50">
                {juniorUsers.length === 0 ? (
                  <SelectItem value="empty" disabled>
                    暂无可用用户
                  </SelectItem>
                ) : (
                  juniorUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({formatPercent(user.shareRatio)})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* 操作类型 */}
          <div className="space-y-2">
            <Label>操作类型</Label>
            <div className="flex gap-4">
              {TRANSACTION_TYPES.map((t) => (
                <Button
                  key={t.value}
                  type="button"
                  variant={type === t.value ? 'default' : 'outline'}
                  onClick={() => setType(t.value)}
                  className={`flex-1 ${t.color}`}
                >
                  {t.value === 'DEPOSIT' ? (
                    <TrendingUp className="mr-2 h-4 w-4" />
                  ) : (
                    <TrendingDown className="mr-2 h-4 w-4" />
                  )}
                  {t.label}
                </Button>
              ))}
            </div>
          </div>

          {/* 金额 */}
          <div className="space-y-2">
            <Label htmlFor="amount">金额（元）</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="请输入金额"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          {/* 备注 */}
          <div className="space-y-2">
            <Label htmlFor="description">备注（可选）</Label>
            <Input
              id="description"
              placeholder="请输入备注说明"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* 提交按钮 */}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                提交中...
              </>
            ) : (
              <>
                <DollarSign className="mr-2 h-4 w-4" />
                确认录入
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
