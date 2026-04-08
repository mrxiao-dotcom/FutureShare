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
  
  console.log('=== 修正前 ===');
  console.log(`总资产: ${fund.totalAssets}`);
  console.log(`总出资: ${totalContributions}`);
  console.log(`可分配利润: ${fund.totalAssets - totalContributions}`);

  // 重置总资产为总出资（初始状态，无盈利）
  await prisma.fund.update({
    where: { id: fundId },
    data: {
      totalAssets: totalContributions,
      baseCapital: totalContributions,
    },
  });

  const updatedFund = await prisma.fund.findUnique({
    where: { id: fundId },
  });

  console.log('\n=== 修正后 ===');
  console.log(`总资产: ${updatedFund.totalAssets}`);
  console.log(`总出资: ${totalContributions}`);
  console.log(`可分配利润: ${updatedFund.totalAssets - totalContributions}`);

  console.log('\n初始状态已修正：');
  console.log('- 总资产 = 总出资（优先 + 劣后）');
  console.log('- 可分配利润 = 0');
  console.log('- 这是正确的初始状态');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
  });
