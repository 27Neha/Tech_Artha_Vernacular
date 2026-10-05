const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { mobile: '9407726769' },
        { email: 'jainrashi152@gmail.com' }
      ]
    }
  });

  if (users.length === 0) {
    console.log('No users found.');
  }

  for (const user of users) {
    console.log('Deleting user:', user.id);
    try {
      await prisma.user.delete({ where: { id: user.id } });
      console.log('Deleted successfully.');
    } catch (e) {
      console.log('Could not delete directly due to relations. Trying to delete relations...');
      const tables = [
        'userProfile', 'onboardingProgress', 'bseClient', 'fpInvestorProfile', 
        'kycApplication', 'kycRecord', 'portfolio', 'minorInvestorProfileResult'
      ];
      for (const table of tables) {
        try { await prisma[table].deleteMany({ where: { userId: user.id } }); } catch (err) {}
      }
      
      const tablesMany = [
        'auditLog', 'nominee', 'customBucket', 'consent', 'device', 'expense', 
        'fpMandate', 'goal', 'guardianConsent', 'minorRiskAssessment',
        'learningProgress', 'supportTicket', 'notification', 'session'
      ];
      for (const table of tablesMany) {
        try { await prisma[table].deleteMany({ where: { userId: user.id } }); } catch (err) {}
      }
      
      try {
        await prisma.user.delete({ where: { id: user.id } });
        console.log('Deleted successfully after clearing relations.');
      } catch (err) {
        console.log('Still failed:', err.message);
      }
    }
  }

  // Delete OtpVerifications
  const otps = await prisma.otpVerification.deleteMany({
    where: {
      OR: [
        { mobile: '9407726769' },
        { email: 'jainrashi152@gmail.com' }
      ]
    }
  });
  console.log('Deleted OTPs:', otps.count);
}
main().catch(console.error).finally(() => prisma.$disconnect());
