const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== 所有用户 ===');
  const users = await prisma.user.findMany({
    include: { participations: true },
    orderBy: { createdAt: 'desc' },
  });
  console.log(JSON.stringify(users, null, 2));

  console.log('\n=== FundParticipant 表 ===');
  const participants = await prisma.fundParticipant.findMany({
    orderBy: { createdAt: 'desc' },
  });
  console.log(JSON.stringify(participants, null, 2));

  console.log('\n=== Fund 表 ===');
  const funds = await prisma.fund.findMany();
  console.log(JSON.stringify(funds, null, 2));
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
  });
