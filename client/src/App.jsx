import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import ProtectedRoute, { PublicOnlyRoute } from './components/auth/ProtectedRoute';
import Spinner from './components/ui/Spinner';

// Lazy-loaded Auth Pages
const Login = lazy(() => import('./pages/Login'));

// Lazy-loaded Module Pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Purchases = lazy(() => import('./pages/Purchases'));
const NewPurchase = lazy(() => import('./pages/NewPurchase'));
const PurchaseDetail = lazy(() => import('./pages/PurchaseDetail'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Quotations = lazy(() => import('./pages/Quotations'));
const NewQuotation = lazy(() => import('./pages/NewQuotation'));
const QuotationDetail = lazy(() => import('./pages/QuotationDetail'));
const Billing = lazy(() => import('./pages/Billing'));
const NewInvoice = lazy(() => import('./pages/NewInvoice'));
const InvoiceDetail = lazy(() => import('./pages/InvoiceDetail'));
const Ledgers = lazy(() => import('./pages/Ledgers'));
const Settings = lazy(() => import('./pages/Settings'));

function PageLoader() {
  return (
    <div className="flex h-64 w-full items-center justify-center p-8">
      <Spinner size="lg" className="text-primary" />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public Only Auth Route */}
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <Login />
            </PublicOnlyRoute>
          }
        />

        {/* Protected Application Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="purchases" element={<Purchases />} />
            <Route path="purchases/new" element={<NewPurchase />} />
            <Route path="purchases/:id" element={<PurchaseDetail />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="quotations" element={<Quotations />} />
            <Route path="quotations/new" element={<NewQuotation />} />
            <Route path="quotations/:id" element={<QuotationDetail />} />
            <Route path="quotations/:id/edit" element={<NewQuotation />} />
            <Route path="billing" element={<Billing />} />
            <Route path="billing/new" element={<NewInvoice />} />
            <Route path="billing/:id" element={<InvoiceDetail />} />
            <Route path="ledgers" element={<Ledgers />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Route>

        {/* Catch-all Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
