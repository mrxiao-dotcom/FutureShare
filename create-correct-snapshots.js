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
  console.log(`劣后本金: ${fund.currentJuniorCapital}元`);
  console.log(`优先本金: ${fund.currentPriorityCapital}元`);
  console.log(`总出资: ${totalContributions}元`);
  console.log(`当前权益: ${fund.totalAssets}元`);

  // 删除所有旧快照
  await prisma.dailySnapshot.deleteMany({
    where: { fundId },
  });
  console.log('\n已删除所有旧快照');

  // 创建正确的示例快照
  const now = new Date();
  // 权益从初始状态逐渐变化
  const snapshots = [
    { daysAgo: 10, assets: totalContributions, label: '初始状态' },
    { daysAgo: 7, assets: totalContributions * 1.02, label: '小幅盈利2%' },
    { daysAgo: 5, assets: totalContributions * 1.05, label: '盈利5%' },
    { daysAgo: 3, assets: totalContributions * 1.08, label: '盈利8%' },
    { daysAgo: 1, assets: totalContributions * 1.10, label: '盈利10%' },
  ];

  console.log('\n创建权益快照：');
  for (const s of snapshots) {
    const snapshotDate = new Date(now);
    snapshotDate.setDate(snapshotDate.getDate() - s.daysAgo);
    snapshotDate.setHours(15, 0, 0, 0);

    const assets = Math.round(s.assets);
    const profit = assets - totalContributions;
    const isProfit = profit >= 0;

    let juniorAssets = fund.currentJuniorCapital;
    let priorityAssets = fund.currentPriorityCapital;
    let traderAssets = 0;

    if (isProfit) {
      juniorAssets = fund.currentJuniorCapital + profit * fund.juniorShareRatio;
      priorityAssets = fund.currentPriorityCapital + profit * fund.priorityShareRatio;
      traderAssets = profit * fund.traderShareRatio;
    } else {
      juniorAssets = fund.currentJuniorCapital + profit;
    }

    await prisma.dailySnapshot.create({
      data: {
        fundId,
        snapshotDate,
        totalAssets: assets,
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

    console.log(`${s.label} (${s.daysAgo}天前): 权益 ${(assets/10000).toFixed(0)}万, 利润 ${(profit/10000).toFixed(0)}万`);
  }

  console.log('\n配置完成！');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
  });
