import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../App.jsx';
import { useTheme } from './ThemeContext.jsx';

const NAV = [
  { to: '/', icon: 'bi-speedometer2', label: '首页' },
  { to: '/transactions', icon: 'bi-list-ul', label: '账本' },
  { to: '/accounts', icon: 'bi-wallet2', label: '账户' },
  { to: '/budgets', icon: 'bi-pie-chart', label: '预算' },
  { to: '/categories', icon: 'bi-tags', label: '分类' },
  { to: '/stats', icon: 'bi-bar-chart', label: '统计' },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const doLogout = () => {
    logout();
    setMenuOpen(false);
    navigate('/login');
  };

  return (
    <div className="d-flex">
      {/* Desktop sidebar */}
      <div className="sidebar d-none d-lg-flex flex-column" style={{ width: 220 }}>
        <div className="p-3 d-flex align-items-center gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="fs-3">📒</span>
          <span className="fw-bold fs-5">记账本</span>
          <button
            type="button"
            className="btn btn-icon ms-auto"
            onClick={toggle}
            title={theme === 'dark' ? '切换为日间模式' : '切换为夜间模式'}
          >
            <i className={`bi ${theme === 'dark' ? 'bi-sun' : 'bi-moon'}`} />
          </button>
        </div>
        <nav className="flex-grow-1 p-2">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `d-flex align-items-center gap-2 px-3 py-2 rounded-3 mb-1 text-decoration-none ${
                  isActive ? 'bg-primary text-white' : 'text-secondary'
                }`
              }
            >
              <i className={`bi ${item.icon}`} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="d-flex justify-content-between align-items-center">
            <div className="text-truncate" title={user.username}>
              <i className="bi bi-person-circle me-1" />
              {user.username}
            </div>
            <button className="btn btn-link btn-sm p-0" onClick={doLogout} title="退出登录">
              <i className="bi bi-box-arrow-right" />
            </button>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="flex-grow-1 d-flex flex-column" style={{ minHeight: '100vh' }}>
        {/* Mobile top bar */}
        <div
          className="mobile-topbar d-lg-none d-flex align-items-center justify-content-between px-3"
        >
          <span className="fw-bold">
            <span className="me-1">📒</span>记账本
          </span>
          <div className="d-flex align-items-center gap-1">
            <button
              type="button"
              className="btn btn-icon"
              onClick={toggle}
              title={theme === 'dark' ? '切换为日间模式' : '切换为夜间模式'}
            >
              <i className={`bi ${theme === 'dark' ? 'bi-sun' : 'bi-moon'}`} />
            </button>
            <button
              type="button"
              className={`mobile-menu-btn btn btn-icon ${menuOpen ? 'active' : ''}`}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <i className="bi bi-list" />
            </button>
          </div>

          {menuOpen && (
            <>
              <div
                className="mobile-menu-overlay"
                onClick={() => setMenuOpen(false)}
                aria-hidden
              />
              <div className="mobile-menu shadow" id="mobile-menu" role="menu">
                {NAV.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      `mobile-menu-item ${isActive ? 'active' : ''}`
                    }
                    onClick={() => setMenuOpen(false)}
                  >
                    <i className={`bi ${item.icon} me-2`} />
                    {item.label}
                  </NavLink>
                ))}
                <hr className="my-1" />
                <button className="mobile-menu-item" onClick={toggle}>
                  <i className={`bi ${theme === 'dark' ? 'bi-sun' : 'bi-moon'} me-2`} />
                  {theme === 'dark' ? '日间模式' : '夜间模式'}
                </button>
                <hr className="my-1" />
                <button className="mobile-menu-item" onClick={doLogout}>
                  <i className="bi bi-box-arrow-right me-2" />
                  退出登录
                </button>
              </div>
            </>
          )}
        </div>

        <main className="flex-grow-1 page">
          <div className="mobile-fab-area d-lg-none" />
          {children}
        </main>

        {/* Mobile bottom tab bar */}
        <nav className="mobile-bottomnav d-lg-none d-flex">
          {NAV.slice(0, 5).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}
            >
              <i className={`bi ${item.icon}`} />
              <span>{item.label}</span>
            </NavLink>
          ))}
          <NavLink to="/stats" className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}>
            <i className="bi bi-bar-chart" />
            <span>统计</span>
          </NavLink>
        </nav>

        {/* Mobile FAB for quick entry */}
        <button
          type="button"
          className="fab d-lg-none"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('ledger:quick-add'));
          }}
          aria-label="记一笔"
        >
          <i className="bi bi-plus-lg" />
        </button>
      </div>
    </div>
  );
}
