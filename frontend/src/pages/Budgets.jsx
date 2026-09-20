import React, { useEffect, useState } from 'react';
import { budgetApi, categoryApi, fmtMoney, currentMonth } from '../lib/api';

export default function Budgets() {
  const [month, setMonth] = useState(currentMonth());
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ category_id: '', amount: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [b, c] = await Promise.all([
        budgetApi.list(month),
        categoryApi.list('expense'),
      ]);
      setBudgets(b);
      setCategories(c);
    } catch (e) {
      alert(e.message);
    }
  };

  useEffect(() => {
    load();
  }, [month]);

  const openCreate = () => {
    setForm({ category_id: '', amount: '' });
    setError('');
    setModal({ budget: null });
  };

  const openEdit = (b) => {
    setForm({ category_id: b.category_id || '', amount: String(b.amount) });
    setError('');
    setModal({ budget: b });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) {
      setError('请输入有效的预算金额');
      return;
    }
    const payload = {
      category_id: form.category_id || null,
      amount: parseFloat(form.amount),
      start_date: `${month}-01`,
      end_date: `${month}-31`,
    };
    setSaving(true);
    setError('');
    try {
      if (modal.budget) await budgetApi.update(modal.budget.id, payload);
      else await budgetApi.create(payload);
      setModal(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (b) => {
    if (!confirm('确定删除该预算吗？')) return;
    try {
      await budgetApi.remove(b.id);
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <h4 className="mb-0 fw-bold">
          <i className="bi bi-pie-chart me-2 text-primary" />
          预算
        </h4>
        <div className="d-flex gap-2 align-items-center">
          <input type="month" className="form-control form-control-sm" style={{ width: 160 }} value={month} onChange={(e) => setMonth(e.target.value)} />
          <button className="btn btn-sm btn-primary" onClick={openCreate}>
            <i className="bi bi-plus-lg me-1" />
            新建预算
          </button>
        </div>
      </div>

      <div className="row g-3">
        {budgets.map((b) => {
          const pct = Math.min((b.spent / b.amount) * 100, 100);
          const over = b.spent > b.amount;
          const remaining = b.amount - b.spent;
          return (
            <div key={b.id} className="col-12 col-md-6 col-lg-4">
              <div className="card p-3 h-100">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="fw-bold">
                    {b.category_name ? `📂 ${b.category_name}` : '总预算'}
                  </span>
                  <div className="d-flex gap-1">
                    <button className="btn btn-sm btn-light" onClick={() => openEdit(b)}>
                      <i className="bi bi-pencil" />
                    </button>
                    <button className="btn btn-sm btn-light text-danger" onClick={() => handleDelete(b)}>
                      <i className="bi bi-trash" />
                    </button>
                  </div>
                </div>
                <div className="d-flex justify-content-between small mb-1">
                  <span className={over ? 'text-danger' : 'text-success'}>
                    {over ? '超支' : '剩余'} {fmtMoney(Math.abs(remaining))}
                  </span>
                  <span className="text-secondary">{pct.toFixed(0)}%</span>
                </div>
                <div className="budget-bar" style={{ height: 12 }}>
                  <div className="budget-bar-fill" style={{ width: `${pct}%`, background: over ? '#ff6b6b' : '#51cf66' }} />
                </div>
                <div className="d-flex justify-content-between small mt-2 text-secondary">
                  <span>已用 {fmtMoney(b.spent)}</span>
                  <span>预算 {fmtMoney(b.amount)}</span>
                </div>
              </div>
            </div>
          );
        })}
        {budgets.length === 0 && (
          <div className="col-12 text-center text-secondary py-5">
            <i className="bi bi-pie-chart fs-1 d-block mb-2" />
            该月暂无预算
          </div>
        )}
      </div>

      {modal && (
        <div className="modal fade show d-block" style={{ zIndex: 1060 }} onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content" style={{ borderRadius: 12 }}>
              <div className="modal-header">
                <h5 className="modal-title fw-bold">{modal.budget ? '编辑预算' : '新建预算'}</h5>
                <button className="btn-close" onClick={() => setModal(null)} />
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body">
                  {error && <div className="alert alert-danger py-2">{error}</div>}
                  <div className="mb-3">
                    <label className="form-label fw-bold">预算月份</label>
                    <input type="month" className="form-control" value={month} disabled />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold">关联分类（可选）</label>
                    <select className="form-select" value={form.category_id} onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}>
                      <option value="">不关联（总预算）</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold">预算金额</label>
                    <input type="number" step="0.01" min="0" className="form-control" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="如 3000" required />
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
