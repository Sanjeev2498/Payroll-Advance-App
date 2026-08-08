import { defineConfig } from 'prisma/config'
import 'dotenv/config'

// Clean the DATABASE_URL by removing quotes if present
let dbUrl = process.env.DATABASE_URL!;
if (dbUrl.startsWith('"') && dbUrl.endsWith('"')) {
  dbUrl = dbUrl.slice(1, -1);
}

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: dbUrl,
  },
  migrations: {
    path: './prisma/migrations',
  },
})