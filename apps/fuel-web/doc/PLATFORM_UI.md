# Platform UI — where components live

All **reusable** UI for CompanyIO product apps is built and exported from:

`@companyio/platform-ui` (`packages/platform-ui`)

Apps such as `fuel-web` should **not** keep a parallel `src/ui` (or similar) folder for shared chrome, toasts, tables, forms, or dialogs.

## Rule

| Put it here | Examples |
| --- | --- |
| `packages/platform-ui` | `DataTable`, `FormField`, `ConfirmDialog`, `DatePicker`, `Modal`, `PageShell`, `PageHeader`, `toast` / `AppToaster`, action classes, `Notice`, `KpiCard` |
| App `features/` / `pages/` | Screens that **compose** those primitives for one product flow |

## How to add a component

1. Create the component under `packages/platform-ui/src/components/…`
2. Export it from `packages/platform-ui/src/index.tsx`
3. Run `pnpm --filter @companyio/platform-ui build`
4. Import from `@companyio/platform-ui` in the app

## Anti-pattern

```text
apps/fuel-web/src/ui/page.tsx   ❌  shared layout
apps/fuel-web/src/ui/toast.tsx  ❌  shared toasts
```

```text
packages/platform-ui/src/components/ui/page.tsx   ✅
packages/platform-ui/src/components/ui/toast.tsx  ✅
```

This matches the Cursor rule `.cursor/rules/platform-ui-shared.mdc`.
