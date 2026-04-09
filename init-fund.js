/**
 * 初始化基金数据脚本
 * 运行: node init-fund.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 开始初始化基金数据...\n');

  // 检查是否已有基金数据
  const existingFund = await prisma.fund.findFirst();
  if (existingFund) {
    console.log('⚠️  基金已存在，跳过创建。');
    const allFunds = await prisma.fund.findMany();
    console.log('现有基金:', allFunds.map(f => f.name).join(', '));
    return;
  }

  // 1. 创建基金
  console.log('📊 创建基金...');
  const fund = await prisma.fund.create({
    data: {
      name: 'FutureShares 结构性期货基金',
      totalAssets: 8900000,
      priorityCapitalRate: 0.91,
      juniorCapitalRate: 0.09,
      traderShareRatio: 0.20,
      priorityShareRatio: 0.40,
      juniorShareRatio: 0.40,
      baseCapital: 8900000,
      currentPriorityCapital: 8100000,
      currentJuniorCapital: 800000,
    },
  });
  console.log(`✅ 基金创建成功: ${fund.name}\n`);

  // 2. 创建操盘手/管理员
  console.log('👤 创建操盘手...');
  const { hash } = require('bcryptjs');
  const hashedPassword = await hash('trader123', 10);

  const trader = await prisma.user.upsert({
    where: { name: 'trader' },
    update: {},
    create: {
      name: 'trader',
      displayName: '操盘手',
      password: hashedPassword,
      isAdmin: true,
      userType: 'TRADER',
      status: 'ACTIVE',
      shareRatio: 0,
      totalProfit: 0,
      totalLoss: 0,
    },
  });
  console.log(`✅ 操盘手创建成功: ${trader.displayName}\n`);

  // 3. 创建劣后用户
  console.log('👥 创建劣后用户...');
  const juniorUsers = [
    { name: 'xiaojian', displayName: '肖剑', capital: 400000 },
    { name: 'xiaohuajuan', displayName: '肖华娟', capital: 400000 },
    { name: 'liupingfei', displayName: '刘平飞', capital: 0 },
  ];

  const totalJuniorCapital = juniorUsers.reduce((sum, u) => sum + u.capital, 0);
  const juniorParticipants = [];

  for (const user of juniorUsers) {
    const shareRatio = user.capital > 0 ? user.capital / totalJuniorCapital : 0;

    const createdUser = await prisma.user.upsert({
      where: { name: user.name },
      update: {},
      create: {
        name: user.name,
        displayName: user.displayName,
        password: hashedPassword,
        isAdmin: false,
        userType: 'JUNIOR',
        status: 'ACTIVE',
        shareRatio: shareRatio,
        totalProfit: 0,
        totalLoss: 0,
      },
    });

    // 创建参与记录
    await prisma.fundParticipant.upsert({
      where: {
        fundId_userId: { fundId: fund.id, userId: createdUser.id },
      },
      update: {},
      create: {
        fundId: fund.id,
        userId: createdUser.id,
        capitalAmount: user.capital,
        shareRatio: shareRatio,
        cycleNumber: 1,
        status: 'ACTIVE',
      },
    });

    juniorParticipants.push({ user: createdUser, capital: user.capital, shareRatio });
    console.log(`  ✅ ${user.displayName}: ${user.capital}元 (${(shareRatio * 100).toFixed(2)}%)`);
  }

  // 4. 创建优先用户
  console.log('\n💰 创建优先用户...');
  const { hash: hash2 } = require('bcryptjs');
  const priorityHash = await hash2('trust123', 10);

  const priorityUser = await prisma.user.upsert({
    where: { name: 'zhongxintrust' },
    update: {},
    create: {
      name: 'zhongxintrust',
      displayName: '中信信托',
      password: priorityHash,
      isAdmin: false,
      userType: 'PRIORITY',
      status: 'ACTIVE',
      shareRatio: 1,
      totalProfit: 0,
      totalLoss: 0,
    },
  });

  await prisma.fundParticipant.upsert({
    where: {
      fundId_userId: { fundId: fund.id, userId: priorityUser.id },
    },
    update: {},
    create: {
      fundId: fund.id,
      userId: priorityUser.id,
      capitalAmount: 8100000,
      shareRatio: 1,
      cycleNumber: 1,
      status: 'ACTIVE',
    },
  });
  console.log(`  ✅ ${priorityUser.displayName}: 8100000元 (100%)\n`);

  // 5. 创建初始快照
  console.log('📈 创建初始快照...');
  await prisma.dailySnapshot.create({
    data: {
      fundId: fund.id,
      snapshotDate: new Date(),
      totalAssets: 8900000,
      priorityAssets: 8100000,
      juniorAssets: 800000,
      traderAssets: 0,
      priorityShare: 0,
      juniorShare: 0,
      traderShare: 0,
      dailyProfit: 0,
      cumulativeProfit: 0,
    },
  });
  console.log('  ✅ 快照创建成功\n');

  // 6. 输出登录信息
  console.log('='.repeat(50));
  console.log('🎉 数据初始化完成！');
  console.log('='.repeat(50));
  console.log('\n📋 登录信息：');
  console.log('------------------------------------------------------------');
  console.log('| 角色     | 用户名        | 密码        | 权限        |');
  console.log('------------------------------------------------------------');
  console.log('| 操盘手   | trader        | trader123   | 管理员      |');
  console.log('| 劣后用户 | xiaojian      | trader123   | 劣后查看    |');
  console.log('| 劣后用户 | xiaohuajuan   | trader123   | 劣后查看    |');
  console.log('| 劣后用户 | liupingfei    | trader123   | 劣后查看    |');
  console.log('| 优先用户 | zhongxintrust | trust123    | 优先查看    |');
  console.log('------------------------------------------------------------');
  console.log('\n⚠️  首次登录后请修改默认密码！');
  console.log('='.repeat(50));
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('❌ 初始化失败:', e.message);
    prisma.$disconnect();
    process.exit(1);
  });