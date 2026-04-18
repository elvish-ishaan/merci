# Mercy - Static Site Deployment Platform

Mercy is a modern deployment platform that simplifies deploying static sites directly from Git repositories. Connect your GitHub repo, and Mercy handles cloning, building, and hosting—all in one seamless workflow.

## Overview

Mercy enables developers to deploy web applications with minimal configuration. Simply provide a repository URL, and the platform automatically:
- Clones your repository
- Builds your project
- Uploads assets to distributed storage
- Serves your application instantly

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                          │
│  • User Registration & Login                                    │
│  • Dashboard & Project Management                               │
│  • Deployment Status Tracking                                   │
│  • Settings Management                                          │
└────────────────┬────────────────────────────────────────────────┘
                 │ HTTP/REST
┌────────────────▼────────────────────────────────────────────────┐
│                  API Server (Express.js)                        │
│  • Authentication (JWT)                                         │
│  • Project Management                                           │
│  • Deployment Orchestration                                     │
│  • Static File Serving                                          │
└────────────────┬────────────┬──────────────────────────────────┘
                 │            │
    ┌────────────▼─────┐      └──────────────────────┐
    │   PostgreSQL DB  │                             │
    │  • Users         │                             │
    │  • Projects      │                             │
    │  • Status Info   │                             │
    └──────────────────┘                             │
                                                     │ Queue Tasks
                                                     │
                                    ┌────────────────▼──────┐
                                    │   Redis (BullMQ)      │
                                    │  • Job Queue          │
                                    │  • Deployment Tasks   │
                                    └────────────────┬──────┘
                                                     │
                                    ┌────────────────▼──────┐
                                    │ Worker Service        │
                                    │  • Clone Repos        │
                                    │  • Build Projects     │
                                    │  • Upload Builds      │
                                    └────────────────┬──────┘
                                                     │
                                    ┌────────────────▼──────┐
                                    │ Cloudflare R2         │
                                    │  • Static Assets      │
                                    │  • Built Applications │
                                    └───────────────────────┘
```

## Tech Stack

### Frontend
- **Next.js 16** - React framework for production-grade applications
- **React 19** - UI library
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Component library built on Radix UI
- **Lucide React** - Icon library

### Backend
- **Express.js** - Minimal and flexible web framework
- **Bun** - Fast JavaScript runtime and package manager
- **TypeScript** - Type-safe development
- **Prisma** - ORM for database management
- **JWT (jose)** - Authentication tokens
- **bcryptjs** - Password hashing

### Infrastructure
- **PostgreSQL** - Relational database
- **Redis + BullMQ** - Job queue for deployments
- **Cloudflare R2** - S3-compatible object storage
- **Docker Compose** - Local development containers
- **Turbo** - Monorepo management

## Project Structure

```
mercy/
├── apps/
│   ├── web/              # Next.js frontend application
│   │   ├── app/          # App directory (pages & layouts)
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── dashboard/
│   │   └── components/   # Reusable React components
│   │
│   ├── api/              # Express backend server
│   │   ├── src/
│   │   │   ├── routes/   # API endpoints
│   │   │   │   ├── auth.ts
│   │   │   │   ├── deploy.ts
│   │   │   │   └── app.ts
│   │   │   ├── middleware/
│   │   │   └── lib/
│   │   └── index.ts
│   │
│   └── worker/           # BullMQ worker for deployments
│       └── index.ts
│
├── packages/
│   ├── db/               # Shared database setup (Prisma)
│   │   └── prisma/
│   │       └── schema.prisma
│   ├── ui/               # Shared UI components
│   ├── eslint-config/    # Shared ESLint configuration
│   └── typescript-config/# Shared TypeScript configuration
│
├── turbo.json            # Monorepo configuration
└── package.json          # Root package configuration
```

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **Bun** 1.3.10 or later
- **Docker & Docker Compose** (for local PostgreSQL and Redis)
- **Git**

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mercy
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Set up environment variables**
   
   Copy the environment template to each app:
   ```bash
   cp apps/api/.env.example apps/api/.env
   ```
   
   Edit `apps/api/.env` with your configuration:
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mercy"
   JWT_SECRET="your-secure-random-secret-key"
   
   R2_ENDPOINT="https://your-account.r2.cloudflarestorage.com"
   R2_ACCESS_KEY_ID="your-access-key"
   R2_SECRET_ACCESS_KEY="your-secret-key"
   R2_BUCKET_NAME="your-bucket-name"
   
   REDIS_HOST="localhost"
   REDIS_PORT="6379"
   ```

4. **Start local services**
   ```bash
   docker-compose -f apps/api/docker-compose.yml up -d
   ```
   
   This starts PostgreSQL and Redis containers.

5. **Run database migrations**
   ```bash
   cd packages/db
   bun run db:push
   cd ../..
   ```

### Running the Application

Start all services in development mode:

```bash
bun run dev
```

This command runs all development servers in parallel using Turbo:
- **Frontend**: http://localhost:3000 (Next.js)
- **API**: http://localhost:3001 (Express)
- **Worker**: Runs in background processing deployment jobs

### Running Individual Services

**Frontend only:**
```bash
cd apps/web && bun run dev
```

**API only:**
```bash
cd apps/api && bun run dev
```

**Worker only:**
```bash
cd apps/worker && bun run dev
```

### Building for Production

```bash
bun run build
```

This compiles all packages and applications with optimizations.

### Type Checking

```bash
bun run check-types
```

### Linting

```bash
bun run lint
```

### Code Formatting

```bash
bun run format
```

## Contributing

### Setting Up for Development

1. Create a new branch for your feature:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following the code standards below.

3. Run tests and checks(comming sooon):
   ```bash
   bun run lint
   bun run check-types
   bun run build
   ```

4. Commit your changes:
   ```bash
   git commit -m "feat: describe your changes"
   ```

5. Push and create a pull request:
   ```bash
   git push origin feature/your-feature-name
   ```

### Commit Message Convention

```
feat: add new feature
fix: resolve issue
refactor: improve code structure
docs: update documentation
style: formatting changes
test: add or update tests
chore: maintenance tasks
```

### Pull Request Guidelines

- Keep PRs focused on a single feature or fix
- Write descriptive PR titles and descriptions
- Reference related issues with `Closes #issue-number`
- Ensure all checks pass before requesting review
- Request review from maintainers

## Deployment

### Production Deployment

1. Set production environment variables in your hosting platform
2. Build the application:
   ```bash
   bun run build
   ```
3. Deploy using your preferred platform

### Environment Variables Required

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secure random secret for JWT signing
- `R2_ENDPOINT` - Cloudflare R2 endpoint
- `R2_ACCESS_KEY_ID` - R2 access key
- `R2_SECRET_ACCESS_KEY` - R2 secret key
- `R2_BUCKET_NAME` - R2 bucket name
- `REDIS_HOST` - Redis host
- `REDIS_PORT` - Redis port
- `PORT` - API server port (default: 3001)

## Troubleshooting

### Connection Issues
- Ensure Docker containers are running: `docker-compose -f apps/api/docker-compose.yml ps`
- Check that PostgreSQL is accessible: `psql $DATABASE_URL -c "SELECT 1"`
- Verify Redis connection: `redis-cli ping`

### Build Failures
- Clear node_modules and reinstall: `rm -rf node_modules && bun install`
- Reset database: `cd packages/db && bun run db:reset`

### Port Conflicts
- Frontend: Change with `next dev --port <PORT>`
- API: Set `PORT` environment variable

## License

This project is licensed under the MIT License. See LICENSE file for details.

## Support

For issues, feature requests, or questions:
- Open an issue on GitHub
- Check existing documentation

---