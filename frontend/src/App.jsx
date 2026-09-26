import React, { createContext, useContext, useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { authApi, isLoggedIn } from './lib/api';

import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Transactions from './pages/Transactions.jsx';
import Accounts from './pages/Accounts.jsx';
import Budgets from './pages/Budgets.jsx';
import Categories from './pages/Categories.jsx';
import Stats from './pages/Stats.jsx';
import Auth from './pages/Auth.jsx';
import { ThemeProvider } from './components/ThemeContext.jsx';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const location = useLocation();

  useEffect(() => {
    if (!isLoggedIn()) {
      setChecking(false);
      return;
    }
    authApi
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, [location.pathname]);

  const login = (token, u) => {
    setUser(u);
    // token already saved by api.js
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
  };

  return (
    <ThemeProvider>
      {checking ? (
        <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">加载中...</span>
          </div>
        </div>
      ) : !user ? (
        <Auth onLogin={login} />
      ) : (
        <AuthCtx.Provider value={{ user, login, logout }}>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/accounts" element={<Accounts />} />
              <Route path="/budgets" element={<Budgets />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/stats" element={<Stats />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </AuthCtx.Provider>
      )}
    </ThemeProvider>
  );
}
