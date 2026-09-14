import { createRoot } from 'react-dom/client';
import { AppProviders } from './app/providers.tsx';
import App from './App.tsx';
import './styles/theme.css';

createRoot(document.getElementById('root')!).render(
  <AppProviders>
    <App />
  </AppProviders>
);
