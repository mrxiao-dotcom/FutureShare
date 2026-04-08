const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const fundId = 'cmnmq937q0000jdw1dauu8ojh';

  // 获取基金信息
  const fund = await prisma.fund.findUnique({
    where: { id: fundId },
  });

  if (!fund) {
    console.log('基金不存在');
    return;
  }

  console.log(`基金: ${fund.name}`);
  console.log(`当前权益: ${fund.totalAssets}`);
  console.log(`劣后本金: ${fund.currentJuniorCapital}`);
  console.log(`优先本金: ${fund.currentPriorityCapital}`);

  // 计算总出资
  const totalContributions = fund.currentPriorityCapital + fund.currentJuniorCapital;
  const currentProfit = fund.totalAssets - totalContributions;

  console.log(`总出资: ${totalContributions}`);
  console.log(`可分配利润: ${currentProfit}`);

  // 创建几个示例快照
  const now = new Date();
  const snapshots = [
    { daysAgo: 7, assets: 900000 },   // 1周前：刚好回本
    { daysAgo: 5, assets: 920000 },   // 5天前：小幅盈利
    { daysAgo: 3, assets: 950000 },   // 3天前：继续盈利
    { daysAgo: 2, assets: 980000 },   // 2天前：大幅盈利
    { daysAgo: 1, assets: 1050000 },  // 1天前
    { daysAgo: 0, assets: fund.totalAssets }, // 今天
  ];

  for (const s of snapshots) {
    const snapshotDate = new Date(now);
    snapshotDate.setDate(snapshotDate.getDate() - s.daysAgo);
    snapshotDate.setHours(15, 0, 0, 0);

    const profit = s.assets - totalContributions;
    const isProfit = profit >= 0;

    let priorityAssets = fund.currentPriorityCapital;
    let juniorAssets = fund.currentJuniorCapital;
    let traderAssets = 0;

    if (isProfit) {
      priorityAssets = fund.currentPriorityCapital + profit * fund.priorityShareRatio;
      juniorAssets = fund.currentJuniorCapital + profit * fund.juniorShareRatio;
      traderAssets = profit * fund.traderShareRatio;
    } else {
      juniorAssets = fund.currentJuniorCapital + profit;
    }

    // 检查是否已存在
    const existing = await prisma.dailySnapshot.findFirst({
      where: {
        fundId,
        snapshotDate: {
          gte: new Date(snapshotDate.setHours(0, 0, 0, 0)),
          lt: new Date(snapshotDate.setHours(23, 59, 59, 999)),
        },
      },
    });

    if (existing) {
      console.log(`快照已存在: ${s.daysAgo}天前`);
      continue;
    }

    const snapshot = await prisma.dailySnapshot.create({
      data: {
        fundId,
        snapshotDate,
        totalAssets: s.assets,
        priorityAssets,
        juniorAssets,
        traderAssets,
        priorityShare: isProfit ? profit * fund.priorityShareRatio : 0,
        juniorShare: isProfit ? profit * fund.juniorShareRatio : 0,
        traderShare: isProfit ? profit * fund.traderShareRatio : 0,
        dailyProfit: profit,
        cumulativeProfit: profit,
      },
    });

    console.log(`创建快照: ${s.daysAgo}天前, 权益: ${s.assets}, 利润: ${profit}`);
  }

  console.log('\n示例快照创建完成');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
  });
