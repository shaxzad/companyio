# Fuel Management Web

Browser application with persistent authentication and protected dashboard routes.

## Run

```bash
pnpm --filter @companyio/fuel-web dev
```

Set `VITE_API_URL` to the API origin when it is not `http://localhost:3000`. Users must sign in or create an account before dashboard routes are rendered.
