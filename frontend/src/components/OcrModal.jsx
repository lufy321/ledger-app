import React, { useEffect, useState } from 'react';
import { txApi, accountApi, categoryApi, today, fmtMoney } from '../lib/api';

export default function OcrModal({ result, onSaved, onClose }) {
  const [items, setItems] = useState(() =>
    (result?.transactions || []).map((t, i) => ({
      _key: i,
      type: t.type === 'income' ? 'income' : 'expense',
      amount: t.amount != null ? String(t.amount) : '',
      categoryId: '',
      accountId: '',
      description: t.description || '',
      date: t.date || today(),
      enabled: true,
    }))
  );
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    accountApi.list().then(setAccounts).catch(() => {});
  }, []);

  useEffect(() => {
    categoryApi.list().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const update = (key, field, value) => {
    setItems((prev) => prev.map((it) => (it._key === key ? { ...it, [field]: value } : it)));
  };

  const validItems = items.filter((it) => it.enabled && parseFloat(it.amount) > 0);
  const totalAmount = validItems.reduce((s, it) => s + (parseFloat(it.amount) || 0), 0);

  const handleSave = async () => {
    if (validItems.length === 0) {
      setError('至少需要一条有效记录');
      return;
    }
    setSaving(true);
    setError('');
    let ok = 0, fail = 0;
    for (const it of validItems) {
      try {
        await txApi.create({
          type: it.type,
          amount: parseFloat(it.amount),
          category_id: it.categoryId || null,
          account_id: it.accountId || null,
          description: it.description,
          date: it.date,
        });
        ok++;
      } catch (e) {
        fail++;
      }
    }
    setSaving(false);
    if (fail > 0) {
      setError(`已保存 ${ok} 条，失败 ${fail} 条`);
      onSaved?.();
    } else {
      onSaved?.();
      onClose();
    }
  };

  return (
    <div
      className="modal fade show d-block tx-modal"
      tabIndex={-1}
      role="dialog"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-dialog modal-dialog-centered modal-lg tx-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content" style={{ borderRadius: 12 }}>
          <div className="modal-header" style={{ borderRadius: '12px 12px 0 0' }}>
            <h5 className="modal-title fw-bold">
              <i className="bi bi-camera me-2 text-success" />
              图片识别结果
            </h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {error && <div className="alert alert-danger py-2 mb-3">{error}</div>}

            {result?.text && (
              <div className="mb-3">
                <label className="form-label fw-bold">识别文本</label>
                <pre className="bg-light p-2 rounded small" style={{ whiteSpace: 'pre-wrap', maxWidth: '100%' }}>
                  {result.text}
                </pre>
              </div>
            )}

            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="fw-bold">共识别 {items.length} 条记录</span>
              <span className="text-secondary small">合计 {fmtMoney(totalAmount)}</span>
            </div>

            {items.map((it) => {
              const cats = categories.filter((c) => c.type === it.type);
              return (
                <div
                  key={it._key}
                  className={`card mb-2 p-2 ${it.enabled ? '' : 'opacity-50'}`}
                  style={{ cursor: it.enabled ? 'default' : 'not-allowed' }}
                >
                  <div className="row g-2 align-items-center">
                    <div className="col-auto">
                      <input
                        type="checkbox"
                        checked={it.enabled}
                        onChange={(e) => update(it._key, 'enabled', e.target.checked)}
                      />
                    </div>
                    <div className="col-3 col-md-2">
                      <select
                        className="form-select form-select-sm"
                        value={it.type}
                        disabled={!it.enabled}
                        onChange={(e) => update(it._key, 'type', e.target.value)}
                      >
                        <option value="expense">支出</option>
                        <option value="income">收入</option>
                      </select>
                    </div>
                    <div className="col-4 col-md-3">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-control form-control-sm"
                        placeholder="金额"
                        value={it.amount}
                        disabled={!it.enabled}
                        onChange={(e) => update(it._key, 'amount', e.target.value)}
                      />
                    </div>
                    <div className="col-5 col-md-3">
                      <select
                        className="form-select form-select-sm"
                        value={it.categoryId}
                        disabled={!it.enabled}
                        onChange={(e) => update(it._key, 'categoryId', e.target.value)}
                      >
                        <option value="">未分类</option>
                        {cats.map((c) => (
                          <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-6 col-md-3">
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        value={it.date}
                        disabled={!it.enabled}
                        onChange={(e) => update(it._key, 'date', e.target.value)}
                      />
                    </div>
                    <div className="col-6 col-md-4">
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="备注"
                        value={it.description}
                        disabled={!it.enabled}
                        maxLength={100}
                        onChange={(e) => update(it._key, 'description', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="modal-footer" style={{ borderRadius: '0 0 12px 12px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              取消
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving || validItems.length === 0}>
              {saving ? '保存中...' : `保存 ${validItems.length} 条记录`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
