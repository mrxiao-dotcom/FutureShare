const { PrismaClient } = require('@prisma/client');
const { hash } = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const username = process.argv[2] || 'admin';
  const password = process.argv[3] || 'admin123';
  const displayName = process.argv[4] || '管理员';

  // 检查用户是否已存在
  const existingUser = await prisma.user.findUnique({
    where: { name: username },
  });

  if (existingUser) {
    console.log(`用户 ${username} 已存在，正在更新为管理员...`);

    // 更新为管理员
    const hashedPassword = await hash(password, 10);
    await prisma.user.update({
      where: { name: username },
      data: {
        password: hashedPassword,
        isAdmin: true,
        displayName: displayName,
        status: 'ACTIVE',
      },
    });
    console.log(`✅ 用户 ${username} 已更新为管理员`);
  } else {
    console.log(`创建管理员用户: ${username}`);

    const hashedPassword = await hash(password, 10);

    await prisma.user.create({
      data: {
        name: username,
        displayName: displayName,
        password: hashedPassword,
        isAdmin: true,
        userType: 'TRADER', // 操盘手类型
        status: 'ACTIVE',
        shareRatio: 0,
        totalProfit: 0,
        totalLoss: 0,
      },
    });
    console.log(`✅ 管理员 ${username} 创建成功！`);
  }

  console.log('\n登录信息：');
  console.log(`  用户名: ${username}`);
  console.log(`  密码: ${password}`);
  console.log(`  (请在首次登录后修改密码)`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('错误:', e);
    prisma.$disconnect();
  });
