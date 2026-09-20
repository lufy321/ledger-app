import React, { useState } from 'react';
import { authApi, setToken } from '../lib/api';

export default function Auth({ onLogin }) {
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
      <div className="auth-card">
        <div className="text-center mb-4">
          <div style={{ fontSize: '3rem' }}>📒</div>
          <h3 className="fw-bold mt-2 mb-0">记账本</h3>
          <p className="text-secondary small mb-0">多端同步，随时随地记录收支</p>
        </div>

        <div className="btn-group w-100 mb-3" role="group">
          <button
            type="button"
            className={`btn flex-fill ${mode === 'login' ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => switchMode('login')}
          >
            登录
          </button>
          <button
            type="button"
            className={`btn flex-fill ${mode === 'register' ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => switchMode('register')}
          >
            注册
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="alert alert-danger py-2 small">{error}</div>}

          <div className="mb-3">
            <label className="form-label fw-bold">邮箱</label>
            <input
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          {mode === 'register' && (
            <div className="mb-3">
              <label className="form-label fw-bold">用户名</label>
              <input
                type="text"
                className="form-control"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="你的昵称"
                required
              />
            </div>
          )}

          <div className="mb-3">
            <label className="form-label fw-bold">密码</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'register' ? '至少 6 位' : '请输入密码'}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary w-100" disabled={loading}>
            {loading ? '...' : mode === 'login' ? '登录' : '注册'}
          </button>
        </form>
      </div>
    </div>
  );
}
