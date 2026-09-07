# Development Notes

## Quick Commands

```bash
# Start everything
pnpm dev

# Run tests
pnpm test

# Format code
pnpm format
```

## Debugging

### VS Code Debug Config

Add to `.vscode/launch.json`:

```json
{
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug API",
      "program": "${workspaceFolder}/apps/api/src/index.ts",
      "runtimeArgs": ["--loader", "ts-node/esm"]
    }
  ]
}
```

### API Server Endpoints

- Health: `http://localhost:3000/health`
- API Root: `http://localhost:3000/api/v1`

### Desktop App

- Dev URL: `http://localhost:5173`
- API requests go to `http://localhost:3000`

## Dependencies

### Desktop

- React 18
- Tauri 2
- TypeScript
- Tailwind CSS
- Zustand

### API

- Fastify
- PostgreSQL/Prisma
- TypeScript
- Zod

### Shared

- Zod (validation)
- TypeScript

## Common Issues

### Build Fails

```bash
pnpm install  # Reinstall
pnpm build    # Rebuild
```

### Workspace not found

```bash
pnpm install  # Ensures workspace linking
```

## Performance Tips

- Use `pnpm --filter` for specific workspace builds
- Filter commands save time during development
- Run `pnpm build` only when needed
