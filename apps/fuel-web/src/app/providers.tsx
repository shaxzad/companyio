import { PropsWithChildren, StrictMode } from 'react';
import { ThemeProvider, AppWrapper } from '@companyio/platform-ui';
import { AuthClient, createBrowserStorage } from '@companyio/auth-client';
import { AuthProvider } from '@companyio/auth-react';

export const authClient = new AuthClient({
  baseUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  clientId: 'fuel-management-web',
  storage: createBrowserStorage(),
});

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <StrictMode>
      <ThemeProvider>
        <AppWrapper>
          <AuthProvider client={authClient}>{children}</AuthProvider>
        </AppWrapper>
      </ThemeProvider>
    </StrictMode>
  );
}
