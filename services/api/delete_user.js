const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const mobile = '9407726769';
  console.log(`Looking for user with mobile: ${mobile}`);
  
  const user = await prisma.user.findFirst({
    where: {
      mobile: {
        contains: mobile
      }
    }
  });

  if (!user) {
    console.log(`User with mobile ${mobile} not found.`);
    return;
  }

  console.log(`Found user ${user.id}. Deleting...`);

  // Let's rely on Prisma cascading deletes first. If it fails, we catch it.
  try {
    await prisma.user.delete({ where: { id: user.id } });
    console.log('Successfully deleted user.');
  } catch (e) {
    console.error("Delete failed. Trying to delete manually.", e.message);
    
    const tables = Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$'));
    for (const table of tables) {
      if (typeof prisma[table].deleteMany === 'function') {
        try {
          await prisma[table].deleteMany({ where: { userId: user.id } });
        } catch(err) {}
      }
    }
    
    await prisma.user.delete({ where: { id: user.id } });
    console.log('Successfully deleted user after manual cleanup.');
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
