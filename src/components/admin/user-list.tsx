'use client';

/**
 * 用户列表组件
 *
 * 显示概念：
 * - 份额（Capital）：投资金额，1元=1份
 * - 比例（Ratio）：个人出资 / 同类总出资
 */

import { useState } from 'react';
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
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Users, RefreshCw, Trash2 } from 'lucide-react';
import { formatCurrency, formatPercent, formatDateTime } from '@/lib/utils';

interface UserListItem {
  id: string;
  name: string;
  email: string | null;
  capitalAmount: number;
  shareRatio: number;  // 比例：个人出资 / 同类总出资
  status: string;
  createdAt: Date;
}

interface UserListProps {
  juniorUsers: UserListItem[];
  priorityUsers: UserListItem[];
  totalJuniorCapital: number;
  totalPriorityCapital: number;
  fundId: string;
}

/**
 * 状态徽章映射
 */
const STATUS_BADGES: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  ACTIVE: { label: '参与中', variant: 'default' },
  SUSPENDED: { label: '已停用', variant: 'secondary' },
  WITHDRAWN: { label: '已退出', variant: 'destructive' },
};

export function UserList({
  juniorUsers,
  priorityUsers,
  totalJuniorCapital,
  totalPriorityCapital,
  fundId
}: UserListProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'junior' | 'priority'>('junior');
  const [actionUserId, setActionUserId] = useState('');
  const [actionType, setActionType] = useState<'suspend' | 'activate' | 'withdraw' | 'delete'>('suspend');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargetUser, setDeleteTargetUser] = useState<{ id: string; name: string } | null>(null);

  const currentUsers = activeTab === 'junior' ? juniorUsers : priorityUsers;
  const totalCapital = activeTab === 'junior' ? totalJuniorCapital : totalPriorityCapital;

  /**
   * 计算用户在池中的比例
   */
  const calculateRatio = (userCapital: number) => {
    if (totalCapital <= 0) return 0;
    return userCapital / totalCapital;
  };

  /**
   * 执行用户操作
   */
  const handleAction = async () => {
    if (!actionUserId) {
      toast({
        variant: 'destructive',
        title: '请选择用户',
      });
      return;
    }

    if (actionType === 'delete') {
      const user = currentUsers.find(u => u.id === actionUserId);
      if (user) {
        setDeleteTargetUser({ id: user.id, name: user.name });
        setShowDeleteConfirm(true);
      }
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch('/api/admin/user/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: actionUserId,
          action: actionType,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: '操作成功',
          description: result.message,
        });
        router.refresh();
      } else {
        toast({
          variant: 'destructive',
          title: '操作失败',
          description: result.error,
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '操作失败',
        description: error instanceof Error ? error.message : '网络错误',
      });
    } finally {
      setIsProcessing(false);
      setActionUserId('');
    }
  };

  /**
   * 确认删除用户
   */
  const handleConfirmDelete = async () => {
    if (!deleteTargetUser) return;

    setIsProcessing(true);
    setShowDeleteConfirm(false);

    try {
      const response = await fetch('/api/admin/user/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: deleteTargetUser.id,
          action: 'delete',
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: '删除成功',
          description: result.message,
        });
        router.refresh();
      } else {
        toast({
          variant: 'destructive',
          title: '删除失败',
          description: result.error,
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '删除失败',
        description: error instanceof Error ? error.message : '网络错误',
      });
    } finally {
      setIsProcessing(false);
      setDeleteTargetUser(null);
      setActionUserId('');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              投资者列表
            </CardTitle>
            <CardDescription>
              <span className="mr-3">
                劣后 {juniorUsers.length} 人（{formatCurrency(totalJuniorCapital)}）
              </span>
              <span>
                / 优先 {priorityUsers.length} 人（{formatCurrency(totalPriorityCapital)}）
              </span>
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.refresh()}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            刷新
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 标签切换 */}
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'junior' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('junior')}
          >
            劣后用户 ({juniorUsers.length})
          </Button>
          <Button
            variant={activeTab === 'priority' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('priority')}
          >
            优先用户 ({priorityUsers.length})
          </Button>
        </div>

        {/* 资金概览 */}
        <div className="grid grid-cols-4 gap-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm">
          <div className="text-center">
            <div className="text-muted-foreground">劣后出资</div>
            <div className="font-semibold text-orange-600">{formatCurrency(totalJuniorCapital)}</div>
          </div>
          <div className="text-center">
            <div className="text-muted-foreground">优先实出</div>
            <div className="font-semibold text-blue-600">{formatCurrency(totalPriorityCapital)}</div>
          </div>
          <div className="text-center">
            <div className="text-muted-foreground">优先应出</div>
            <div className="font-semibold text-green-600">{formatCurrency(totalJuniorCapital * 9)}</div>
          </div>
          <div className="text-center">
            <div className="text-muted-foreground">差额</div>
            <div className={`font-semibold ${totalPriorityCapital < totalJuniorCapital * 9 ? 'text-amber-600' : 'text-green-600'}`}>
              {formatCurrency(totalJuniorCapital * 9 - totalPriorityCapital)}
            </div>
          </div>
        </div>

        {currentUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Users className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              暂无{activeTab === 'junior' ? '劣后' : '优先'}投资者
            </p>
          </div>
        ) : (
          <>
            {/* 汇总信息 */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg text-sm">
              <div className="text-center">
                <div className="text-muted-foreground">总出资</div>
                <div className="text-lg font-bold">{formatCurrency(totalCapital)}</div>
              </div>
              <div className="text-center">
                <div className="text-muted-foreground">用户数</div>
                <div className="text-lg font-bold">{currentUsers.length}</div>
              </div>
              <div className="text-center">
                <div className="text-muted-foreground">占比</div>
                <div className="text-lg font-bold text-primary">
                  {activeTab === 'junior' ? '劣后池' : '优先池'}
                </div>
              </div>
            </div>

            {/* 用户表格 */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>姓名</TableHead>
                  <TableHead className="text-right">份额（出资）</TableHead>
                  <TableHead className="text-right">比例</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>加入时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentUsers.map((user) => {
                  const badge = STATUS_BADGES[user.status] || { label: user.status, variant: 'outline' as const };
                  const ratio = calculateRatio(user.capitalAmount);

                  return (
                    <TableRow key={user.id}>
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
                      <TableCell className="text-right">
                        <span className="font-medium">
                          {formatCurrency(user.capitalAmount)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-medium text-primary">
                          {formatPercent(ratio)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDateTime(user.createdAt)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* 用户操作区域 */}
            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-medium">用户操作</p>
              <div className="flex gap-2">
                <Select value={actionUserId} onValueChange={setActionUserId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="选择用户" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} - {formatCurrency(user.capitalAmount)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={actionType} onValueChange={(v: any) => setActionType(v)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="suspend">停用</SelectItem>
                    <SelectItem value="activate">启用</SelectItem>
                    <SelectItem value="withdraw">退出</SelectItem>
                    <SelectItem value="delete" className="text-destructive focus:text-destructive">
                      <span className="flex items-center gap-2">
                        <Trash2 className="h-4 w-4" />
                        删除
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  onClick={handleAction}
                  disabled={!actionUserId || isProcessing}
                  className={actionType === 'delete' ? 'text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground' : ''}
                >
                  执行
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>

      {/* 删除确认对话框 */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除用户</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除用户 <strong>{deleteTargetUser?.name}</strong> 吗？此操作不可恢复，
              将同时删除该用户的所有参与记录。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDeleteConfirm(false);
              setDeleteTargetUser(null);
            }}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isProcessing}
            >
              {isProcessing ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
