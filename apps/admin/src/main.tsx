import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, AppWrapper } from '@companyio/platform-ui';
import { AuthClient, createBrowserStorage } from '@companyio/auth-client';
import { AuthProvider } from '@companyio/auth-react';
import 'swiper/css/bundle';
import 'flatpickr/dist/flatpickr.css';
import '@companyio/platform-ui/styles.css';
import App from './App.tsx';

const authClient = new AuthClient({
  baseUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  clientId: 'interview-copilot-admin',
  storage: createBrowserStorage(),
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AppWrapper>
        <AuthProvider client={authClient}>
          <App />
        </AuthProvider>
      </AppWrapper>
    </ThemeProvider>
  </StrictMode>
);
