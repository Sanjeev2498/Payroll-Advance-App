const { PrismaClient } = require('@prisma/client');

async function testDatabaseConnection() {
  console.log('🧪 Testing database connection...');
  
  const prisma = new PrismaClient();
  
  try {
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Test query execution
    const result = await prisma.$queryRaw`SELECT version() as db_version`;
    console.log('✅ Query execution successful');
    console.log('📊 PostgreSQL version:', result[0].db_version.split(' ')[1]);
    
    // Test schema exists
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    
    if (tables.length > 0) {
      console.log('✅ Database schema exists');
      console.log('📋 Tables found:', tables.map(t => t.table_name).join(', '));
    } else {
      console.log('⚠️  No tables found - run migration first');
    }
    
    // Test RLS configuration  
    const rlsTables = await prisma.$queryRaw`
      SELECT schemaname, tablename, rowsecurity
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND rowsecurity = true;
    `;
    
    if (rlsTables.length > 0) {
      console.log('🔒 Row Level Security enabled on:', rlsTables.map(t => t.tablename).join(', '));
    } else {
      console.log('⚠️  No RLS policies found - run setup script');
    }
    
    console.log('🎉 Database is ready for use!');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('💡 Make sure Docker containers are running:');
    console.log('   docker-compose up -d postgres');
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run test if called directly
if (require.main === module) {
  testDatabaseConnection()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { testDatabaseConnection };