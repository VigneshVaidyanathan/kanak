# Web App

## Environment Variables

Copy `env.template` to `.env.local` and fill in your values:

```bash
cp env.template .env.local
```

Required variables:

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT token signing

## Database Commands

- `npm run db:generate` - Generate Prisma Client
- `npm run db:push` - Push schema changes to database (development)
- `npm run db:migrate` - Create and apply a new migration
- `npm run db:migrate:deploy` - Apply migrations in production
- `npm run db:studio` - Open Prisma Studio (database GUI)
