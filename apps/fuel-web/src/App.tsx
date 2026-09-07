import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { PropsWithChildren } from 'react';
import { useAuth } from '@companyio/auth-react';

import { AppLayout, ScrollToTop } from '@companyio/platform-ui';
import { sidebarConfig } from './config/sidebar';

import SignIn from './pages/AuthPages/SignIn';
import SignUp from './pages/AuthPages/SignUp';
import NotFound from './pages/OtherPage/NotFound';
import UserProfiles from './pages/UserProfiles';
import Home from './pages/Dashboard/Home';
import FuelModulePage from './pages/FuelModulePage';

function ModulePlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">
          Fuel operations
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
        This module is ready for its data workflow. Connect it to the Fuel API when the domain
        endpoints are available.
      </div>
    </div>
  );
}

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
              <AppLayout config={sidebarConfig} />
            </RequireAuth>
          }
        >
          <Route index path="/" element={<Home />} />

          <Route path="/profile" element={<UserProfiles />} />
          <Route
            path="/sales"
            element={
              <ModulePlaceholder
                title="Daily sales"
                description="Capture opening and closing meter readings and reconcile litres sold by nozzle and shift."
              />
            }
          />
          <Route
            path="/fleet-sales"
            element={
              <ModulePlaceholder
                title="Fleet sales"
                description="Issue fuel to an organization vehicle, post the credit sale, and keep its history traceable."
              />
            }
          />
          <Route
            path="/organizations"
            element={
              <ModulePlaceholder
                title="Organizations"
                description="Manage credit customers, vehicles, limits, statements, and payment history."
              />
            }
          />
          <Route
            path="/inventory"
            element={
              <ModulePlaceholder
                title="Inventory"
                description="Track tank stock, receipts, sales, adjustments, and physical reconciliation."
              />
            }
          />
          <Route
            path="/fuel-purchases"
            element={
              <FuelModulePage
                title="Fuel purchases"
                description="Record tanker deliveries, landed cost, supplier balances, and stock increases."
                actionLabel="Record purchase"
              />
            }
          />
          <Route path="/receiving" element={<Navigate to="/fuel-purchases" replace />} />
          <Route
            path="/assets"
            element={
              <ModulePlaceholder
                title="Pumps & tanks"
                description="Configure stations, pumps, nozzles, tanks, capacities, and fuel assignments."
              />
            }
          />
          <Route
            path="/customers"
            element={
              <FuelModulePage
                title="Customers"
                description="Manage customer records, contacts, and account activity."
              />
            }
          />
          <Route
            path="/vehicles"
            element={
              <FuelModulePage
                title="Vehicles"
                description="Manage organization vehicles, drivers, fuel types, and vehicle history."
                actionLabel="Add vehicle"
              />
            }
          />
          <Route
            path="/credit-accounts"
            element={
              <FuelModulePage
                title="Credit accounts"
                description="Review organization credit limits, balances, statements, and overdue accounts."
              />
            }
          />
          <Route
            path="/payments"
            element={
              <FuelModulePage
                title="Payments"
                description="Record customer payments and reconcile outstanding organization balances."
                actionLabel="Record payment"
              />
            }
          />
          <Route
            path="/expenses"
            element={
              <FuelModulePage
                title="Expenses"
                description="Record station expenses, payment accounts, approvals, and receipts."
                actionLabel="Add expense"
              />
            }
          />
          <Route
            path="/reports"
            element={
              <FuelModulePage
                title="Reports"
                description="Review sales, inventory, fleet, customer, and financial reports."
                actionLabel="Export report"
              />
            }
          />
        </Route>

        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}
