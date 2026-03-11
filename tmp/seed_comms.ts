import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.findFirst({
    where: { code: 'ZENVIX' }
  });

  const user = await prisma.user.findFirst();

  if (!company || !user) {
    console.error('Company or User not found');
    return;
  }

  const tenantId = company.id;
  const userId = user.id;

  // 1. Bulletin Seed
  await prisma.bulletinPost.createMany({
    data: [
      {
        tenantId,
        authorId: userId,
        title: 'Welcome to the New Zenvix OS',
        body: 'We are excited to launch the unified business operating system for our organization.',
        category: 'general',
        isPinned: true,
      },
      {
        tenantId,
        authorId: userId,
        title: 'Security Policy Update - March 2026',
        body: 'Please review the updated security protocols regarding multi-factor authentication.',
        category: 'Human Resources',
        isPinned: false,
      }
    ]
  });

  // 2. Mail Seed
  const account = await prisma.mailAccount.create({
    data: {
      tenantId,
      userId,
      address: 'admin@zenvix.io',
      displayName: 'System Admin',
      isDefault: true,
      isVerified: true,
    }
  });

  const thread = await prisma.mailThread.create({
    data: {
      tenantId,
      subject: 'Quarterly Review Request',
    }
  });

  const folder = await prisma.mailFolder.create({
    data: {
      accountId: account.id,
      name: 'Inbox',
      type: 'inbox',
    }
  });

  const message = await prisma.mailMessage.create({
    data: {
      tenantId,
      threadId: thread.id,
      fromAccountId: account.id,
      fromAddress: 'system@zenvix.io',
      toAddresses: ['you@zenvix.io'] as any,
      subject: 'Quarterly Review Request',
      bodyText: 'Hello, please submit your quarterly review reports by this Friday.',
      status: 'received',
      receivedAt: new Date(),
    }
  });

  await prisma.mailFolderItem.create({
    data: {
      folderId: folder.id,
      messageId: message.id,
    }
  });

  console.log('Seed comms data completed.');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
