# FutureShares - 结构化基金权益管理系统

结构化基金管理系统，支持优先/劣后分配、高水位线分红机制。

## 功能特性

- **管理员后台**：用户管理、基金配置、资金变更、权益快照、结算管理
- **劣后投资者看板**：权益展示、分红记录、历史曲线
- **自动定时任务**：每日自动生成权益快照

## 技术栈

- Next.js 14 (App Router)
- Prisma + SQLite
- Tailwind CSS
- Recharts 图表
- Lucide Icons

## 快速开始

```bash
# 安装依赖
npm install

# 初始化数据库
npm run db:push

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000

## 管理员入口

- URL: http://localhost:3000/admin
- 默认密码: `admin123` (可在环境变量配置)

## 环境变量

复制 `.env.example` 为 `.env` 并配置:

```env
DATABASE_URL="file:./dev.db"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
ADMIN_PASSWORD="your-password"
SESSION_SECRET="random-secret-string"
CRON_SECRET="cron-auth-secret"
```

## 部署到 Vercel

1. 连接 GitHub 仓库
2. 设置环境变量
3. 部署

定时任务将在每天 15:00 (北京时间) 自动运行。

## 数据库

SQLite 开发环境，生产环境可迁移到 PostgreSQL。

```bash
# 重置数据库
npx prisma db push --force-reset

# 查看数据库
npx prisma studio
```