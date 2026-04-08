/**
 * 投资者管理页面
 *
 * 入口: /admin/users
 */

import { PrismaClient } from '@prisma/client';
import { UsersDashboard } from '@/components/admin/users-dashboard';

const prisma = new PrismaClient();

interface PageProps {
  searchParams: { fundId?: string };
}

async function getFundWithUsers(fundId: string) {
  const fund = await prisma.fund.findUnique({
    where: { id: fundId },
    select: {
      id: true,
      name: true,
      currentJuniorCapital: true,
      currentPriorityCapital: true,
    },
  });

  if (!fund) return null;

  const juniorUsers = await prisma.user.findMany({
    where: {
      userType: 'JUNIOR',
      participations: {
        some: { fundId, status: 'ACTIVE' },
      },
    },
    include: {
      participations: {
        where: { fundId, status: 'ACTIVE' },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const priorityUsers = await prisma.user.findMany({
    where: {
      userType: 'PRIORITY',
      participations: {
        some: { fundId, status: 'ACTIVE' },
      },
    },
    include: {
      participations: {
        where: { fundId, status: 'ACTIVE' },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return {
    fund,
    juniorUsers: juniorUsers.map((u) => ({
      id: u.id,
      name: u.displayName || u.name,
      email: u.email,
      capitalAmount: u.participations[0]?.capitalAmount || 0,
      shareRatio: u.participations[0]?.shareRatio || 0,
      status: u.status,
      createdAt: u.createdAt,
    })),
    priorityUsers: priorityUsers.map((u) => ({
      id: u.id,
      name: u.displayName || u.name,
      email: u.email,
      capitalAmount: u.participations[0]?.capitalAmount || 0,
      shareRatio: u.participations[0]?.shareRatio || 0,
      status: u.status,
      createdAt: u.createdAt,
    })),
  };
}

async function getAllFunds() {
  return prisma.fund.findMany({
    select: {
      id: true,
      name: true,
      currentJuniorCapital: true,
      currentPriorityCapital: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export default async function UsersPage({ searchParams }: PageProps) {
  const selectedFundId = searchParams.fundId;
  const funds = await getAllFunds();

  if (funds.length === 0) {
    return <UsersDashboard funds={[]} fund={null} juniorUsers={[]} priorityUsers={[]} />;
  }

  const activeFundId = selectedFundId || funds[0].id;
  const data = await getFundWithUsers(activeFundId);

  return (
    <UsersDashboard
      funds={funds}
      fund={data?.fund || null}
      juniorUsers={data?.juniorUsers || []}
      priorityUsers={data?.priorityUsers || []}
    />
  );
}
