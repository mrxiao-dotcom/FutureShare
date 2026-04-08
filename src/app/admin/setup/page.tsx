'use client';

/**
 * 数据库初始化脚本
 *
 * 功能：创建示例基金和管理员账号
 * 访问：/admin/setup
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function SetupPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [adminCredentials, setAdminCredentials] = useState<{ username: string; password: string } | null>(null);

  useEffect(() => {
    initDatabase();
  }, []);

  const initDatabase = async () => {
    setStatus('loading');
    setMessage('正在初始化数据库...');

    try {
      // 调用初始化 API
      const response = await fetch('/api/admin/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true }),
      });

      const result = await response.json();

      if (result.success) {
        setStatus('success');
        setMessage(result.message);

        if (result.data?.username && result.data?.password) {
          setAdminCredentials({
            username: result.data.username,
            password: result.data.password,
          });
        }

        // 3秒后跳转到登录页
        setTimeout(() => {
          router.push('/admin/login');
        }, 3000);
      } else {
        setStatus('error');
        setMessage(result.error || '初始化失败');
      }
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : '网络错误');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">数据库初始化</CardTitle>
          <CardDescription className="text-center">
            正在创建管理员账号和示例数据...
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {(status === 'idle' || status === 'loading') && (
            <div className="flex flex-col items-center py-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-2 text-muted-foreground">{message || '正在初始化数据库...'}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center py-4">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <p className="mt-2 text-center text-green-600">{message}</p>

              {adminCredentials && (
                <div className="mt-4 p-4 bg-muted rounded-lg w-full">
                  <p className="text-sm font-medium mb-2">管理员账号信息：</p>
                  <p className="text-sm">用户名：<strong>{adminCredentials.username}</strong></p>
                  <p className="text-sm">密码：<strong>{adminCredentials.password}</strong></p>
                  <p className="text-xs text-muted-foreground mt-2">请妥善保管账号密码！</p>
                </div>
              )}

              <p className="mt-4 text-sm text-muted-foreground">
                即将跳转到登录页...
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center py-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="mt-2 text-center text-destructive">{message}</p>
              <Button
                className="mt-4"
                onClick={initDatabase}
                variant="outline"
              >
                重试
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
