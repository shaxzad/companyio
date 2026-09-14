# Getting Started with Development

## Prerequisites

- Node.js 18 or higher
- pnpm 9 or higher
- Git

## Installation Steps

### 1. Clone Repository

```bash
git clone <repository-url>
cd companyio
```

### 2. Install Dependencies

```bash
pnpm install
```

This will install dependencies for all workspaces (apps and packages).

### 3. Environment Setup

Copy the example environment file:

```bash
cp .env.example .env
```

Update `.env` with your actual values:

- PostgreSQL `DATABASE_URL`
- API configuration
- AI service keys (OpenAI, Anthropic)

### 4. Build Shared Packages

```bash
pnpm build
```

### 5. Start Development

#### Option A: Run All Apps

```bash
pnpm dev
```

#### Option B: Run Specific Apps

```bash
# Terminal 1 - API Server
pnpm --filter @companyio/api dev

# Terminal 2 - Desktop App
pnpm --filter @companyio/desktop dev
```

## Project Structure

After installation, you'll see:

```
companyio/
├── apps/
│   ├── admin/          # Admin web app
│   ├── web/            # Web app
│   ├── api/            # Fastify API server
│   └── desktop/        # React + Tauri desktop app
├── packages/
│   ├── auth-client/
│   ├── auth-contracts/
│   ├── auth-fastify/
│   ├── auth-react/
│   ├── ai-schemas/
│   ├── platform-database/
│   ├── platform-tenancy/
│   ├── platform-ui/
│   └── shared-types/
├── docs/
├── scripts/
├── package.json       # Root workspace config
├── pnpm-workspace.yaml
├── tsconfig.json
├── .env.example
└── README.md
```

## Development Commands

### General Commands

```bash
pnpm dev              # Start all apps in development
pnpm build            # Build all packages
pnpm test             # Run all tests
pnpm lint             # Lint all code
pnpm format           # Format all code
```

### App-Specific Commands

**Desktop App:**

```bash
pnpm --filter @companyio/desktop dev
pnpm --filter @companyio/desktop build
pnpm --filter @companyio/desktop test
```

**API Server:**

```bash
pnpm --filter @companyio/api dev
pnpm --filter @companyio/api build
pnpm --filter @companyio/api test
```

## Troubleshooting

### Port Already in Use

If port 3000 or 5173 is already in use:

```bash
# Find and kill process
lsof -i :3000
kill -9 <PID>
```

### Dependencies Not Installing

```bash
# Clear cache and reinstall
pnpm store prune
pnpm install
```

### Module Not Found Errors

```bash
# Rebuild packages
pnpm build
```

## Next Steps

1. Review [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
2. Check [API.md](./API.md) for API documentation
3. Read [../CONTRIBUTING.md](../CONTRIBUTING.md) for contribution guidelines

## Need Help?

- Check existing issues on GitHub
- Review documentation in `/docs` folder
- Create a new issue with detailed description
