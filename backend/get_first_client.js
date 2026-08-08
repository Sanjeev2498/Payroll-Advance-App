const { PrismaClient } = require('@prisma/client');

async function getFirstClient() {
  let prisma;
  
  try {
    prisma = new PrismaClient();
    await prisma.$connect();
    
    const clients = await prisma.client.findMany({ take: 1 });
    
    if (clients.length > 0) {
      console.log('First client ID:', clients[0].id);
    } else {
      console.log('No clients found');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (prisma) {
      await prisma.$disconnect();
    }
  }
}

getFirstClient();