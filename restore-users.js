const { PrismaClient } = require('@prisma/client');
const { hash } = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const fundId = 'cmnmq937q0000jdw1dauu8ojh';

  // 要恢复的劣后用户
  const juniorUsers = [
    { username: 'xiaojian', displayName: '肖剑', capital: 400000 },
    { username: 'xiaohuajuan', displayName: '肖华娟', capital: 400000 },
    { username: 'liupingfei', displayName: '刘平飞', capital: 100000 },
  ];

  // 计算总出资
  const totalJuniorCapital = juniorUsers.reduce((sum, u) => sum + u.capital, 0);
  console.log(`劣后总出资: ${totalJuniorCapital}元`);
  console.log(`将按出资比例分配份额`);

  const now = new Date();

  console.log('\n=== 恢复劣后用户 ===');

  for (const user of juniorUsers) {
    // 检查用户是否已存在
    let existingUser = await prisma.user.findUnique({
      where: { name: user.username },
    });

    if (existingUser) {
      console.log(`用户 ${user.username} 已存在，跳过创建`);
    } else {
      // 创建用户
      existingUser = await prisma.user.create({
        data: {
          name: user.username,
          displayName: user.displayName,
          userType: 'JUNIOR',
          shareRatio: 0, // 稍后计算
          status: 'ACTIVE',
          totalProfit: 0,
          totalLoss: 0,
        },
      });
      console.log(`创建用户: ${user.displayName} (${user.username})`);
    }

    // 计算份额比例
    const shareRatio = user.capital / totalJuniorCapital;

    // 检查参与记录是否已存在
    const existingParticipation = await prisma.fundParticipant.findUnique({
      where: {
        fundId_userId: {
          fundId,
          userId: existingUser.id,
        },
      },
    });

    if (existingParticipation) {
      console.log(`  参与记录已存在，跳过`);
    } else {
      // 创建参与记录
      await prisma.fundParticipant.create({
        data: {
          userId: existingUser.id,
          fundId,
          capitalAmount: user.capital,
          shareRatio: shareRatio,
          cycleNumber: 1,
          status: 'ACTIVE',
        },
      });
      console.log(`  参与记录: 出资 ${user.capital}元, 比例 ${(shareRatio * 100).toFixed(2)}%`);
    }

    // 更新用户的份额比例
    await prisma.user.update({
      where: { id: existingUser.id },
      data: { shareRatio: shareRatio },
    });
  }

  // 添加一个优先用户示例（如果有的话）
  const priorityUsers = [
    { username: 'zhongxintrust', displayName: '中信信托', capital: 8100000 },
  ];

  console.log('\n=== 添加优先用户 ===');

  for (const user of priorityUsers) {
    let existingUser = await prisma.user.findUnique({
      where: { name: user.username },
    });

    if (!existingUser) {
      existingUser = await prisma.user.create({
        data: {
          name: user.username,
          displayName: user.displayName,
          userType: 'PRIORITY',
          shareRatio: 1, // 优先只有一个用户，占100%
          status: 'ACTIVE',
          totalProfit: 0,
          totalLoss: 0,
        },
      });
      console.log(`创建用户: ${user.displayName} (${user.username})`);
    }

    // 检查参与记录
    const existingParticipation = await prisma.fundParticipant.findUnique({
      where: {
        fundId_userId: {
          fundId,
          userId: existingUser.id,
        },
      },
    });

    if (!existingParticipation) {
      await prisma.fundParticipant.create({
        data: {
          userId: existingUser.id,
          fundId,
          capitalAmount: user.capital,
          shareRatio: 1,
          cycleNumber: 1,
          status: 'ACTIVE',
        },
      });
      console.log(`  参与记录: 出资 ${user.capital}元`);
    }
  }

  // 验证最终结果
  console.log('\n=== 最终配置 ===');
  
  const fund = await prisma.fund.findUnique({
    where: { id: fundId },
  });
  
  const allParticipants = await prisma.fundParticipant.findMany({
    where: { fundId },
    include: { user: true },
  });

  console.log(`基金: ${fund.name}`);
  console.log(`劣后本金: ${fund.currentJuniorCapital}元`);
  console.log(`优先本金: ${fund.currentPriorityCapital}元`);
  console.log(`总出资: ${fund.currentJuniorCapital + fund.currentPriorityCapital}元`);

  console.log('\n劣后用户：');
  allParticipants.filter(p => p.user.userType === 'JUNIOR').forEach(p => {
    console.log(`  ${p.user.displayName}: ${p.capitalAmount}元, 比例 ${(p.shareRatio * 100).toFixed(2)}%`);
  });

  console.log('\n优先用户：');
  allParticipants.filter(p => p.user.userType === 'PRIORITY').forEach(p => {
    console.log(`  ${p.user.displayName}: ${p.capitalAmount}元`);
  });

  console.log('\n恢复完成！');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
  });
