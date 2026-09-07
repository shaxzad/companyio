# Architecture

## Monorepo Structure

This is a pnpm monorepo containing multiple related packages:

### Applications

- **desktop**: Tauri-based desktop application for interview preparation
- **api**: Fastify REST API server

### Shared Packages

- **shared-types**: TypeScript type definitions and interfaces
- **ai-schemas**: Zod validation schemas for AI operations

## Technology Decisions

### Desktop: Tauri + React

- **Why Tauri**: Lightweight, single binary, excellent performance, Rust security
- **Why React**: Component-based, large ecosystem, TypeScript support

### Backend: Fastify

- **Why Fastify**: Lightweight, fast, excellent plugin ecosystem, built-in validation support

### Database: PostgreSQL with Prisma

- **Why PostgreSQL**: Strong relational constraints, transactions, reliable migrations, and mature managed hosting

### State Management: Zustand

- **Why Zustand**: Lightweight, minimal boilerplate, excellent TypeScript support

### Validation: Zod

- **Why Zod**: Runtime validation, TypeScript-first, excellent error messages, JSON schema support

## Communication Flow

```
┌─────────────────────────┐
│   Desktop App (Tauri)   │
│   React + TypeScript    │
└────────────┬────────────┘
             │ HTTP/REST
             ▼
┌─────────────────────────┐
│   API Server (Fastify)  │
│   Node.js + TypeScript  │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│   PostgreSQL            │
│   Data Storage          │
└─────────────────────────┘

┌─────────────────────────┐
│   Shared Types Package  │
│   Used by all apps      │
└─────────────────────────┘

┌─────────────────────────┐
│   AI Schemas Package    │
│   Validation & Zod      │
└─────────────────────────┘
```

## Package Dependencies

- `apps/desktop` → depends on `shared-types`, `ai-schemas`
- `apps/api` → depends on `shared-types`, `ai-schemas`
- `packages/shared-types` → no dependencies
- `packages/ai-schemas` → depends on `zod`

## Development Workflow

1. **Feature Development**: Create feature branch
2. **Testing**: Write and run tests locally
3. **Building**: Build all packages
4. **Code Review**: Submit PR
5. **CI/CD**: GitHub Actions runs tests and builds
6. **Deployment**: Merge to main

## Future Enhancements

- Add Rust modules for native processing
- Implement real-time collaboration features
- Add mobile companion app
- Expand AI capabilities with LLM integrations
