/**
 * 基金参数配置页面
 *
 * 入口: /admin/config?fundId=xxx
 */

import { PrismaClient } from '@prisma/client';
import { ConfigDashboard } from '@/components/admin/config-dashboard';

const prisma = new PrismaClient();

interface PageProps {
  searchParams: { fundId?: string };
}

async function getFundConfig(fundId: string) {
  const fund = await prisma.fund.findUnique({
    where: { id: fundId },
    select: {
      id: true,
      name: true,
      priorityCapitalRate: true,
      juniorCapitalRate: true,
      traderShareRatio: true,
      priorityShareRatio: true,
      juniorShareRatio: true,
    },
  });

  return fund;
}

async function getAllFunds() {
  return prisma.fund.findMany({
    select: {
      id: true,
      name: true,
      priorityCapitalRate: true,
      juniorCapitalRate: true,
      traderShareRatio: true,
      priorityShareRatio: true,
      juniorShareRatio: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export default async function ConfigPage({ searchParams }: PageProps) {
  const selectedFundId = searchParams.fundId;
  const funds = await getAllFunds();

  if (funds.length === 0) {
    return <ConfigDashboard funds={[]} fund={null} />;
  }

  const activeFundId = selectedFundId || funds[0].id;
  const fund = await getFundConfig(activeFundId);

  return (
    <ConfigDashboard
      funds={funds}
      fund={fund}
    />
  );
}