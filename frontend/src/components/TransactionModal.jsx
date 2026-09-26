import React, { useEffect, useState } from 'react';
import { txApi, accountApi, categoryApi, today } from '../lib/api';

export default function TransactionModal({ transaction, onSaved, onClose }) {
  const [type, setType] = useState(transaction?.type || 'expense');
  const [amount, setAmount] = useState(transaction?.amount != null ? String(transaction.amount) : '');
  const [categoryId, setCategoryId] = useState(transaction?.category_id || '');
  const [accountId, setAccountId] = useState(transaction?.account_id || '');
  const [toAccountId, setToAccountId] = useState('');
  const [description, setDescription] = useState(transaction?.description || '');
  const [tags, setTags] = useState(transaction?.tags ? parseTags(transaction.tags) : []);
  const [date, setDate] = useState(transaction?.date || today());
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    accountApi.list().then(setAccounts).catch(() => {});
  }, []);

  useEffect(() => {
    if (type === 'transfer') {
      setCategories([]);
      return;
    }
    setCategoryId('');
    categoryApi.list(type).then(setCategories).catch(() => {});
  }, [type]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setError('请输入有效金额');
      return;
    }
    if (type === 'transfer') {
      if (!accountId || !toAccountId) {
        setError('请选择转出和转入账户');
        return;
      }
      if (accountId === toAccountId) {
        setError('不能转入同一账户');
        return;
      }
    } else if (!categoryId && !accountId) {
      setError('请选择分类或账户');
      return;
    }

    setSaving(true);
    setError('');
    try {
      if (type === 'transfer') {
        await txApi.transfer({
          from_account_id: accountId,
          to_account_id: toAccountId,
          amount: amt,
          description,
          date,
        });
      } else if (transaction?.id) {
        await txApi.update(transaction.id, {
          type,
          amount: amt,
          category_id: categoryId || null,
          account_id: accountId || null,
          description,
          tags: tags.length ? tags : null,
          date,
        });
      } else {
        await txApi.create({
          type,
          amount: amt,
          category_id: categoryId || null,
          account_id: accountId || null,
          description,
          tags: tags.length ? tags : null,
          date,
        });
      }
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const typeBtns = [
    { v: 'expense', label: '支出', icon: 'bi-arrow-down-left', color: 'var(--expense)' },
    { v: 'income', label: '收入', icon: 'bi-arrow-up-right', color: 'var(--income)' },
    { v: 'transfer', label: '转账', icon: 'bi-arrow-left-right', color: 'var(--primary)' },
  ];

  return (
    <div
      className="modal fade show d-block tx-modal"
      tabIndex={-1}
      role="dialog"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-dialog modal-dialog-centered modal-fullscreen-sm-down tx-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content" style={{ borderRadius: 12 }}>
          <div className="modal-header" style={{ borderRadius: '12px 12px 0 0' }}>
            <h5 className="modal-title fw-bold">{transaction?.id ? '编辑记录' : '记一笔'}</h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
              {error && <div className="alert alert-danger py-2 mb-3">{error}</div>}

              <div className="btn-group w-100 mb-3" role="group">
                {typeBtns.map((t) => (
                  <button
                    key={t.v}
                    type="button"
                    className={`btn flex-fill ${type === t.v ? 'text-white' : 'btn-outline-secondary'}`}
                    style={
                      type === t.v
                        ? { background: t.color, borderColor: t.color }
                        : {}
                    }
                    onClick={() => setType(t.v)}
                  >
                    <i className={`bi ${t.icon} me-1`} />
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="mb-3">
                <label className="form-label fw-bold">金额</label>
                <div className="input-group">
                  <span className="input-group-text">¥</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    className="form-control form-control-lg"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
              </div>

              {type === 'transfer' ? (
                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <label className="form-label fw-bold">从</label>
                    <select className="form-select" value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
                      <option value="">选择账户</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.icon} {a.name}（{fmt(a.balance)}）
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-6">
                    <label className="form-label fw-bold">到</label>
                    <select className="form-select" value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} required>
                      <option value="">选择账户</option>
                      {accounts
                        .filter((a) => a.id !== accountId)
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.icon} {a.name}（{fmt(a.balance)}）
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-3">
                    <label className="form-label fw-bold">分类</label>
                    <div className="d-flex flex-wrap gap-2">
                      {categories.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          title={c.name}
                          className="btn rounded-3"
                          style={{
                            width: 46,
                            height: 46,
                            fontSize: '1.2rem',
                            background: categoryId === c.id ? c.color : c.color + '1f',
                            border: `2px solid ${categoryId === c.id ? c.color : 'transparent'}`,
                          }}
                          onClick={() => setCategoryId(categoryId === c.id ? '' : c.id)}
                        >
                          {c.icon}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold">账户</label>
                    <select className="form-select" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                      <option value="">未指定</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.icon} {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div className="mb-3">
                <label className="form-label fw-bold">备注</label>
                <input
                  type="text"
                  className="form-control"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="选填"
                  maxLength={200}
                />
              </div>

              <div className="row g-2">
                <div className="col-6">
                  <label className="form-label fw-bold">日期</label>
                  <input type="date" className="form-control" value={date} onChange={(e) => setDate(e.target.value)} required />
                </div>
                <div className="col-6">
                  <label className="form-label fw-bold">标签</label>
                  <input
                    type="text"
                    className="form-control"
                    value={tags.join(', ')}
                    onChange={(e) => setTags(e.target.value.split(/[,，]/).map((s) => s.trim()).filter(Boolean))}
                    placeholder="逗号分隔"
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ borderRadius: '0 0 12px 12px' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                取消
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function parseTags(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') {
    try {
      const p = JSON.parse(v);
      return Array.isArray(p) ? p : [];
    } catch {
      return v ? v.split(/[,，]/).map((s) => s.trim()).filter(Boolean) : [];
    }
  }
  return [];
}

function fmt(n) {
  return (Number(n) || 0).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
