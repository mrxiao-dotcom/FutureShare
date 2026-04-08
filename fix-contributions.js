const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const fundId = 'cmnmq937q0000jdw1dauu8ojh';

  console.log('=== 当前状态 ===');
  
  // 查看劣后用户
  const juniorParticipants = await prisma.fundParticipant.findMany({
    where: {
      fundId,
      user: { userType: 'JUNIOR' },
      status: 'ACTIVE',
    },
    include: { user: true },
  });
  
  const currentJuniorTotal = juniorParticipants.reduce((sum, p) => sum + p.capitalAmount, 0);
  console.log('劣后用户：');
  juniorParticipants.forEach(p => {
    console.log(`  ${p.user.name}: ${p.capitalAmount}元`);
  });
  console.log(`劣后总额: ${currentJuniorTotal}元`);

  // 查看优先用户
  const priorityParticipants = await prisma.fundParticipant.findMany({
    where: {
      fundId,
      user: { userType: 'PRIORITY' },
      status: 'ACTIVE',
    },
    include: { user: true },
  });
  
  const currentPriorityTotal = priorityParticipants.reduce((sum, p) => sum + p.capitalAmount, 0);
  console.log('\n优先用户：');
  priorityParticipants.forEach(p => {
    console.log(`  ${p.user.name}: ${p.capitalAmount}元`);
  });
  console.log(`优先总额: ${currentPriorityTotal}元`);

  // 目标配置
  const targetJuniorCapital = 900000;  // 90万
  const targetPriorityCapital = 8100000; // 810万（9倍）
  const targetTotal = targetJuniorCapital + targetPriorityCapital; // 900万

  console.log('\n=== 目标配置 ===');
  console.log(`劣后出资: ${targetJuniorCapital}元`);
  console.log(`优先出资: ${targetPriorityCapital}元`);
  console.log(`总出资: ${targetTotal}元`);
  console.log(`比例: 劣后:优先 = 1:9`);

  // 删除现有用户，重新设置
  console.log('\n=== 重置配置 ===');
  
  // 删除所有参与记录
  await prisma.fundParticipant.deleteMany({
    where: { fundId },
  });
  console.log('已删除所有参与记录');

  // 更新劣后用户本金总额
  await prisma.fund.update({
    where: { id: fundId },
    data: {
      currentJuniorCapital: targetJuniorCapital,
      currentPriorityCapital: targetPriorityCapital,
      totalAssets: targetTotal,
      baseCapital: targetTotal,
    },
  });
  console.log('已更新基金配置');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
  });
