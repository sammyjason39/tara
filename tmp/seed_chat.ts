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

  // 1. Create Room
  const room = await prisma.chatRoom.create({
    data: {
      tenantId,
      createdBy: userId,
      type: 'GROUP',
      name: 'Engineering General',
    }
  });

  // 2. Add Member
  await prisma.chatMember.create({
    data: {
      roomId: room.id,
      tenantId,
      userId,
      role: 'admin',
    }
  });

  // 3. Send Initial Message
  await prisma.chatMessage.create({
    data: {
      roomId: room.id,
      tenantId,
      senderId: userId,
      body: 'Hello Team! Welcome to the engineering general channel.',
    }
  });

  console.log('Seed chat data completed.');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
