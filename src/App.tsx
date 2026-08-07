import React, { Suspense, useEffect, useMemo, useState } from 'react';

import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

import { Alert, Box, CircularProgress } from '@mui/material';

import Layout from './components/Layout/Layout';

import { useAuth } from './hooks/useAuth';

import { getFirstAllowedRoute, hasEmployeeSettingsAccess, isModuleAllowed } from './utils/employeeModuleAccess';

import { appSettingsService, isOnboardingRequired, SETTINGS_UPDATED_EVENT } from './services/appSettingsService';
import { isCrmAccessBlocked } from './utils/tenantAccess';

import { lazyWithRetry } from './utils/lazyWithRetry';

const Landing = lazyWithRetry(() => import('./pages/Landing/Landing'));

const Register = lazyWithRetry(() => import('./pages/Register/Register'));

const YandexCallback = lazyWithRetry(() => import('./pages/Auth/YandexCallback'));

const VerifyEmail = lazyWithRetry(() => import('./pages/VerifyEmail/VerifyEmail'));

const Login = lazyWithRetry(() => import('./pages/Login/Login'));

const Subscribe = lazyWithRetry(() => import('./pages/Subscribe/Subscribe'));

const PlatformAdmin = lazyWithRetry(() => import('./pages/PlatformAdmin/PlatformAdmin'));

const Onboarding = lazyWithRetry(() => import('./pages/Onboarding/Onboarding'));

const Dashboard = lazyWithRetry(() => import('./pages/Dashboard/Dashboard'));

const Orders = lazyWithRetry(() => import('./pages/Orders/Orders'));

const Clients = lazyWithRetry(() => import('./pages/Clients/Clients'));

const InventoryPage = lazyWithRetry(() => import('./pages/Inventory/Inventory'));

const Employees = lazyWithRetry(() => import('./pages/Employees/Employees'));

const Reports = lazyWithRetry(() => import('./pages/Reports/Reports'));

const Settings = lazyWithRetry(() => import('./pages/Settings/Settings'));

const MyProfile = lazyWithRetry(() => import('./pages/MyProfile/MyProfile'));

const Messages = lazyWithRetry(() => import('./pages/Messages/Messages'));

const CashRegister = lazyWithRetry(() => import('./pages/CashRegister/CashRegister'));


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



const Forbidden: React.FC = () => (

  <Box sx={{ p: 4, maxWidth: 600, mx: 'auto', mt: 4 }}>

    <Alert severity="error">

      Доступ запрещён. Эта страница доступна только администратору.

    </Alert>

  </Box>

);



const RequireSettingsAccess: React.FC<{ children: React.ReactNode }> = ({ children }) => {

  const { user } = useAuth();

  if (!hasEmployeeSettingsAccess(user)) {

    return <Forbidden />;

  }

  return <>{children}</>;

};



const RequireAdmin: React.FC<{ children: React.ReactNode }> = ({ children }) => {

  const { user } = useAuth();

  if (user?.role !== 'admin') {

    return <Forbidden />;

  }

  return <>{children}</>;

};



const RequirePlatformAdmin: React.FC<{ children: React.ReactNode }> = ({ children }) => {

  const { user } = useAuth();

  if (!user?.isPlatformAdmin) {

    return <Forbidden />;

  }

  return <>{children}</>;

};



const RequireModuleAccess: React.FC<{ path: string; children: React.ReactNode }> = ({ path, children }) => {

  const { user } = useAuth();

  if (!isModuleAllowed(user, path)) {

    return <Navigate to={getFirstAllowedRoute(user)} replace />;

  }

  return <>{children}</>;

};



const HomeRedirect: React.FC = () => {

  const { user } = useAuth();

  return <Navigate to={getFirstAllowedRoute(user)} replace />;

};



const needsSubscription = (user: ReturnType<typeof useAuth>['user']) => isCrmAccessBlocked(user);



const App: React.FC = () => {

  const { isAuthenticated, isLoading, user } = useAuth();

  const location = useLocation();

  const [settingsRevision, setSettingsRevision] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const handleSettingsUpdated = () => {
      setSettingsRevision((revision) => revision + 1);
    };

    window.addEventListener(SETTINGS_UPDATED_EVENT, handleSettingsUpdated);
    return () => {
      window.removeEventListener(SETTINGS_UPDATED_EVENT, handleSettingsUpdated);
    };
  }, [isAuthenticated, user?.tenantId]);

  const shouldShowOnboarding = useMemo(
    () =>
      user?.role === 'admin' &&
      !user?.isPlatformAdmin &&
      isOnboardingRequired(appSettingsService.getSettings()),
    [user?.role, user?.isPlatformAdmin, user?.tenantId, settingsRevision]
  );



  if (isLoading) {

    return pageLoader;

  }



  const publicPaths = ['/', '/welcome', '/login', '/register', '/verify-email', '/auth/yandex/callback'];

  const isPublicRoute = publicPaths.includes(location.pathname);



  if (!isAuthenticated) {

    return (

      <Suspense fallback={pageLoader}>

        <Routes>

          <Route path="/" element={<Landing />} />

          <Route path="/welcome" element={<Landing />} />

          <Route path="/register" element={<Register />} />

          <Route path="/auth/yandex/callback" element={<YandexCallback />} />

          <Route path="/verify-email" element={<VerifyEmail />} />

          <Route path="/login" element={<Login />} />

          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>

      </Suspense>

    );

  }



  if (needsSubscription(user) && location.pathname !== '/subscribe') {

    return (

      <Suspense fallback={pageLoader}>

        <Subscribe />

      </Suspense>

    );

  }



  if (location.pathname === '/onboarding') {

    if (!shouldShowOnboarding && user?.role === 'admin') {

      return <Navigate to={getFirstAllowedRoute(user)} replace />;

    }

    if (user?.role !== 'admin') {

      return <Navigate to={getFirstAllowedRoute(user)} replace />;

    }

    return (

      <Suspense fallback={pageLoader}>

        <Onboarding />

      </Suspense>

    );

  }



  if (shouldShowOnboarding) {

    return <Navigate to="/onboarding" replace />;

  }



  if (isPublicRoute) {

    return <Navigate to={user?.isPlatformAdmin ? '/platform-admin' : getFirstAllowedRoute(user)} replace />;

  }



  return (

    <Layout>

      <Suspense fallback={pageLoader}>

        <Routes>

          <Route path="/" element={<HomeRedirect />} />

          <Route path="/subscribe" element={<Subscribe embedded />} />

          <Route

            path="/platform-admin"

            element={

              <RequirePlatformAdmin>

                <PlatformAdmin />

              </RequirePlatformAdmin>

            }

          />

          <Route path="/dashboard" element={<RequireModuleAccess path="/dashboard"><Dashboard /></RequireModuleAccess>} />

          <Route path="/orders" element={<RequireModuleAccess path="/orders"><Orders /></RequireModuleAccess>} />

          <Route path="/messages" element={<RequireModuleAccess path="/messages"><Messages /></RequireModuleAccess>} />

          <Route path="/clients" element={<RequireModuleAccess path="/clients"><Clients /></RequireModuleAccess>} />

          <Route path="/inventory" element={<RequireModuleAccess path="/inventory"><InventoryPage /></RequireModuleAccess>} />

          <Route path="/employees" element={<RequireModuleAccess path="/employees"><Employees /></RequireModuleAccess>} />

          <Route path="/cash-register" element={<RequireModuleAccess path="/cash-register"><CashRegister /></RequireModuleAccess>} />

          <Route path="/reports" element={<RequireModuleAccess path="/reports"><Reports /></RequireModuleAccess>} />

          <Route path="/my-profile" element={<RequireModuleAccess path="/my-profile"><MyProfile /></RequireModuleAccess>} />

          <Route

            path="/settings"

            element={

              <RequireSettingsAccess>

                <Settings />

              </RequireSettingsAccess>

            }

          />

          <Route path="*" element={<HomeRedirect />} />

        </Routes>

      </Suspense>

    </Layout>

  );

};



export default App;

