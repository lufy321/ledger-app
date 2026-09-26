import React, { useState } from 'react';
import { authApi, setToken } from '../lib/api';
import { useTheme } from '../components/ThemeContext.jsx';

export default function Auth({ onLogin }) {
  const { theme, toggle } = useTheme();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const switchMode = (m) => {
    setMode(m);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('请输入邮箱');
      return;
    }
    if (mode === 'register' && !username.trim()) {
      setError('请输入用户名');
      return;
    }
    if (password.length < 6) {
      setError('密码至少 6 位');
      return;
    }

    setLoading(true);
    try {
      const data = mode === 'login'
        ? { email: email.trim(), password }
        : { email: email.trim(), username: username.trim(), password };

      const res = await (mode === 'login' ? authApi.login(data) : authApi.register(data));
      setToken(res.token);
      onLogin(res.token, res.user);
    } catch (err) {
      setError(err.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <button
        type="button"
        className="btn btn-icon auth-theme-toggle"
        onClick={toggle}
        title={theme === 'dark' ? '切换为日间模式' : '切换为夜间模式'}
      >
        <i className={`bi ${theme === 'dark' ? 'bi-sun' : 'bi-moon'}`} />
      </button>
      <div className="auth-glow auth-glow-1" aria-hidden />
      <div className="auth-glow auth-glow-2" aria-hidden />

      <div className="auth-card card">
        <div className="auth-header">
          <div className="auth-logo">
            <span aria-hidden>📒</span>
          </div>
          <h1 className="auth-title">记账本</h1>
          <p className="auth-subtitle">多端同步，随时随地记录收支</p>
        </div>

        <div className="auth-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => switchMode('login')}
          >
            登录
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'register'}
            className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => switchMode('register')}
          >
            注册
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="auth-error">{error}</div>}

          <div className="auth-field">
            <label className="auth-label" htmlFor="auth-email">邮箱</label>
            <div className="auth-input-wrap">
              <i className="bi bi-envelope auth-input-icon" aria-hidden />
              <input
                id="auth-email"
                type="email"
                className="form-control auth-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
          </div>

          {mode === 'register' && (
            <div className="auth-field">
              <label className="auth-label" htmlFor="auth-username">用户名</label>
              <div className="auth-input-wrap">
                <i className="bi bi-person auth-input-icon" aria-hidden />
                <input
                  id="auth-username"
                  type="text"
                  className="form-control auth-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="你的昵称"
                  autoComplete="nickname"
                  required
                />
              </div>
            </div>
          )}

          <div className="auth-field">
            <label className="auth-label" htmlFor="auth-password">密码</label>
            <div className="auth-input-wrap">
              <i className="bi bi-lock auth-input-icon" aria-hidden />
              <input
                id="auth-password"
                type="password"
                className="form-control auth-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'register' ? '至少 6 位' : '请输入密码'}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                required
              />
            </div>
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" />
                请稍候…
              </>
            ) : mode === 'login' ? '登 录' : '注 册'}
          </button>

          <p className="auth-switch-hint">
            {mode === 'login' ? '还没有账号？' : '已有账号？'}
            <a className="auth-switch-link" onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}>
              {mode === 'login' ? '去注册' : '去登录'}
            </a>
          </p>
        </form>
      </div>

      <div className="auth-footnote">
        <i className="bi bi-shield-check me-1" aria-hidden />
        数据加密存储，仅自己可见
      </div>
    </div>
  );
}
