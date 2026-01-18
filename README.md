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

### One-Click Deploy to Vercel with Convex

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/VigneshVaidyanathan/kanak&env=CONVEX_URL)

> **One-Click Deployment**: Simply click the deploy button above! Vercel will automatically clone this repository and set up your deployment. No manual configuration needed - just follow the steps below to add Convex integration and your deploy key.
>
> **Want your own copy?** If you'd like to fork this repository to your GitHub account first (recommended for customization), you can click "Use this template" on GitHub (if this repository is set as a template) or manually fork it, then use the deploy button from your fork.

**Quick Setup Steps (One-Click Deployment):**

1. **Click the Deploy button** above
   - Vercel will automatically clone this repository
   - You'll be prompted to connect your GitHub account (if not already connected)
   - Vercel will create a new project for you

2. **Add Convex Integration**:
   - In the Vercel deployment page, click "Add Integration" or "Browse Marketplace"
   - Search for "Convex" and install the Convex integration
   - This will automatically create a Convex project and link it to your Vercel deployment

3. **Get Your Convex Deploy Key**:
   - After installing Convex, go to your [Convex Dashboard](https://dashboard.convex.dev)
   - Navigate to Settings → Deploy Keys
   - Copy your Production Deploy Key
   - Paste it into the `CONVEX_DEPLOY_KEY` environment variable in Vercel

4. **Deploy**: Click "Deploy" and Vercel will automatically:
   - Deploy your Convex backend (functions and schema)
   - Set the `CONVEX_URL` environment variable automatically
   - Build and deploy your Next.js frontend
   - Your app will be live in minutes!

The Convex integration will automatically configure the `CONVEX_URL` environment variable, so you don't need to set it manually!

**How It Works:**

- The build process automatically runs `npx convex deploy` before building your Next.js app
- This deploys your Convex functions and schema from `packages/convex`
- The `CONVEX_URL` is automatically set as an environment variable during the build
- Your frontend code can then access Convex using this URL

### Prerequisites

Before deploying, you'll need:

1. **Convex Backend** - Automatically set up via Vercel Marketplace integration (recommended)
   - The Convex integration creates a new Convex project
   - Automatically configures `CONVEX_URL` environment variable
   - Handles backend deployment during build

2. **Convex Deploy Key** (Required for build)
   - Get from [Convex Dashboard](https://dashboard.convex.dev) → Settings → Deploy Keys
   - Add as `CONVEX_DEPLOY_KEY` environment variable in Vercel
   - Use Production key for production deployments
   - Use Preview key for preview deployments (branches/PRs)

### Step-by-Step Deployment

**Option 1: One-Click Deploy (Recommended for Non-Developers)**

1. **Click the Deploy button** above
   - Vercel automatically clones the repository
   - No GitHub account setup needed if you're already logged in
   - Proceed to step 2 below

**Option 2: Manual Import**

1. Visit [Vercel](https://vercel.com/new) and click "Import Git Repository"

2. **Import your repository**:
   - Connect your GitHub account if not already connected
   - Search for and select the `kanak` repository (or fork it first if you want your own copy)
   - Vercel will auto-detect Next.js and Turborepo settings

3. **Add Convex Integration** (if not done via deploy button):
   - Go to Project Settings → Integrations
   - Click "Browse Marketplace" and search for "Convex"
   - Install the Convex integration
   - This automatically creates a Convex project and sets up `CONVEX_URL`

4. **Configure environment variables**:
   - Go to Project Settings → Environment Variables
   - Add the following variables:

   | Variable            | Description                                                   | Example                                                     | Required |
   | ------------------- | ------------------------------------------------------------- | ----------------------------------------------------------- | -------- |
   | `CONVEX_DEPLOY_KEY` | Convex deploy key from dashboard                              | Get from [Convex Dashboard](https://dashboard.convex.dev)   | Yes      |
   | `CONVEX_URL`        | Convex deployment URL (auto-set by integration)               | `https://xxx.convex.cloud`                                  | Auto     |
   | `DATABASE_URL`      | PostgreSQL connection string                                  | `postgresql://user:password@host:5432/dbname?schema=public` | No       |
   | `JWT_SECRET`        | Secret key for JWT token signing (use a strong random string) | Generate with: `openssl rand -base64 32`                    | No       |

   > **Note**: `CONVEX_URL` is automatically set by the Convex integration. You only need to provide `CONVEX_DEPLOY_KEY`.

5. **Set up your database** (Optional - only if using PostgreSQL):

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

6. **Deploy**:
   - Click "Deploy" in Vercel
   - The build process will automatically:
     - Deploy your Convex backend (using `CONVEX_DEPLOY_KEY`)
     - Set the `CONVEX_URL` environment variable
     - Build and deploy your Next.js frontend
   - Wait for the build to complete
   - Your app will be live at `https://your-project.vercel.app`

7. **Run database migrations** (Only if using PostgreSQL):
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

8. **Create your admin user**:
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

9. **Access your app**:
   - Navigate to `https://your-project.vercel.app/auth`
   - Login with the admin credentials you created

### Environment Variables

The following environment variables are required for deployment:

- **`CONVEX_DEPLOY_KEY`** (Required)
  - Deploy key from your Convex project
  - Get from [Convex Dashboard](https://dashboard.convex.dev) → Settings → Deploy Keys
  - Use Production key for production deployments
  - Use Preview key for preview deployments (branches/PRs)
  - **Never commit this to version control**

- **`CONVEX_URL`** (Auto-configured)
  - Automatically set by the Convex Vercel integration
  - Format: `https://[deployment-name].convex.cloud`
  - You don't need to set this manually when using the integration

- **`DATABASE_URL`** (Optional - only if using PostgreSQL)
  - PostgreSQL connection string
  - Format: `postgresql://[user]:[password]@[host]:[port]/[database]?schema=public`
  - Must be accessible from Vercel's servers
  - Note: This app primarily uses Convex, PostgreSQL is optional

- **`JWT_SECRET`** (Optional - only if using JWT auth)
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

## Self-Update System

The application includes a built-in update checker that helps users who have forked the repository stay up-to-date with the upstream version.

### How It Works

1. **Version Checking**: The app periodically checks the upstream repository's `version.json` file (from the main branch) and compares it with your local version.

2. **Update Banner**: When a newer version is available, a banner appears at the top of the application showing:
   - Current version vs. latest version
   - Changelog (if available)
   - "Update Now" button that opens GitHub's compare interface

3. **GitHub Compare Link**: The "Update Now" button generates a GitHub compare URL that pre-fills a pull request with all changes from the upstream repository, making it easy to merge updates.

### Setup for Vercel Deployments

To enable the update checker on Vercel, you need to:

1. **Enable System Environment Variables**:
   - Go to your Vercel project settings
   - Navigate to **Settings** → **Environment Variables**
   - Enable **"Automatically expose System Environment Variables"**
   - This provides `NEXT_PUBLIC_VERCEL_GIT_REPO_OWNER` and `NEXT_PUBLIC_VERCEL_GIT_REPO_SLUG` automatically

2. **Configure Upstream Repository** (Optional):
   - If your upstream repository is different from the default (`vignesh/voka`), set these environment variables:
     - `NEXT_PUBLIC_UPSTREAM_OWNER` - GitHub username of the upstream repository owner
     - `NEXT_PUBLIC_UPSTREAM_REPO` - Name of the upstream repository

### How the Update Process Works

1. When an update is detected, click **"Update Now"** in the banner
2. This opens GitHub's compare page showing all changes between your fork and the upstream
3. Review the changes and create a pull request to merge them into your repository
4. Once merged, your deployment will automatically update on the next build

### Local Development

The update checker works in local development as well, but the "Update Now" button requires the Vercel system environment variables to construct the GitHub compare URL. If these are not available, the banner will still show update information, but the button will be hidden.

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
