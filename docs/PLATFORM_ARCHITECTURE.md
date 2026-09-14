# Company Platform Architecture

This repository is the `company-platform` reference monorepo for reusable product capabilities. Product applications should compose platform packages instead of reimplementing authentication, user management, API contracts, tenant isolation, database conventions, or shell navigation.

## Install in another repository

After publishing to the company npm registry, a Web, Desktop, or Mobile repository can install the platform packages:

```bash
pnpm add @companyio/auth-client \
  @companyio/auth-react \
  @companyio/platform-ui \
  @companyio/platform-tenancy \
  @companyio/platform-database
```

The shared contract package is also available when a product needs the underlying types:

```bash
pnpm add @companyio/auth-contracts
```

During development inside this monorepo, `workspace:*` links are used instead of the registry. The packages must be published before external repositories can install them.

## Package layers

```text
@companyio/auth-contracts   API schemas, user/session/org types
@companyio/auth-client      Platform-neutral auth and user client
@companyio/auth-react       AuthProvider and useAuth hook
@companyio/auth-fastify     Fastify request authentication boundary
@companyio/platform-ui      Shared React application shell primitives
@companyio/platform-tenancy Tenant context and request scope enforcement
@companyio/platform-database PostgreSQL connection conventions
```

## Platform adapters

The core client does not decide how tokens are stored or how a browser is opened. Each host supplies an adapter:

- Web: HTTP-only refresh cookie, short-lived access token in memory, OIDC PKCE redirect.
- Tauri: system-browser OIDC PKCE flow, then OS keychain-backed `TokenStorage`.
- React Native: system-browser OIDC PKCE flow, then Keychain/Keystore-backed `TokenStorage`.

Do not put provider SDKs, secrets, or platform storage APIs in product applications.

## Product composition

```tsx
const authClient = new AuthClient({
  baseUrl: import.meta.env.VITE_API_URL,
  clientId: 'companyio-desktop',
  storage: secureStorage,
});

<AuthProvider client={authClient}>
  <AppShell productName="CompanyIO" actions={<AccountMenu />}>
    <ProductRoutes />
  </AppShell>
</AuthProvider>;
```

## API boundary

All APIs use the same routes and bearer-token contract:

```text
POST /api/v1/auth/authorize
POST /api/v1/auth/callback
GET  /api/v1/auth/session
POST /api/v1/auth/logout
GET  /api/v1/users/me
GET  /api/v1/organizations
```

The API validates access tokens using the company's OIDC issuer and JWKS. Product APIs use `request.authenticate()` from `auth-fastify`, then authorize organization roles in their own domain service.

For a product API, use both shared boundaries:

```ts
await app.register(authFastify, { verifyAccessToken });
await app.register(tenancyFastify, {
  authenticate: (request) => request.authenticate(),
});

app.get('/students', async (request) => {
  await request.requireTenant();
  return students
    .find({
      ...tenantFilter(request.tenant!),
    })
    .toArray();
});
```

The tenant filter is mandatory for business-owned data. Product services should wrap this in repositories so individual route handlers cannot forget it.

## User and organization ownership

The identity service owns identity, email verification, sessions, and organization membership. Each product owns its own domain records and references `userId` and `organizationId`. This keeps company-wide account behavior consistent while allowing products to evolve independently.

## Versioning and delivery

- Keep packages independently versioned and publish from CI.
- Use changesets for coordinated breaking changes.
- Products consume released package versions; the monorepo uses `workspace:*` during development.
- Add a migration note for every public contract change.

## Security baseline

- Authorization Code + PKCE for all interactive clients.
- Short-lived access tokens and refresh-token rotation.
- HTTP-only, secure, same-site cookies on web.
- OS secure storage on desktop/mobile.
- Server-side authorization on every protected route.
- Never trust role claims from UI state.
- Audit login, logout, invitation, role-change, and token-revocation events.

## Creating a new product

Create a product repository only for product-specific code. Consume the platform packages from the private npm registry:

```bash
pnpm add @companyio/auth-client @companyio/auth-react \
  @companyio/platform-ui @companyio/platform-tenancy
```

The product application supplies only its `clientId`, API URL, navigation, screens, and domain modules. The platform repository remains the source for shared behavior.
