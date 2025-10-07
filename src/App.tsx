import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { motion } from 'framer-motion';

import Layout from './components/Layout/Layout';
import Login from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import Orders from './pages/Orders/Orders';
import Clients from './pages/Clients/Clients';
import InventoryPage from './pages/Inventory/Inventory';
import Employees from './pages/Employees/Employees';
import CashRegister from './pages/CashRegister/CashRegister';
import Reports from './pages/Reports/Reports';
import Settings from './pages/Settings/Settings';
import { useAuth } from './hooks/useAuth';

const App: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        bgcolor="background.default"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Box
            width={40}
            height={40}
            border="4px solid #f3f3f3"
            borderTop="4px solid #1976d2"
            borderRadius="50%"
          />
        </motion.div>
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <Layout>
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
    </Layout>
  );
};

export default App;
