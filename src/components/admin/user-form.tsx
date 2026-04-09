'use client';

/**
 * 投资者录入表单组件
 *
 * 业务规则：
 * - 只录入劣后投资者
 * - 优先资金按1:9比例自动配齐
 */

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus, Info, TrendingUp } from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/utils';

interface ExistingUser {
  id: string;
  name: string;
  capitalAmount: number;
}

interface UserFormProps {
  fundId: string;
  totalJuniorCapital: number;
  totalPriorityCapital: number;
  existingJuniorUsers: ExistingUser[];
  existingPriorityUsers: ExistingUser[];
}

export function UserForm({
  fundId,
  totalJuniorCapital,
  totalPriorityCapital,
  existingJuniorUsers,
}: UserFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  // 表单状态
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [capitalAmount, setCapitalAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSupplingPriority, setIsSupplingPriority] = useState(false);

  // 计算优先资金差额
  const targetPriorityCapital = totalJuniorCapital * 9;
  const priorityGap = targetPriorityCapital - totalPriorityCapital;
  const needsSuppling = priorityGap > 0 && totalJuniorCapital > 0;

  // 计算当前用户输入后的比例（自动计算）
  const afterJoin = useMemo(() => {
    const amount = parseFloat(capitalAmount) || 0;
    const newJuniorTotal = totalJuniorCapital + amount;
    const newPriorityTarget = newJuniorTotal * 9;
    return {
      newJuniorTotal,
      newPriorityTarget,
      priorityGap: newPriorityTarget - totalPriorityCapital,
    };
  }, [capitalAmount, totalJuniorCapital, totalPriorityCapital]);

  /**
   * 提交劣后投资者
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({ variant: 'destructive', title: '姓名不能为空' });
      return;
    }

    if (!username.trim()) {
      toast({ variant: 'destructive', title: '用户名不能为空' });
      return;
    }

    if (!password.trim() || password.length < 6) {
      toast({ variant: 'destructive', title: '密码至少需要6个字符' });
      return;
    }

    const capitalNum = parseFloat(capitalAmount);
    if (isNaN(capitalNum) || capitalNum <= 0) {
      toast({ variant: 'destructive', title: '金额无效' });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/admin/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fundId,
          name: name.trim(),
          username: username.trim(),
          password,
          userType: 'JUNIOR',
          capitalAmount: capitalNum,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({ title: '添加成功', description: `已添加劣后投资者：${name}` });
        setName('');
        setUsername('');
        setPassword('');
        setCapitalAmount('');
        router.refresh();
      } else {
        toast({ variant: 'destructive', title: '添加失败', description: result.error });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: '操作失败', description: '网络请求失败' });
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * 补齐优先资金
   */
  const handleSupplyPriority = async () => {
    setIsSupplingPriority(true);

    try {
      const response = await fetch('/api/admin/fund/supply-priority', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fundId }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: '补齐成功',
          description: `已补齐优先资金：${formatCurrency(result.data.suppliedAmount)}`,
        });
        router.refresh();
      } else {
        toast({ variant: 'destructive', title: '补齐失败', description: result.error });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: '操作失败', description: '网络请求失败' });
    } finally {
      setIsSupplingPriority(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          添加劣后投资者
        </CardTitle>
        <CardDescription>
          劣后出资后，系统自动按1:9配齐优先资金
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 姓名 */}
          <div className="space-y-2">
            <Label htmlFor="name">姓名 *</Label>
            <Input
              id="name"
              placeholder="请输入投资者姓名"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* 用户名 */}
          <div className="space-y-2">
            <Label htmlFor="username">登录用户名 *</Label>
            <Input
              id="username"
              placeholder="用于登录系统"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          {/* 密码 */}
          <div className="space-y-2">
            <Label htmlFor="password">登录密码 *</Label>
            <Input
              id="password"
              type="password"
              placeholder="设置登录密码（至少6位）"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {/* 出资金额 */}
          <div className="space-y-2">
            <Label htmlFor="capitalAmount">
              出资金额 *
              <span className="text-muted-foreground font-normal ml-1">1元=1份</span>
            </Label>
            <Input
              id="capitalAmount"
              type="number"
              step="0.01"
              min="0"
              placeholder="请输入出资金额"
              value={capitalAmount}
              onChange={(e) => setCapitalAmount(e.target.value)}
              required
            />
          </div>

          {/* 比例预览 */}
          {capitalAmount && parseFloat(capitalAmount) > 0 && (
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Info className="h-4 w-4" />
                比例预览
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>当前劣后总出资：</span>
                  <span className="font-medium">{formatCurrency(totalJuniorCapital)}</span>
                </div>
                <div className="flex justify-between">
                  <span>新增出资金额：</span>
                  <span className="font-medium text-primary">{formatCurrency(parseFloat(capitalAmount))}</span>
                </div>
                <div className="flex justify-between">
                  <span>新增后劣后总额：</span>
                  <span className="font-medium">{formatCurrency(afterJoin.newJuniorTotal)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 mt-2">
                  <span>需配齐优先资金：</span>
                  <span className="font-medium text-blue-600">{formatCurrency(afterJoin.newPriorityTarget)}</span>
                </div>
              </div>
            </div>
          )}

          {/* 现有用户提示 */}
          {existingJuniorUsers.length > 0 && (
            <div className="p-3 bg-muted rounded-lg text-sm">
              <div className="flex justify-between mb-1">
                <span>现有劣后用户：</span>
                <span className="font-medium">{existingJuniorUsers.length} 人</span>
              </div>
              <div className="text-muted-foreground text-xs">
                {existingJuniorUsers.map(u => `${u.name}: ${formatCurrency(u.capitalAmount)}`).join(' | ')}
              </div>
            </div>
          )}

          {/* 提交按钮 */}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                添加中...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                确认添加
              </>
            )}
          </Button>
        </form>

        {/* 补齐优先资金按钮 */}
        {needsSuppling && (
          <div className="pt-4 border-t">
            <Button
              variant="outline"
              className="w-full border-blue-200 bg-blue-50 hover:bg-blue-100"
              onClick={handleSupplyPriority}
              disabled={isSupplingPriority}
            >
              {isSupplingPriority ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <TrendingUp className="mr-2 h-4 w-4" />
              )}
              补齐优先 {formatCurrency(priorityGap)}
            </Button>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              劣后 × 9 - 优先实出 = 需补齐金额
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
