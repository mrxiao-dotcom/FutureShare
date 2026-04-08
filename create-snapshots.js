const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const fundId = 'cmnmq937q0000jdw1dauu8ojh';

  const fund = await prisma.fund.findUnique({
    where: { id: fundId },
  });

  if (!fund) {
    console.log('基金不存在');
    return;
  }

  const totalContributions = fund.currentPriorityCapital + fund.currentJuniorCapital;
  console.log(`基金: ${fund.name}`);
  console.log(`总出资: ${totalContributions}`);

  // 删除所有旧快照
  await prisma.dailySnapshot.deleteMany({
    where: { fundId },
  });
  console.log('已删除所有旧快照');

  // 创建正确的示例快照（从初始状态开始）
  const now = new Date();
  const snapshots = [
    { daysAgo: 7, assets: 1800000, label: '初始状态' },
    { daysAgo: 5, assets: 1850000, label: '小幅盈利' },
    { daysAgo: 3, assets: 1920000, label: '继续盈利' },
    { daysAgo: 2, assets: 1880000, label: '略有回撤' },
    { daysAgo: 1, assets: 1950000, label: '再次盈利' },
  ];

  for (const s of snapshots) {
    const snapshotDate = new Date(now);
    snapshotDate.setDate(snapshotDate.getDate() - s.daysAgo);
    snapshotDate.setHours(15, 0, 0, 0);

    const profit = s.assets - totalContributions;
    const isProfit = profit >= 0;

    let juniorAssets = fund.currentJuniorCapital;
    if (isProfit) {
      juniorAssets = fund.currentJuniorCapital + profit * fund.juniorShareRatio;
    } else {
      juniorAssets = fund.currentJuniorCapital + profit;
    }

    await prisma.dailySnapshot.create({
      data: {
        fundId,
        snapshotDate,
        totalAssets: s.assets,
        priorityAssets: isProfit 
          ? fund.currentPriorityCapital + profit * fund.priorityShareRatio 
          : fund.currentPriorityCapital,
        juniorAssets,
        traderAssets: isProfit ? profit * fund.traderShareRatio : 0,
        priorityShare: isProfit ? profit * fund.priorityShareRatio : 0,
        juniorShare: isProfit ? profit * fund.juniorShareRatio : 0,
        traderShare: isProfit ? profit * fund.traderShareRatio : 0,
        dailyProfit: profit,
        cumulativeProfit: profit,
      },
    });

    console.log(`${s.label} (${s.daysAgo}天前): 权益 ${s.assets}, 利润 ${profit >= 0 ? '+' : ''}${profit}`);
  }

  console.log('\n权益快照创建完成');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
  });
