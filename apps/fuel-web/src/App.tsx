import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { PropsWithChildren } from 'react';
import { useAuth } from '@companyio/auth-react';

import { ScrollToTop } from '@companyio/platform-ui';

import SignIn from './pages/AuthPages/SignIn';
import SignUp from './pages/AuthPages/SignUp';
import NotFound from './pages/OtherPage/NotFound';
import UserProfiles from './pages/UserProfiles';
import Home from './pages/Dashboard/Home';
import FuelModulePage from './pages/FuelModulePage';
import FuelRecordPage from './pages/FuelRecordPage';
import { RoleGate } from './features/auth/RoleGate';
import UsersPage from './features/users/UsersPage';
import UserFormPage from './features/users/UserFormPage';
import PumpProfilePage from './features/settings/PumpProfilePage';
import ProductsPage from './features/settings/ProductsPage';
import TanksMetersPage from './features/settings/TanksMetersPage';
import DenominationsPage from './features/settings/DenominationsPage';
import RatesPage from './features/settings/RatesPage';

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
          <Route index path="/" element={<Home />} />

          <Route path="/profile" element={<UserProfiles />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/users/new" element={<UserFormPage />} />
          <Route path="/users/:userId" element={<UserFormPage />} />
          <Route
            path="/sales"
            element={
              <FuelRecordPage
                title="Daily sales"
                description="Capture opening and closing meter readings and reconcile litres sold by nozzle and shift."
                endpoint="/fuel/sales"
                fields={[
                  { name: 'stationId', label: 'Station', required: true },
                  { name: 'fuelTypeId', label: 'Fuel type', required: true },
                  { name: 'tankId', label: 'Tank', required: true },
                  {
                    name: 'saleType',
                    label: 'Sale type',
                    required: true,
                    options: [
                      { value: 'CASH', label: 'Cash' },
                      { value: 'CARD', label: 'Card / bank' },
                      { value: 'CREDIT', label: 'Credit' },
                    ],
                  },
                  { name: 'litres', label: 'Litres', type: 'number', required: true },
                  { name: 'unitPrice', label: 'Selling price per litre', type: 'number' },
                  { name: 'openingMeter', label: 'Opening meter', type: 'number' },
                  { name: 'closingMeter', label: 'Closing meter', type: 'number' },
                  { name: 'organizationId', label: 'Organization' },
                  { name: 'vehicleId', label: 'Vehicle' },
                ]}
              />
            }
          />
          <Route
            path="/fleet-sales"
            element={
              <FuelRecordPage
                title="Fleet sales"
                description="Issue fuel to an organization vehicle, post the credit sale, and keep its history traceable."
                endpoint="/fuel/sales"
                defaults={{ saleType: 'CREDIT' }}
                fields={[
                  { name: 'stationId', label: 'Station', required: true },
                  { name: 'fuelTypeId', label: 'Fuel type', required: true },
                  { name: 'tankId', label: 'Tank', required: true },
                  { name: 'organizationId', label: 'Organization', required: true },
                  { name: 'vehicleId', label: 'Vehicle', required: true },
                  { name: 'litres', label: 'Litres', type: 'number', required: true },
                  { name: 'unitPrice', label: 'Selling price per litre', type: 'number' },
                ]}
              />
            }
          />
          <Route
            path="/organizations"
            element={
              <FuelRecordPage
                title="Organizations"
                description="Manage credit customers, vehicles, limits, statements, and payment history."
                endpoint="/fuel/organizations"
                fields={[
                  { name: 'name', label: 'Organization name', required: true },
                  { name: 'contactName', label: 'Contact person' },
                  { name: 'phone', label: 'Phone' },
                  { name: 'email', label: 'Billing email', type: 'email' },
                  { name: 'address', label: 'Address' },
                  { name: 'paymentTerms', label: 'Payment terms' },
                  { name: 'creditLimit', label: 'Credit limit', type: 'number' },
                ]}
              />
            }
          />
          <Route
            path="/inventory"
            element={
              <FuelModulePage
                title="Inventory"
                description="Track tank stock, receipts, sales, adjustments, and physical reconciliation."
              />
            }
          />
          <Route
            path="/fuel-purchases"
            element={
              <FuelRecordPage
                title="Fuel purchases"
                description="Record tanker deliveries, landed cost, supplier balances, and stock increases."
                endpoint="/fuel/receipts"
                fields={[
                  { name: 'stationId', label: 'Station', required: true },
                  { name: 'supplier', label: 'Supplier', required: true },
                  { name: 'fuelTypeId', label: 'Fuel type', required: true },
                  { name: 'tankId', label: 'Tank', required: true },
                  { name: 'litres', label: 'Quantity in litres', type: 'number', required: true },
                  {
                    name: 'purchasePrice',
                    label: 'Purchase price per litre',
                    type: 'number',
                    required: true,
                  },
                  { name: 'tankerNumber', label: 'Tanker number' },
                  { name: 'invoiceNumber', label: 'Invoice number' },
                ]}
              />
            }
          />
          <Route path="/receiving" element={<Navigate to="/fuel-purchases" replace />} />
          <Route path="/assets" element={<Navigate to="/settings/tanks" replace />} />
          <Route path="/settings" element={<Navigate to="/settings/pump" replace />} />
          <Route path="/settings/pump" element={<PumpProfilePage />} />
          <Route path="/settings/products" element={<ProductsPage />} />
          <Route path="/settings/tanks" element={<TanksMetersPage />} />
          <Route path="/settings/denominations" element={<DenominationsPage />} />
          <Route path="/settings/rates" element={<RatesPage />} />
          <Route
            path="/customers"
            element={
              <FuelRecordPage
                title="Customers"
                description="Manage customer records, contacts, and account activity."
                endpoint="/fuel/organizations"
                fields={[
                  { name: 'name', label: 'Customer / organization name', required: true },
                  { name: 'contactName', label: 'Contact person' },
                  { name: 'phone', label: 'Phone' },
                  { name: 'email', label: 'Email', type: 'email' },
                  { name: 'address', label: 'Address' },
                ]}
              />
            }
          />
          <Route
            path="/vehicles"
            element={
              <FuelRecordPage
                title="Vehicles"
                description="Manage organization vehicles, drivers, fuel types, and vehicle history."
                endpoint={'/fuel/organizations/${organizationId}/vehicles'}
                fields={[
                  { name: 'organizationId', label: 'Organization', required: true },
                  { name: 'registration', label: 'Registration number', required: true },
                  { name: 'type', label: 'Vehicle type' },
                  { name: 'makeModel', label: 'Make / model' },
                  { name: 'driver', label: 'Driver' },
                  { name: 'notes', label: 'Notes' },
                ]}
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
              <FuelRecordPage
                title="Payments"
                description="Record customer payments and reconcile outstanding organization balances."
                endpoint="/fuel/payments"
                fields={[
                  { name: 'stationId', label: 'Station', required: true },
                  { name: 'organizationId', label: 'Organization', required: true },
                  { name: 'amount', label: 'Amount', type: 'number', required: true },
                  {
                    name: 'method',
                    label: 'Payment method',
                    required: true,
                    options: [
                      { value: 'CASH', label: 'Cash' },
                      { value: 'BANK', label: 'Bank' },
                      { value: 'CARD', label: 'Card' },
                      { value: 'TRANSFER', label: 'Transfer' },
                    ],
                  },
                  { name: 'reference', label: 'Reference' },
                ]}
              />
            }
          />
          <Route
            path="/expenses"
            element={
              <FuelRecordPage
                title="Expenses"
                description="Record station expenses, payment accounts, approvals, and receipts."
                endpoint="/fuel/expenses"
                fields={[
                  { name: 'stationId', label: 'Station', required: true },
                  { name: 'category', label: 'Category', required: true },
                  { name: 'description', label: 'Description', required: true },
                  { name: 'amount', label: 'Amount', type: 'number', required: true },
                  {
                    name: 'method',
                    label: 'Payment method',
                    required: true,
                    options: [
                      { value: 'CASH', label: 'Cash' },
                      { value: 'BANK', label: 'Bank' },
                      { value: 'CARD', label: 'Card' },
                      { value: 'TRANSFER', label: 'Transfer' },
                    ],
                  },
                  { name: 'reference', label: 'Reference' },
                ]}
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
