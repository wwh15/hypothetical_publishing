# Hypothetical Publishing

A Next.js application for hypothetical publishing, built with TypeScript, Prisma, and Tailwind CSS.

## Prerequisites

- Node.js 20 or higher
- npm (or yarn/pnpm)
- Docker and Docker Compose (for local database)
- Git

## Local Development Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd hypothetical_publishing
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Local Database

Start the local PostgreSQL database using Docker Compose:

```bash
docker-compose -f docker-compose.local.yml up -d
```

This will start a PostgreSQL 16 database with the following default credentials:
- **Host**: `localhost`
- **Port**: `5432`
- **Database**: `app_dev`
- **Username**: `app`
- **Password**: `app`

### 4. Configure Environment Variables

Create a `.env.local` file in the project root. This file is gitignored and never committed, so you can safely use it for local development.

**Required variables:**

```bash
# Local database (use the Docker Postgres from step 3)
DATABASE_URL="postgresql://app:app@localhost:5432/app_dev"

# Supabase auth (required for login/sessions—get these from a teammate or your team's env doc)
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SECRET_KEY=<your-supabase-service-role-key>
```

Next.js loads `.env.local` and it takes precedence over `.env`. Prisma (e.g. `migrate deploy`) also reads `.env.local` via the project's Prisma config, so both the app and migrations will use your local database.

### 5. Run Database Migrations

Apply Prisma migrations to set up your database schema:

```bash
npm run migrate:deploy
```

### 6. Start the Development Server

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

The page will auto-update as you edit files in the `src/app` directory.

### Stopping the Local Database

When you're done developing, stop the local database:

```bash
docker-compose -f docker-compose.local.yml down
```

## Branch Workflow

This project follows a Git workflow with the following branches:

### Branch Structure

- **`main`**: Production branch - deploys to `hp.colab.duke.edu`
- **`qa`**: QA/Staging branch - deploys to `hp.colab.duke.edu:8081`
- **`feature/*`**: Feature branches for new development

### Creating Feature Branches

1. **Start from the latest `main` branch**:
   ```bash
   git checkout main
   git pull origin main
   ```

2. **Create a new feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
   
   Use descriptive names like:
   - `feature/books-page`
   - `feature/user-authentication`
   - `feature/sales-page`

3. **Make your changes and commit**:
   ```bash
   git add .
   git commit -m "Description of your changes"
   ```

4. **Push your feature branch**:
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create a Pull Request**:
   - Open a PR from your feature branch to `qa` for testing
   - After QA approval, merge to `qa` branch
   - Once validated in QA, create a PR from `qa` to `main` for production

### Deployment

- **QA Environment**: The `qa` branch automatically deploys to `hp.colab.duke.edu:8081`
- **Production Environment**: The `main` branch automatically deploys to `hp.colab.duke.edu`

Both environments use Docker Compose with Nginx reverse proxy and PostgreSQL databases.

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the application for production
- `npm run start` - Start the production server
- `npm run lint` - Run ESLint
- `npm run migrate:deploy` - Deploy Prisma migrations to the database

## Project Structure

```
hypothetical_publishing/
├── src/
│   ├── app/              # Next.js app directory
│   ├── lib/              # Utility functions and Prisma client
│   └── prisma/           # Prisma schema and migrations
├── docker/               # Docker Compose configs for QA and production
├── public/               # Static assets
└── docker-compose.local.yml  # Local development database
```

## Tech Stack

- **Framework**: Next.js 16.1.2
- **Language**: TypeScript
- **Database**: PostgreSQL 16 with Prisma ORM
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Deployment**: Docker with Nginx

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
