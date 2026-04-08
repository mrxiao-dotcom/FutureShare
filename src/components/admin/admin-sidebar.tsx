'use client';

/**
 * 侧边导航菜单组件
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Settings,
  FileText,
  TrendingUp,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  fundId?: string;
}

const NAV_ITEMS = [
  {
    title: '大盘状态',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    title: '投资者管理',
    href: '/admin/users',
    icon: Users,
  },
  {
    title: '参数配置',
    href: '/admin/config',
    icon: Settings,
  },
];

const BOTTOM_ITEMS = [
  {
    title: '权益快照',
    href: '/admin/snapshot',
    icon: TrendingUp,
  },
  {
    title: '劣后看板（预览）',
    href: '/dashboard',
    icon: Eye,
    external: true,
  },
];

export function AdminSidebar({ fundId }: SidebarProps) {
  const pathname = usePathname();

  const getHref = (href: string) => {
    if (fundId && href !== '/admin') {
      return `${href}?fundId=${fundId}`;
    }
    return href;
  };

  return (
    <aside className="w-64 border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex flex-col h-[calc(100vh-4rem)] sticky top-16">
      <nav className="p-4 space-y-1 flex-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={getHref(item.href)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>

      {/* 底部快捷操作 */}
      <div className="p-4 border-t space-y-1">
        {BOTTOM_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.external ? item.href : (fundId ? `${item.href}?fundId=${fundId}` : item.href)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              target={item.external ? '_blank' : undefined}
            >
              <Icon className="h-4 w-4" />
              {item.title}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}