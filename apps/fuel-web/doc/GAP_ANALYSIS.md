# Gap analysis vs CODE_STRUCTURE_STANDARD.md

**No code changed.** This is the preparation step from `CURSOR_PROMPT.md`: where today’s repo diverges from the standard, and the minimal scaffolding needed before Feature 1.

Source of truth for WHAT: `apps/fuel-web/doc/FEATURE_WISE_SUMMARY.md`  
Source of truth for HOW: `CODE_STRUCTURE_STANDARD.md`

---

## 1. Missing packages (the three new ones)

| Package | Status | Today instead |
| --- | --- | --- |
| `packages/fuel-domain` | **Does not exist** | Math is inlined in `apps/api/src/fuel-routes.ts` |
| `packages/fuel-contracts` | **Does not exist** | Zod schemas live inside `fuel-routes.ts`; frontend types are duplicated in `apps/fuel-web/src/api/fuelApi.ts` |
| `packages/ui` | **Does not exist** | Buttons/inputs/selects live in `packages/platform-ui` mixed with app shell, ecommerce demos, and charts. No `components.json`, no shadcn monorepo package |

Existing packages that *are* present and reusable: `auth-contracts`, `auth-client`, `auth-react`, `auth-fastify`, `platform-ui`, `platform-database`, `platform-tenancy`.

---

## 2. Business math inside routes (not in `fuel-domain`)

`apps/api/src/fuel-routes.ts` is one ~725-line file: Zod + HTTP + Prisma transactions + formulas.

Examples of math that must later live in `fuel-domain`:

- Sale amount = `litres * unitPrice`
- Receipt cost = `litres * purchasePrice`
- Credit outstanding = sum(credit sales) − sum(payments)
- Ledger running balance = debit − credit
- Daily closing `cashDifference = actualCash − expectedCash` (expected cash is **client-supplied**, not computed)

**Concept A vs Concept B is not separated.** Credit sales (`saleType: 'CREDIT'`) and expenses share no “paid from today’s cash” flag. The paper-form Cash in Hand formula (Total = PMG + HSD + BBF; Expected = Total − Credit Sales − Cash Paid Out) does not exist as a function. Sample fixture `1,544,176 → 1,373,476` is not tested anywhere.

Frontend does not re-implement those formulas today — it says “calculations are handled by the API” — which is still the wrong place.

---

## 3. Generic `FuelRecordPage` (do not extend)

`apps/fuel-web/src/App.tsx` points one generic form at many endpoints:

- `/sales`, `/fleet-sales` → `/fuel/sales`
- `/organizations`, `/customers` → `/fuel/organizations`
- `/fuel-purchases` → `/fuel/receipts`
- `/vehicles` → `/fuel/organizations/:id/vehicles`
- `/payments` → `/fuel/payments`
- `/expenses` → `/fuel/expenses`

`FuelModulePage` is a placeholder shell (Inventory, Pumps & tanks, Credit accounts, Reports) with `--` metrics.

This is the anti-pattern the standard forbids for multi-meter grids, denomination counters, recon, and closing.

---

## 4. Frontend shape vs §5 / §6 / §8

| Standard | Today |
| --- | --- |
| `apps/fuel-web/src/features/<feature>/` | No `features/` folder. Pages + one `api/fuelApi.ts` |
| `app/routes.tsx`, `providers.tsx`, `sidebar.config.ts` | Routes in `App.tsx`; sidebar in `config/sidebar.tsx`; providers in `main.tsx` |
| TanStack Query for server data | Manual `fetch` + `useState` + `useEffect` in `FuelRecordPage` |
| React Hook Form + `zodResolver` | Native `<form>` + local state |
| Types from `fuel-contracts`, math from `fuel-domain` | Local types in `fuelApi.ts`; no domain package |
| Derived numbers computed, not stored | N/A (API computes; UI does not show live liters/amount) |
| RTL: logical Tailwind, `DirProvider`, `react-i18next` (en/ur) | Physical `left`/`right` in a few pages; no i18n; hard-coded English |
| Role-gate every screen | `RequireAuth` only (logged in vs not). No Owner / Manager / Staff / Accountant |

`fuel-web` currently depends on: `auth-client`, `auth-contracts`, `auth-react`, `platform-ui`. **No** `@tanstack/react-query`, `react-hook-form`, `@hookform/resolvers`, `react-i18next`.

---

## 5. Backend shape vs §4

| Standard | Today |
| --- | --- |
| `apps/api/src/fuel/routes/` + `services/` + `index.ts` | Single `apps/api/src/fuel-routes.ts` |
| Thin routes; services own transactions; math via `fuel-domain` | Routes do all three |
| Use `auth-fastify` plugin | `auth-fastify` exists but is **unused**. Auth is inlined in `apps/api/src/index.ts` (`getAuthenticatedUser`, scrypt, sessions) |

---

## 6. Auth vs Feature 1 (relevant, but Feature 1 work — not scaffolding)

Login / logout **already exists** (`SignIn` / `SignUp` via `platform-ui` + `auth-react`).

Gaps against Feature 1 DoD:

- Roles in `auth-contracts` are `owner` / `admin` / `member` (and invitations `admin` / `member`) — **not** Owner, Manager, Staff/Cashier, Accountant
- Prisma `User` has **no `role` field** and **no active / deactivated flag**
- No owner-only user list, no add/edit user form
- Public sign-up creates a new business + branch (not “owner creates staff”)
- Screens are not role-gated beyond “must be logged in”

Do **not** implement Feature 1 during scaffolding. Scaffolding only makes a place for it.

---

## 7. Interview / AI leftovers to quarantine (§9)

Do not delete in the scaffolding step unless you explicitly approve. Mark and isolate:

| Item | Why |
| --- | --- |
| `apps/desktop` | Tauri “Interview Copilot” app |
| `packages/ai-schemas` | AI interview Zod schemas; listed on `apps/api` but unused in `apps/api/src` |
| `packages/shared-types` | Interview-era types |
| `apps/web`, `apps/admin` | Still described as Interview Copilot; demo/template shells |
| Root `README.md`, `docs/SETUP.md`, `docs/API.md`, `docs/ARCHITECTURE.md` | Still describe interview product / `cd interview-copilot` |
| `apps/api` package description + `GET /api/v1` message | “Interview Copilot API v1” |

---

## 8. What already matches (keep)

- pnpm + TypeScript monorepo; `apps/*` + `packages/*`
- Fuel product is `apps/fuel-web` + fuel routes in `apps/api`
- Auth split: `auth-contracts` / `auth-client` / `auth-react` (this is the pattern `fuel-contracts` should copy)
- `platform-ui` AppLayout + sidebar config (shell can stay; primitives should move *onto* `packages/ui` over time)
- Prisma tenant-scoped fuel models (Station, FuelType, Tank, Pump, Nozzle, Sale, FuelReceipt, Expense, Payment, DailyClosing, AuditLog) — incomplete vs the plan, but a starting point
- No Redux (good)

---

## 9. Minimal scaffolding plan (before Feature 1)

Only what the prompt asked: create the three packages, split fuel-routes. No feature screens, no Feature 1 roles yet, no formula implementation beyond a stub that proves the package wires up.

### A. Create `packages/fuel-domain`

- Mirror a tiny package like `auth-contracts`: `package.json` (`@companyio/fuel-domain`), `tsconfig`, `vitest`, `src/index.ts`
- Zero React / Fastify / Prisma deps
- **Do not implement Feature 4–14 formulas yet.** Empty barrel (or a no-op export) so Feature 1 has a place to import later
- Sample Cash in Hand fixture belongs to Feature 13 — not this step

### B. Create `packages/fuel-contracts`

- Mirror `packages/auth-contracts` exactly (Zod only, `exports` map, tests)
- Empty or shared primitives only (`id`, date helpers) — **no Sale / Tanker / Expense schemas until those features**
- Feature 1 may add user-role schemas *when Feature 1 starts*, preferably extending `auth-contracts` for roles (auth concern) vs putting fuel entities here

### C. Create `packages/ui`

- New package `@companyio/ui`: `cn()`, `components.json` (monorepo style), Tailwind-friendly `src/components/`
- Add only the primitives Feature 1 will need (Button, Input, Label, Select) — **once**, here
- Do **not** migrate all of `platform-ui` in this step
- Keep `platform-ui` as the app shell (layout, sidebar, header). Later, shell imports primitives from `@companyio/ui`
- `fuel-web` adds `workspace:*` on `@companyio/ui`

### D. Split `fuel-routes.ts` (mechanical, behavior-preserving)

```
apps/api/src/fuel/
  routes/     # HTTP: parse → service → reply  (move existing handlers)
  services/   # Prisma transactions as they are today (no new math)
  index.ts    # registerFuelRoutes()
```

Suggested first split (match current endpoints, not the 18-feature names yet):

- `stations.routes.ts` / `types.routes.ts` / `organizations.routes.ts`
- `sales.routes.ts` / `receiving.routes.ts` / `payments.routes.ts` / `expenses.routes.ts`
- `inventory.routes.ts` / `closing.routes.ts` / `dashboard.routes.ts`

Zod currently in `fuel-routes.ts` **moves into `fuel-contracts` only when that entity’s feature is built.** During scaffolding, Zod can stay next to the route or as a temporary `apps/api/src/fuel/schemas.ts` so we do not invent Feature 4–9 contracts early.

`apps/api/src/index.ts` keeps calling `registerFuelRoutes` from `./fuel/index.ts`.

### E. Frontend wiring stubs (tiny, so Feature 1 has a folder)

Not a rewrite of every screen. Add empty structure only:

```
apps/fuel-web/src/
  app/providers.tsx      # AuthProvider + Theme (move from main.tsx); QueryClient + DirProvider added in Feature 1 / later
  app/routes.tsx         # optional: extract from App.tsx
  features/              # empty until Feature 1 (`auth/` or `users/`)
```

**Do not** replace `FuelRecordPage` in this step. Leave existing screens working. Feature modules replace them one feature at a time.

### F. Explicitly out of scaffolding

- Feature 1 roles, user list, deactivate
- TanStack Query / RHF / i18n rollout across old pages
- Implementing `computeCashInHand` / meter / Access (those are later features)
- Deleting `apps/desktop`, `ai-schemas`, rewriting README (quarantine in a later cleanup pass unless you want it in the same scaffolding PR)

---

## 10. Suggested order after you say go

1. Scaffold A–D (packages + split routes). Stop. You review.
2. Then Feature 1 only (login already exists — extend roles, user management, role-gate, RTL-safe screens using `@companyio/ui`).
3. Then Features 2–18 one at a time per `FEATURE_WISE_SUMMARY.md`.

---

## Review

- [ ] Gap list is accurate
- [ ] Scaffolding is the right size (three packages + split routes; no Feature 1 yet)
- [ ] Leave existing FuelRecordPage screens until their feature replaces them
- [ ] Interview leftovers quarantined later, not in this step
