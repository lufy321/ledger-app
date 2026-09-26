import React, { useEffect, useState } from 'react';
import { accountApi, fmtMoney } from '../lib/api';
import { useTheme } from '../components/ThemeContext.jsx';

const TYPES_LIGHT = {
  cash: { label: '现金', color: '#51cf66', defaultIcon: '💵' },
  alipay: { label: '支付宝', color: '#339af0', defaultIcon: '📱' },
  wechat: { label: '微信', color: '#20c997', defaultIcon: '💬' },
  bank: { label: '银行卡', color: '#ffa94d', defaultIcon: '🏦' },
  credit: { label: '信用卡', color: '#845ef7', defaultIcon: '💳' },
  other: { label: '其他', color: '#868e96', defaultIcon: '💰' },
};

const TYPES_DARK = {
  cash: { label: '现金', color: '#69db7c', defaultIcon: '💵' },
  alipay: { label: '支付宝', color: '#4dabf7', defaultIcon: '📱' },
  wechat: { label: '微信', color: '#38d9a9', defaultIcon: '💬' },
  bank: { label: '银行卡', color: '#ffa94a', defaultIcon: '🏦' },
  credit: { label: '信用卡', color: '#9775fa', defaultIcon: '💳' },
  other: { label: '其他', color: '#868e96', defaultIcon: '💰' },
};

const ICONS = ['💵', '📱', '💬', '🏦', '💳', '💰', '🏠', '🎮'];

export default function Accounts() {
  const TYPES = useTheme().theme === 'dark' ? TYPES_DARK : TYPES_LIGHT;
  const [accounts, setAccounts] = useState([]);
  const [modal, setModal] = useState(null); // {account, form}
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setAccounts(await accountApi.list());
    } catch (e) {
      alert(e.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setModal({
      account: null,
      form: { name: '', type: 'bank', icon: TYPES.bank.defaultIcon, balance: '' },
    });
    setError('');
  };

  const openEdit = (a) => {
    setModal({
      account: a,
      form: { name: a.name, type: a.type, icon: a.icon || TYPES[a.type]?.defaultIcon, balance: String(a.balance ?? 0) },
    });
    setError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const f = modal.form;
    if (!f.name.trim()) {
      setError('请输入账户名称');
      return;
    }
    const payload = {
      name: f.name.trim(),
      type: f.type,
      icon: f.icon,
      balance: parseFloat(f.balance) || 0,
    };
    setSaving(true);
    setError('');
    try {
      if (modal.account) await accountApi.update(modal.account.id, payload);
      else await accountApi.create(payload);
      setModal(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (a) => {
    if (!confirm(`确定删除账户「${a.name}」吗？`)) return;
    try {
      await accountApi.remove(a.id);
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  const total = accounts.reduce((s, a) => s + (a.balance || 0), 0);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0 fw-bold">
          <i className="bi bi-wallet2 me-2 text-primary" />
          账户
          <span className="ms-2 badge bg-light text-secondary">{fmtMoney(total)} 总余额</span>
        </h4>
        <button className="btn btn-sm btn-primary" onClick={openCreate}>
          <i className="bi bi-plus-lg me-1" />
          新建账户
        </button>
      </div>

      <div className="row g-3">
        {accounts.map((a) => {
          const t = TYPES[a.type] || TYPES.other;
          return (
            <div key={a.id} className="col-6 col-md-4 col-lg-3">
              <div className="card p-3 h-100 account-card" style={{ borderLeft: `4px solid ${t.color}` }} onClick={() => openEdit(a)}>
                <div className="d-flex justify-content-between align-items-start">
                  <span style={{ fontSize: '1.6rem' }}>{a.icon || t.defaultIcon}</span>
                  <div className="d-flex gap-1">
                    <button className="btn btn-sm btn-light" onClick={(e) => { e.stopPropagation(); openEdit(a); }}>
                      <i className="bi bi-pencil" />
                    </button>
                    <button className="btn btn-sm btn-light text-danger" onClick={(e) => { e.stopPropagation(); handleDelete(a); }}>
                      <i className="bi bi-trash" />
                    </button>
                  </div>
                </div>
                <div className="mt-2">
                  <div className="fw-bold text-truncate">{a.name}</div>
                  <div className="small text-secondary">{t.label}</div>
                </div>
                <div className={`mt-2 fw-bold ${a.balance < 0 ? 'text-danger' : ''}`}>{fmtMoney(a.balance)}</div>
              </div>
            </div>
          );
        })}
        {accounts.length === 0 && (
          <div className="col-12 text-center text-secondary py-5">
            <i className="bi bi-wallet2 fs-1 d-block mb-2" />
            还没有账户
          </div>
        )}
      </div>

      {modal && (
        <div className="modal fade show d-block" style={{ zIndex: 1060 }} onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content" style={{ borderRadius: 12 }}>
              <div className="modal-header">
                <h5 className="modal-title fw-bold">{modal.account ? '编辑账户' : '新建账户'}</h5>
                <button className="btn-close" onClick={() => setModal(null)} />
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body">
                  {error && <div className="alert alert-danger py-2">{error}</div>}
                  <div className="mb-3">
                    <label className="form-label fw-bold">名称</label>
                    <input className="form-control" value={modal.form.name} onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, name: e.target.value } }))} placeholder="如：招商银行" required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold">类型</label>
                    <div className="d-flex gap-2 flex-wrap">
                      {Object.entries(TYPES).map(([k, t]) => (
                        <button key={k} type="button" className={`btn btn-sm ${modal.form.type === k ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setModal((m) => ({ ...m, form: { ...m.form, type: k, icon: t.defaultIcon } }))}>
                          {t.defaultIcon} {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold">图标</label>
                    <div className="d-flex gap-2 flex-wrap">
                      {ICONS.map((ic) => (
                        <button key={ic} type="button" className="btn rounded-3" style={{ width: 44, height: 44, fontSize: '1.2rem', background: modal.form.icon === ic ? '#339af0' : '#e9ecef' }} onClick={() => setModal((m) => ({ ...m, form: { ...m.form, icon: ic } }))}>
                          {ic}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold">初始/当前余额</label>
                    <input type="number" step="0.01" className="form-control" value={modal.form.balance} onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, balance: e.target.value } }))} placeholder="0.00" />
                    <div className="form-text">编辑时直接修改余额（不经过记账），用于手动校准。</div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>取消</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? '保存中...' : '保存'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
