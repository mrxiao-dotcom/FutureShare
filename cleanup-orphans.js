const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 删除没有参与记录的孤立用户（排除管理员）
  const orphanedUsers = await prisma.user.findMany({
    where: {
      isAdmin: false,
      participations: {
        none: {},
      },
    },
  });

  console.log('=== 孤立用户（将被删除）===');
  orphanedUsers.forEach(u => console.log(`- ${u.name} (${u.userType}, id: ${u.id})`));

  if (orphanedUsers.length > 0) {
    const ids = orphanedUsers.map(u => u.id);
    await prisma.user.deleteMany({
      where: { id: { in: ids } },
    });
    console.log(`\n已删除 ${orphanedUsers.length} 个孤立用户`);
  } else {
    console.log('\n没有孤立用户');
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
  });
