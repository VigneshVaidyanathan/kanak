# Kanak App

A simple expense tracker application built with Next.js, Prisma, PostgreSQL, and Turborepo.

## Tech Stack

- **Framework**: Next.js 14
- **Database**: PostgreSQL with Prisma ORM
- **Monorepo**: Turborepo
- **UI**: shadcn/ui components with Tailwind CSS
- **State Management**: Zustand
- **Authentication**: JWT tokens
- **Table**: Tanstack Table
- **Icons**: Tabler Icons

## Project Structure

```
kanak/
├── apps/
│   └── web/              # Next.js application
├── packages/
│   ├── api/              # Database operations and JWT utilities
│   ├── components/       # Higher-level React components
│   ├── shared/           # Shared Zod schemas and types
│   ├── ui/               # shadcn/ui base components
│   └── utils/            # Environment variables and utilities
```

## Setup

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Set up environment variables**:
   Copy the template file and update with your values:

   ```bash
   cp apps/web/env.template apps/web/.env.local
   # Edit apps/web/.env.local with your DATABASE_URL and JWT_SECRET
   ```

3. **Set up the database**:

   ```bash
   # Generate Prisma client
   npm run db:generate

   # Push schema to database (for development)
   npm run db:push

   # OR use migrations (recommended for production)
   npm run db:migrate
   ```

4. **Create an admin user**:
   Use the seeder API endpoint:

   ```bash
   curl -X POST http://localhost:3000/api/seeder/create-user \
     -H "Content-Type: application/json" \
     -d '{
       "email": "admin@example.com",
       "name": "Admin User",
       "password": "your-password"
     }'
   ```

5. **Run the development server**:

   ```bash
   npm run dev
   ```

6. **Open your browser**:
   Navigate to `http://localhost:3000/auth` and login with the admin user you created.

## Deployment

### One-Click Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/kanak)

> **Note**: Replace `YOUR_USERNAME` in the deploy button URL with your GitHub username or organization name.

### Prerequisites

Before deploying, you'll need:

1. **A PostgreSQL database** - Choose one of the following options:
   - [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) (recommended for easiest integration)
   - [Neon](https://neon.tech) (serverless PostgreSQL)
   - [Supabase](https://supabase.com) (PostgreSQL with additional features)
   - External PostgreSQL (self-hosted or other providers)

2. **Environment variables** (see below)

### Step-by-Step Deployment

1. **Click the Deploy button** above or visit [Vercel](https://vercel.com/new)

2. **Import your repository**:
   - Connect your GitHub account
   - Select the `kanak` repository
   - Vercel will auto-detect Next.js and Turborepo settings

3. **Configure environment variables**:
   - Go to Project Settings → Environment Variables
   - Add the following variables:

   | Variable       | Description                                                   | Example                                                     |
   | -------------- | ------------------------------------------------------------- | ----------------------------------------------------------- |
   | `DATABASE_URL` | PostgreSQL connection string                                  | `postgresql://user:password@host:5432/dbname?schema=public` |
   | `JWT_SECRET`   | Secret key for JWT token signing (use a strong random string) | Generate with: `openssl rand -base64 32`                    |

4. **Set up your database**:

   **Option A: Vercel Postgres** (Recommended)
   - In Vercel dashboard, go to Storage → Create Database → Postgres
   - Copy the connection string and add it as `DATABASE_URL`
   - Vercel will automatically inject the connection string

   **Option B: Neon**
   - Create a project at [neon.tech](https://neon.tech)
   - Copy the connection string from the dashboard
   - Add it as `DATABASE_URL` in Vercel

   **Option C: Supabase**
   - Create a project at [supabase.com](https://supabase.com)
   - Go to Settings → Database → Connection string
   - Copy the connection string and add it as `DATABASE_URL`

   **Option D: External PostgreSQL**
   - Use your existing PostgreSQL database
   - Format: `postgresql://user:password@host:5432/dbname?schema=public`
   - Ensure the database is accessible from Vercel's IP ranges

5. **Deploy**:
   - Click "Deploy" in Vercel
   - Wait for the build to complete
   - Your app will be live at `https://your-project.vercel.app`

6. **Run database migrations**:
   After the first deployment, run migrations to set up your database schema:

   ```bash
   # Using Vercel CLI (install: npm i -g vercel)
   vercel env pull .env.local
   npx prisma migrate deploy

   # OR use Vercel's deployment hooks or run via API
   ```

   Alternatively, you can add a build script that runs migrations automatically. Update `apps/web/package.json`:

   ```json
   "build": "prisma generate && prisma migrate deploy && next build"
   ```

7. **Create your admin user**:
   Once deployed, create your first admin user via the API:

   ```bash
   curl -X POST https://your-project.vercel.app/api/seeder/create-user \
     -H "Content-Type: application/json" \
     -d '{
       "email": "admin@example.com",
       "name": "Admin User",
       "password": "your-secure-password"
     }'
   ```

8. **Access your app**:
   - Navigate to `https://your-project.vercel.app/auth`
   - Login with the admin credentials you created

### Environment Variables

The following environment variables are required for deployment:

- **`DATABASE_URL`** (Required)
  - PostgreSQL connection string
  - Format: `postgresql://[user]:[password]@[host]:[port]/[database]?schema=public`
  - Must be accessible from Vercel's servers

- **`JWT_SECRET`** (Required)
  - Secret key for signing JWT authentication tokens
  - Should be a strong, random string (at least 32 characters)
  - Generate with: `openssl rand -base64 32` or use a password generator
  - **Never commit this to version control**

### Database Setup Options

#### Vercel Postgres (Recommended)

- **Pros**: Native integration, automatic connection string injection, easy scaling
- **Cons**: Vercel-specific, may have usage limits
- **Setup**: Create via Vercel dashboard → Storage → Postgres

#### Neon

- **Pros**: Serverless, generous free tier, auto-scaling, branching
- **Cons**: Requires external account
- **Setup**:
  1. Sign up at [neon.tech](https://neon.tech)
  2. Create a project
  3. Copy connection string from dashboard

#### Supabase

- **Pros**: PostgreSQL with additional features (auth, storage, real-time), generous free tier
- **Cons**: More features than needed for basic setup
- **Setup**:
  1. Sign up at [supabase.com](https://supabase.com)
  2. Create a new project
  3. Go to Settings → Database → Connection string
  4. Use the connection pooler URL for better performance

#### External PostgreSQL

- **Pros**: Full control, use existing infrastructure
- **Cons**: Need to manage security, backups, scaling
- **Setup**: Ensure database allows connections from Vercel IP ranges

### Post-Deployment Checklist

- [ ] Environment variables configured in Vercel
- [ ] Database migrations run successfully
- [ ] Admin user created via API
- [ ] Can access `/auth` page
- [ ] Can login with admin credentials
- [ ] Database connection working (check Vercel logs)

## Features

- **Authentication**: Simple email/password login with JWT tokens
- **Transactions**: View all transactions in a filterable table
- **CSV Upload**: Upload CSV files with column mapping to import transactions
- **Transaction Fields**: date, amount, type (credit/debit), bankAccount, description, reason, category (optional)

## API Endpoints

- `POST /api/auth/login` - Login and get JWT token
- `POST /api/seeder/create-user` - Create admin user (for initial setup)
- `GET /api/transactions` - Get all transactions for authenticated user
- `POST /api/transactions` - Create a new transaction
- `POST /api/transactions/upload` - Upload CSV and get headers
- `POST /api/transactions/upload/process` - Process mapped CSV data

## Development

- `npm run dev` - Start development server
- `npm run build` - Build all packages
- `npm run lint` - Lint all packages

## Database Scripts

- `npm run db:generate` - Generate Prisma Client
- `npm run db:push` - Push schema changes to database (development)
- `npm run db:migrate` - Create and apply a new migration
- `npm run db:studio` - Open Prisma Studio (database GUI)
