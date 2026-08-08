import { defineConfig, env } from 'prisma/config'
import 'dotenv/config'

export default defineConfig({
  schema: './schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
  migrations: {
    path: './migrations',
  },
})