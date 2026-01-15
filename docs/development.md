# Development Environment Setup

## Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local development)

## Quick Start with Docker

1. **Clone and start the development environment:**

   ```bash
   git clone <repository-url>
   cd kanak-app
   docker-compose up -d
   ```

2. **Access the services:**
   - Web App: http://localhost:3000
   - API: http://localhost:3001
   - PostgreSQL: localhost:5432
   - Redis: localhost:6379
   - PgAdmin: http://localhost:8080 (admin@kanak.com / admin)
   - Redis Commander: http://localhost:8081

3. **Stop the environment:**
   ```bash
   docker-compose down
   ```

## Local Development

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Set up environment variables:**

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your values
   ```

3. **Start PostgreSQL & Redis with Docker:**

   ```bash
   docker-compose up -d postgres redis
   ```

4. **Run database migrations:**

   ```bash
   npm run db:generate
   npm run db:push
   ```

5. **Start the development servers:**
   ```bash
   npm run dev
   ```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run storybook` - Start Storybook
- `npm run db:studio` - Open Prisma Studio
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Run database migrations

## Environment Variables

### Required

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT tokens

### Optional

- `REDIS_URL` - Redis connection string
- `NEXT_PUBLIC_SENTRY_DSN` - Sentry error tracking DSN
- `NODE_ENV` - Environment (development/production)

## Database Management

- **View Database:** `npm run db:studio`
- **Reset Database:** `npm run db:push --force-reset`
- **Generate Migrations:** `npm run db:generate`

## Code Quality

- **Pre-commit hooks** automatically run linting and formatting
- **Prettier** handles code formatting
- **ESLint** checks for code issues
- **TypeScript** provides type safety
