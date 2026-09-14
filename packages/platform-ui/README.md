# @companyio/platform-ui

Shared React UI components, layouts, auth forms, charts, icons, and styling used by the web, admin, and desktop applications.

## Styling (required)

This package is Tailwind CSS v4–based. Installing the package alone does **not** ship prebuilt utility CSS — the consuming app must compile Tailwind.

### 1. Install Tailwind in the app

```bash
npm install -D tailwindcss @tailwindcss/vite
```

```ts
// vite.config.ts
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

### 2. Import the package stylesheet and scan your app

Create an app CSS entry (e.g. `src/index.css`):

```css
@import '@companyio/platform-ui/styles.css';

/* Required: generate utilities used in YOUR app source */
@source '../src/**/*.{js,ts,jsx,tsx}';
```

```tsx
// src/main.tsx
import '@companyio/platform-ui/styles.css'; // or './index.css' that imports it
import { AppLayout } from '@companyio/platform-ui';
```

Without step 2, components render unstyled: the published package does not include `src/`, and Tailwind only emits classes it finds via `@source`.

Importing from `@companyio/platform-ui` also side-loads styles via `dist/index.js`, but **your app still needs its own `@source`** for app-level class names.

## Auth forms

`SignInForm` and `SignUpForm` accept an `AuthClient` and submit directly to the shared authentication API:

```tsx
import { SignInForm } from '@companyio/platform-ui';

<SignInForm client={authClient} />;
```

The package also exports `AppLayout`, `ThemeProvider`, form controls, dashboards, tables, charts, and generated icons.

## Build

```bash
pnpm --filter @companyio/platform-ui build
```

The build regenerates icon components before running TypeScript.
