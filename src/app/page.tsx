import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="text-center space-y-6 max-w-2xl">
        {/* Logo 和标题 */}
        <div className="space-y-2">
          <h1 className="text-5xl font-bold tracking-tight">
            <span className="text-primary">Future</span>
            <span className="text-blue-600">Shares</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            结构化基金管理系统
          </p>
        </div>

        {/* 核心特性介绍 */}
        <div className="grid grid-cols-3 gap-6 pt-8">
          <div className="p-6 rounded-lg bg-white dark:bg-slate-800 shadow-sm border">
            <div className="text-2xl mb-2">📊</div>
            <h3 className="font-semibold mb-1">优先/劣后分配</h3>
            <p className="text-sm text-muted-foreground">
              盈利按 40%/40% 分配，亏损由劣后承担
            </p>
          </div>
          <div className="p-6 rounded-lg bg-white dark:bg-slate-800 shadow-sm border">
            <div className="text-2xl mb-2">📈</div>
            <h3 className="font-semibold mb-1">高水位线机制</h3>
            <p className="text-sm text-muted-foreground">
              只有创新高才分红，保护投资者利益
            </p>
          </div>
          <div className="p-6 rounded-lg bg-white dark:bg-slate-800 shadow-sm border">
            <div className="text-2xl mb-2">🔄</div>
            <h3 className="font-semibold mb-1">周期性结算</h3>
            <p className="text-sm text-muted-foreground">
              自动计算各方权益，透明公正
            </p>
          </div>
        </div>

        {/* 操作入口 */}
        <div className="flex gap-4 justify-center pt-8">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-blue-600 text-white hover:bg-blue-700 h-12 px-8 text-lg"
          >
            登录 / 注册
          </Link>
          <Link
            href="/admin"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-12 px-8 text-lg"
          >
            管理后台
          </Link>
        </div>

        {/* 底部信息 */}
        <p className="text-xs text-muted-foreground pt-12">
          基于 Next.js + Prisma + Tailwind CSS 构建
        </p>
      </div>
    </main>
  );
}
