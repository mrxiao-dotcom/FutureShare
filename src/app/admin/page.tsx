/**
 * 管理员后台页面
 *
 * 架构说明：
 * - 这是 Server Component，负责从数据库获取初始数据
 * - 交互逻辑由 AdminDashboard 客户端组件处理
 */

import { PrismaClient } from '@prisma/client';
import { AdminDashboard } from '@/components/admin/admin-dashboard';

const prisma = new PrismaClient();

interface PageProps {
  searchParams: { fundId?: string };
}

async function getFundWithData(fundId: string) {
  const fund = await prisma.fund.findUnique({
    where: { id: fundId },
    include: {
      settlements: {
        orderBy: { cycleNumber: 'desc' },
        take: 1,
      },
    },
  });

  return fund;
}

async function getJuniorUsers(fundId: string) {
  const users = await prisma.user.findMany({
    where: {
      userType: 'JUNIOR',
      participations: {
        some: { fundId },
      },
    },
    include: {
      participations: {
        where: { fundId },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    shareRatio: user.participations[0]?.shareRatio || user.shareRatio,
    status: user.status,
    totalProfit: user.totalProfit,
    totalLoss: user.totalLoss,
    currentCapital: user.participations[0]?.capitalAmount || 0,
    createdAt: user.createdAt,
  }));
}

async function getAllFunds() {
  return prisma.fund.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export default async function AdminPage({ searchParams }: PageProps) {
  const selectedFundId = searchParams.fundId;
  const funds = await getAllFunds();
  
  if (funds.length === 0) {
    return <AdminDashboard funds={[]} fund={null} juniorUsers={[]} />;
  }

  const activeFundId = selectedFundId || funds[0].id;
  const fund = await getFundWithData(activeFundId);
  const juniorUsers = await getJuniorUsers(activeFundId);

  return (
    <AdminDashboard 
      funds={funds} 
      fund={fund ? {
        id: fund.id,
        name: fund.name,
        totalAssets: fund.totalAssets,
        baseCapital: fund.baseCapital,
        currentPriorityCapital: fund.currentPriorityCapital,
        currentJuniorCapital: fund.currentJuniorCapital,
        traderShareRatio: fund.traderShareRatio,
        priorityShareRatio: fund.priorityShareRatio,
        juniorShareRatio: fund.juniorShareRatio,
        settlements: fund.settlements.map(s => ({
          cycleNumber: s.cycleNumber,
          endDate: s.endDate,
          profit: s.profit,
          status: s.status,
        })),
      } : null} 
      juniorUsers={juniorUsers} 
    />
  );
}