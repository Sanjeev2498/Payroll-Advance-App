const { PrismaClient } = require('@prisma/client');

async function checkClients() {
  const prisma = new PrismaClient();
  
  try {
    const clients = await prisma.client.findMany();
    console.log('Clients found:', clients.length);
    
    if (clients.length > 0) {
      console.log('First client:', clients[0].id, clients[0].name);
    } else {
      console.log('No clients found - need to create one first');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkClients();