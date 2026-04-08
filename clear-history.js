const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const fundId = 'cmnmq937q0000jdw1dauu8ojh';

  console.log('=== 清理历史记录 ===');

  // 删除所有快照
  await prisma.dailySnapshot.deleteMany({
    where: { fundId },
  });
  console.log('已删除所有权益快照');

  // 删除所有结算记录
  await prisma.settlement.deleteMany({
    where: { fundId },
  });
  console.log('已删除所有结算记录');

  // 删除所有出入金记录
  await prisma.transaction.deleteMany({
    where: { fundId },
  });
  console.log('已删除所有出入金记录');

  // 重置基金权益为初始状态
  const totalCapital = 9000000; // 900万
  await prisma.fund.update({
    where: { id: fundId },
    data: {
      totalAssets: totalCapital,
    },
  });
  console.log('已重置基金权益为初始状态');

  // 创建一条初始快照（今天，权益=总出资）
  const today = new Date();
  today.setHours(15, 0, 0, 0);

  await prisma.dailySnapshot.create({
    data: {
      fundId,
      snapshotDate: today,
      totalAssets: totalCapital,
      priorityAssets: 8100000,
      juniorAssets: 900000,
      traderAssets: 0,
      priorityShare: 0,
      juniorShare: 0,
      traderShare: 0,
      dailyProfit: 0,
      cumulativeProfit: 0,
    },
  });
  console.log('已创建今日初始快照');

  // 验证
  const fund = await prisma.fund.findUnique({
    where: { id: fundId },
  });

  console.log('\n=== 当前状态 ===');
  console.log(`基金: ${fund.name}`);
  console.log(`总出资: ${fund.currentJuniorCapital + fund.currentPriorityCapital}元`);
  console.log(`当前权益: ${fund.totalAssets}元`);
  console.log(`利润: ${fund.totalAssets - (fund.currentJuniorCapital + fund.currentPriorityCapital)}元`);

  const snapshots = await prisma.dailySnapshot.findMany({
    where: { fundId },
    orderBy: { snapshotDate: 'desc' },
  });
  console.log(`快照数量: ${snapshots.length}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
  });
