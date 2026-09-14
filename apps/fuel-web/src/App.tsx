import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { PropsWithChildren } from 'react';
import { useAuth } from '@companyio/auth-react';
import { ScrollToTop, buildRouterRoutes } from '@companyio/platform-ui';

import SignIn from './pages/AuthPages/SignIn';
import SignUp from './pages/AuthPages/SignUp';
import NotFound from './pages/OtherPage/NotFound';
import { RoleGate } from './features/auth/RoleGate';
import { fuelRouterRoutes } from './config/routes';

function RequireAuth({ children }: PropsWithChildren) {
  const { user, isLoading } = useAuth();
  if (isLoading)
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  return user ? children : <Navigate to="/signin" replace />;
}

export default function App() {
  return (
    <Router>
      <ScrollToTop />

      <Routes>
        <Route
          element={
            <RequireAuth>
              <RoleGate />
            </RequireAuth>
          }
        >
          {buildRouterRoutes(fuelRouterRoutes)}
        </Route>

        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}
