const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const fundId = 'cmnmq937q0000jdw1dauu8ojh';

  // 获取所有劣后参与者
  const juniorParticipants = await prisma.fundParticipant.findMany({
    where: {
      fundId,
      user: { userType: 'JUNIOR' },
      status: 'ACTIVE',
    },
    include: { user: true },
  });

  console.log('=== 修复前 ===');
  juniorParticipants.forEach(p => {
    console.log(`${p.user.name}: ${p.capitalAmount}元, 比例: ${(p.shareRatio * 100).toFixed(2)}%`);
  });

  // 计算总出资
  const totalCapital = juniorParticipants.reduce((sum, p) => sum + p.capitalAmount, 0);
  console.log(`\n总出资: ${totalCapital}元`);

  // 重新计算比例
  for (const p of juniorParticipants) {
    const newRatio = p.capitalAmount / totalCapital;
    
    // 更新 FundParticipant
    await prisma.fundParticipant.update({
      where: { id: p.id },
      data: { shareRatio: newRatio },
    });
    
    // 更新 User
    await prisma.user.update({
      where: { id: p.userId },
      data: { shareRatio: newRatio },
    });
    
    console.log(`更新 ${p.user.name}: 新比例 = ${(newRatio * 100).toFixed(2)}%`);
  }

  // 验证
  const updatedParticipants = await prisma.fundParticipant.findMany({
    where: {
      fundId,
      user: { userType: 'JUNIOR' },
      status: 'ACTIVE',
    },
  });

  const totalRatio = updatedParticipants.reduce((sum, p) => sum + p.shareRatio, 0);
  console.log(`\n验证 - 比例总和: ${(totalRatio * 100).toFixed(2)}%`);

  // 同样修复优先用户
  const priorityParticipants = await prisma.fundParticipant.findMany({
    where: {
      fundId,
      user: { userType: 'PRIORITY' },
      status: 'ACTIVE',
    },
    include: { user: true },
  });

  if (priorityParticipants.length > 0) {
    const priorityTotal = priorityParticipants.reduce((sum, p) => sum + p.capitalAmount, 0);
    
    for (const p of priorityParticipants) {
      const newRatio = p.capitalAmount / priorityTotal;
      
      await prisma.fundParticipant.update({
        where: { id: p.id },
        data: { shareRatio: newRatio },
      });
      
      await prisma.user.update({
        where: { id: p.userId },
        data: { shareRatio: newRatio },
      });
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
  });
