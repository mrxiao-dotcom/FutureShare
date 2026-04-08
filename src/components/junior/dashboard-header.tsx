'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

interface DashboardHeaderProps {
  userName: string;
}

export function DashboardHeader({ userName }: DashboardHeaderProps) {
  const router = useRouter();

  const handleLogout = () => {
    // 清除本地存储的用户信息
    if (typeof window !== 'undefined') {
      localStorage.removeItem('currentUserId');
      localStorage.removeItem('currentUserName');
      localStorage.removeItem('currentUserType');
    }
    // 跳转到登录页或首页
    router.push('/');
    router.refresh();
  };

  return (
    <div className="mb-8 flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="text-primary">Future</span>
          <span className="text-blue-600">Shares</span>
          {' '}劣后投资者权益看板
        </h1>
        <p className="text-muted-foreground mt-1">
          欢迎，{userName}
        </p>
      </div>
      <Button variant="outline" onClick={handleLogout}>
        <LogOut className="mr-2 h-4 w-4" />
        退出登录
      </Button>
    </div>
  );
}
