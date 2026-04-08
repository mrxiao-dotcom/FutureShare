'use client';

/**
 * 管理员登录页面
 */

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, LogIn, Shield } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [showExpiredMessage, setShowExpiredMessage] = useState(false);

  // 表单状态
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // 检查 URL 参数
  useEffect(() => {
    if (searchParams.get('expired') === 'true') {
      setShowExpiredMessage(true);
      toast({
        variant: 'destructive',
        title: '登录已过期',
        description: '请重新登录',
      });
    }
  }, [searchParams, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      toast({
        variant: 'destructive',
        title: '请填写必填项',
        description: '用户名和密码不能为空',
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: '登录成功',
          description: `欢迎管理员 ${result.user.name}！`,
        });

        // 获取重定向路径
        const redirectTo = searchParams.get('redirect') || '/admin';

        // 跳转到管理后台
        router.push(redirectTo);
      } else {
        toast({
          variant: 'destructive',
          title: '登录失败',
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
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold">
              <span className="text-primary">Future</span>
              <span className="text-blue-600">Shares</span>
            </h1>
          </Link>
          <p className="text-muted-foreground mt-2">结构化基金管理系统</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              管理员登录
            </CardTitle>
            <CardDescription className="text-center">
              请输入管理员账号和密码
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">管理员账号 *</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="请输入管理员账号"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">密码 *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    登录中...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    登录
                  </>
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex justify-center">
            <div className="text-xs text-center text-muted-foreground">
              <Link href="/login" className="hover:text-foreground">
                返回用户登录
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
