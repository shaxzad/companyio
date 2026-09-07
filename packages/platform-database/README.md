# @companyio/platform-database

PostgreSQL connection helper for shared platform services.

## Use

```ts
import { connectProductDatabase } from '@companyio/platform-database';

const pool = await connectProductDatabase({
  connectionString: process.env.DATABASE_URL!,
});

try {
  await pool.query('SELECT 1');
} finally {
  await pool.end();
}
```

## Build

```bash
pnpm --filter @companyio/platform-database build
```
