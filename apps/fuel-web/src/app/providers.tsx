import { PropsWithChildren, StrictMode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, AppWrapper } from '@companyio/platform-ui';
import { AuthClient, createBrowserStorage } from '@companyio/auth-client';
import { AuthProvider } from '@companyio/auth-react';
import { queryClient } from './queryClient';
import { AppToaster } from '../ui/toast';

export const authClient = new AuthClient({
  baseUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  clientId: 'fuel-management-web',
  storage: createBrowserStorage(),
});

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AppWrapper>
            <AuthProvider client={authClient}>
              {children}
              <AppToaster />
            </AuthProvider>
          </AppWrapper>
        </ThemeProvider>
      </QueryClientProvider>
    </StrictMode>
  );
}
