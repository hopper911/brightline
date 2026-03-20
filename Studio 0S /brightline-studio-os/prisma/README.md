# Prisma

Reserved for future Prisma migration. The app currently uses SQLite via better-sqlite3 and `lib/db/schema.sql`.

To migrate to Prisma/Postgres later:
1. Add Prisma dependencies
2. Create schema.prisma from lib/db/schema.sql
3. Update lib/db to use Prisma client
4. Add migration scripts
