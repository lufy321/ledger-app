import React, { useEffect, useState } from 'react';
import { categoryApi } from '../lib/api';

const COLORS = ['#ff6b6b', '#ffa94d', '#845ef7', '#339af0', '#f06595', '#20c997', '#7952b3', '#4dabf7', '#51cf66', '#94d82d', '#12b886', '#63e6be', '#adb5bd', '#fa5252', '#e8590c', '#6741d9'];
const ICONS = ['🍜', '🚗', '🛒', '🏠', '🎮', '💊', '📚', '📱', '💰', '🎁', '📈', '💵', '🏷️', '☕', '✈️', '🎓', '💻', '🎬', '🐱', '⚽'];

export default function Categories() {
  const [tab, setTab] = useState('expense');
  const [categories, setCategories] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: '', icon: '🏷️', color: COLORS[0] });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setCategories(await categoryApi.list(tab));
    } catch (e) {
      alert(e.message);
    }
  };

  useEffect(() => {
    load();
  }, [tab]);

  const openCreate = () => {
    setForm({ name: '', icon: '🏷️', color: COLORS[0] });
    setError('');
    setModal({ category: null });
  };

  const openEdit = (c) => {
    setForm({ name: c.name, icon: c.icon || '🏷️', color: c.color || COLORS[0] });
    setError('');
    setModal({ category: c });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('请输入分类名称');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = { name: form.name, icon: form.icon, color: form.color, ...(modal.category ? {} : { type: tab }) };
      if (modal.category) await categoryApi.update(modal.category.id, payload);
      else await categoryApi.create(payload);
      setModal(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c) => {
    if (!confirm(`确定删除分类「${c.name}」吗？相关记录的分类将被清空。`)) return;
    try {
      await categoryApi.remove(c.id);
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0 fw-bold">
          <i className="bi bi-tags me-2 text-primary" />
          分类管理
        </h4>
        <div className="d-flex gap-2">
          <div className="btn-group">
            <button className={`btn btn-sm ${tab === 'expense' ? 'btn-danger' : 'btn-outline-danger'}`} onClick={() => setTab('expense')}>
              支出分类
            </button>
            <button className={`btn btn-sm ${tab === 'income' ? 'btn-success' : 'btn-outline-success'}`} onClick={() => setTab('income')}>
              收入分类
            </button>
          </div>
          <button className="btn btn-sm btn-primary" onClick={openCreate}>
            <i className="bi bi-plus-lg me-1" />
            新建
          </button>
        </div>
      </div>

      <div className="row g-3">
        {categories.map((c) => (
          <div key={c.id} className="col-6 col-md-3">
            <div className="card p-3 h-100 tx-row" onClick={() => openEdit(c)}>
              <div className="d-flex align-items-center gap-2">
                <span className="category-icon-chip" style={{ background: c.color }}>{c.icon}</span>
                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                  <div className="fw-bold text-truncate">{c.name}</div>
                  <div className="small text-secondary">{c.is_default ? '默认' : '自定义'}</div>
                </div>
                {!c.is_default && (
                  <button className="btn btn-sm btn-light text-danger" onClick={(e) => { e.stopPropagation(); handleDelete(c); }}>
                    <i className="bi bi-trash" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {categories.length === 0 && (
          <div className="col-12 text-center text-secondary py-5">
            <i className="bi bi-tags fs-1 d-block mb-2" />
            还没有自定义分类
          </div>
        )}
      </div>

      {modal && (
        <div className="modal fade show d-block" style={{ zIndex: 1060 }} onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content" style={{ borderRadius: 12 }}>
              <div className="modal-header">
                <h5 className="modal-title fw-bold">{modal.category ? '编辑分类' : '新建分类'}</h5>
                <button className="btn-close" onClick={() => setModal(null)} />
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body">
                  {error && <div className="alert alert-danger py-2">{error}</div>}
                  <div className="mb-3">
                    <label className="form-label fw-bold">名称</label>
                    <input className="form-control" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="如：零食" required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold">图标</label>
                    <div className="d-flex gap-2 flex-wrap">
                      {ICONS.map((ic) => (
                        <button key={ic} type="button" className="btn rounded-3" style={{ width: 44, height: 44, fontSize: '1.2rem', background: form.icon === ic ? form.color : '#e9ecef' }} onClick={() => setForm((f) => ({ ...f, icon: ic }))}>
                          {ic}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold">颜色</label>
                    <div className="d-flex gap-2 flex-wrap">
                      {COLORS.map((c) => (
                        <button key={c} type="button" className="btn rounded-circle" style={{ width: 32, height: 32, background: c, border: form.color === c ? '3px solid #333' : '2px solid transparent' }} onClick={() => setForm((f) => ({ ...f, color: c }))} />
                      ))}
                    </div>
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
