import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';

import Layout from './components/Layout/Layout';
import { useAuth } from './hooks/useAuth';
import CashRegister from './pages/CashRegister/CashRegister';

const Login = lazy(() => import('./pages/Login/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard'));
const Orders = lazy(() => import('./pages/Orders/Orders'));
const Clients = lazy(() => import('./pages/Clients/Clients'));
const InventoryPage = lazy(() => import('./pages/Inventory/Inventory'));
const Employees = lazy(() => import('./pages/Employees/Employees'));
const Reports = lazy(() => import('./pages/Reports/Reports'));
const Settings = lazy(() => import('./pages/Settings/Settings'));

const pageLoader = (
  <Box
    display="flex"
    justifyContent="center"
    alignItems="center"
    minHeight="100vh"
    bgcolor="background.default"
  >
    <CircularProgress color="primary" />
  </Box>
);

const App: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return pageLoader;
  }

  if (!isAuthenticated) {
    return (
      <Suspense fallback={pageLoader}>
        <Login />
      </Suspense>
    );
  }

  return (
    <Layout>
      <Suspense fallback={pageLoader}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/cash-register" element={<CashRegister />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  );
};

export default App;
