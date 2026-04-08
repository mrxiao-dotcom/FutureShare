'use client';

/**
 * 用户录入表单组件
 *
 * 业务规则：
 * - 份额 = 投资金额（1元=1份）
 * - 比例 = 个人出资 / 同类总出资（自动计算）
 * - 可分配利润 = 总权益 - 总出资
 * - 利润分配：投顾/劣后/优先 按设定比例分配
 * - 劣后内部按各自出资比例分配
 */

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus, Percent, Info } from 'lucide-react';
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
  existingPriorityUsers,
}: UserFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  // 表单状态
  const [name, setName] = useState('');          // 显示名称
  const [username, setUsername] = useState('');   // 登录用户名
  const [password, setPassword] = useState('');   // 登录密码
  const [userType, setUserType] = useState<'JUNIOR' | 'PRIORITY'>('JUNIOR');
  const [capitalAmount, setCapitalAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 根据用户类型获取对应的现有用户和总额
  const currentUsers = userType === 'JUNIOR' ? existingJuniorUsers : existingPriorityUsers;
  const totalCapital = userType === 'JUNIOR' ? totalJuniorCapital : totalPriorityCapital;

  // 计算当前用户输入后的比例（自动计算）
  const calculatedRatio = useMemo(() => {
    const amount = parseFloat(capitalAmount) || 0;
    if (amount <= 0 || totalCapital <= 0) return 0;
    return amount / totalCapital;
  }, [capitalAmount, totalCapital]);

  // 计算加入后的总出资和各方比例
  const afterJoin = useMemo(() => {
    const amount = parseFloat(capitalAmount) || 0;
    const newTotal = totalCapital + amount;
    const newUserRatio = newTotal > 0 ? amount / newTotal : 0;
    return {
      newTotal,
      newUserRatio,
      otherTotalRatio: newTotal > 0 ? totalCapital / newTotal : 0,
    };
  }, [capitalAmount, totalCapital]);

  /**
   * 表单提交处理
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 基础校验
    if (!name.trim()) {
      toast({
        variant: 'destructive',
        title: '姓名不能为空',
        description: '请输入投资者姓名',
      });
      return;
    }

    if (!username.trim()) {
      toast({
        variant: 'destructive',
        title: '用户名不能为空',
        description: '请输入登录用户名',
      });
      return;
    }

    if (!password.trim()) {
      toast({
        variant: 'destructive',
        title: '密码不能为空',
        description: '请设置登录密码',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        variant: 'destructive',
        title: '密码太短',
        description: '密码至少需要6个字符',
      });
      return;
    }

    const capitalNum = parseFloat(capitalAmount);
    if (isNaN(capitalNum) || capitalNum <= 0) {
      toast({
        variant: 'destructive',
        title: '金额无效',
        description: '投资金额必须大于0',
      });
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
          password: password,
          userType,
          capitalAmount: capitalNum,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: '添加成功',
          description: `已成功添加${userType === 'JUNIOR' ? '劣后' : '优先'}投资者：${name}`,
        });

        // 重置表单
        setName('');
        setUsername('');
        setPassword('');
        setCapitalAmount('');

        // 刷新页面数据
        router.refresh();
      } else {
        toast({
          variant: 'destructive',
          title: '添加失败',
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
          <UserPlus className="h-5 w-5" />
          添加投资者
        </CardTitle>
        <CardDescription>
          录入新投资者信息，份额比例将自动计算
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 用户类型 */}
          <div className="space-y-2">
            <Label>投资者类型</Label>
            <div className="flex gap-4">
              <Button
                type="button"
                variant={userType === 'JUNIOR' ? 'default' : 'outline'}
                onClick={() => setUserType('JUNIOR')}
                className="flex-1"
              >
                劣后投资者（{formatCurrency(totalJuniorCapital)}）
              </Button>
              <Button
                type="button"
                variant={userType === 'PRIORITY' ? 'default' : 'outline'}
                onClick={() => setUserType('PRIORITY')}
                className="flex-1"
              >
                优先投资者（{formatCurrency(totalPriorityCapital)}）
              </Button>
            </div>
          </div>

          {/* 显示名称 */}
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

          {/* 登录用户名 */}
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

          {/* 登录密码 */}
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

          {/* 投资金额（份额） */}
          <div className="space-y-2">
            <Label htmlFor="capitalAmount">
              出资金额（份额） *
              <span className="text-muted-foreground font-normal ml-1">
                1元=1份
              </span>
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
                比例预览（自动计算）
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>当前{userType === 'JUNIOR' ? '劣后' : '优先'}方总出资：</span>
                  <span className="font-medium">{formatCurrency(totalCapital)}</span>
                </div>
                <div className="flex justify-between">
                  <span>新增出资金额：</span>
                  <span className="font-medium text-primary">{formatCurrency(parseFloat(capitalAmount))}</span>
                </div>
                <div className="flex justify-between">
                  <span>新增后总出资：</span>
                  <span className="font-medium">{formatCurrency(afterJoin.newTotal)}</span>
                </div>
                <div className="border-t pt-2 mt-2 flex justify-between">
                  <span>新用户占比：</span>
                  <span className="font-bold text-primary">
                    {formatPercent(afterJoin.newUserRatio)} / {formatPercent(afterJoin.otherTotalRatio)}（剩余）
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 提示信息 */}
          {currentUsers.length > 0 && (
            <div className="p-3 bg-muted rounded-lg text-sm">
              <div className="flex justify-between mb-1">
                <span>现有{userType === 'JUNIOR' ? '劣后' : '优先'}用户：</span>
                <span className="font-medium">{currentUsers.length} 人</span>
              </div>
              <div className="text-muted-foreground text-xs">
                {currentUsers.map(u => `${u.name}: ${formatCurrency(u.capitalAmount)}`).join(' | ')}
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
      </CardContent>
    </Card>
  );
}
