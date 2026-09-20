import React, { useEffect, useState, useCallback } from 'react';
import { txApi, accountApi, categoryApi, downloadCsv, currentMonth, today } from '../lib/api';
import TransactionModal from '../components/TransactionModal.jsx';
import { TxRow } from './Dashboard.jsx';

export default function Transactions() {
  const [filters, setFilters] = useState({
    type: '',
    category_id: '',
    account_id: '',
    date_from: '',
    date_to: '',
    search: '',
  });
  const [data, setData] = useState({ items: [], total: 0, page: 1, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [searchInput, setSearchInput] = useState('');

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setFilters((f) => ({ ...f, search: searchInput })), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...filters, page, limit: 50 };
      const res = await txApi.list(params);
      setData(res);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    accountApi.list().then(setAccounts).catch(() => {});
    categoryApi.list().then(setCategories).catch(() => {});
  }, []);

  const handleDelete = async (tx) => {
    if (!confirm('确定删除这条记录吗？')) return;
    try {
      await txApi.remove(tx.id);
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  const monthOf = currentMonth();

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <h4 className="mb-0 fw-bold">
          <i className="bi bi-list-ul me-2 text-primary" />
          账本
          <span className="fs-6 text-secondary ms-2">共 {data.total} 条</span>
        </h4>
        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-secondary"
            onClick={() => downloadCsv({ date_from: filters.date_from || `${monthOf}-01`, date_to: filters.date_to || `${monthOf}-31`, type: filters.type })}
          >
            <i className="bi bi-download me-1" />
            导出CSV
          </button>
          <button className="btn btn-primary" onClick={() => { setEditing(null); setModalOpen(true); }}>
            <i className="bi bi-plus-lg me-1" />
            记一笔
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-3 mb-3">
        <div className="row g-2">
          <div className="col-6 col-md-2">
            <select className="form-select form-select-sm" value={filters.type} onChange={(e) => { setFilters((f) => ({ ...f, type: e.target.value })); setPage(1); }}>
              <option value="">全部类型</option>
              <option value="expense">支出</option>
              <option value="income">收入</option>
            </select>
          </div>
          <div className="col-6 col-md-3">
            <select className="form-select form-select-sm" value={filters.category_id} onChange={(e) => { setFilters((f) => ({ ...f, category_id: e.target.value })); setPage(1); }}>
              <option value="">全部分类</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>
          <div className="col-6 col-md-2">
            <select className="form-select form-select-sm" value={filters.account_id} onChange={(e) => { setFilters((f) => ({ ...f, account_id: e.target.value })); setPage(1); }}>
              <option value="">全部账户</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
              ))}
            </select>
          </div>
          <div className="col-6 col-md-3">
            <input
              type="search"
              className="form-control form-control-sm"
              placeholder="搜索备注/标签..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <div className="col-6 col-md-2">
            <input type="date" className="form-control form-control-sm" value={filters.date_from} onChange={(e) => { setFilters((f) => ({ ...f, date_from: e.target.value })); setPage(1); }} />
          </div>
          <div className="col-6 col-md-2">
            <input type="date" className="form-control form-control-sm" value={filters.date_to} onChange={(e) => { setFilters((f) => ({ ...f, date_to: e.target.value })); setPage(1); }} />
          </div>
        </div>
      </div>

      {/* List */}
      <div className="card p-3">
        {loading && <div className="text-center py-4"><div className="spinner-border text-primary" /></div>}
        {!loading && data.items.length === 0 && (
          <div className="text-secondary text-center py-5">
            <i className="bi bi-inbox fs-1 d-block mb-2" />
            没有找到记录
          </div>
        )}
        {!loading &&
          data.items.map((t) => (
            <TxRow key={t.id} tx={t} onEdit={() => { setEditing(t); setModalOpen(true); }} onDelete={handleDelete} />
          ))}

        {data.totalPages > 1 && (
          <div className="d-flex justify-content-center align-items-center gap-2 mt-3">
            <button className="btn btn-sm btn-outline-primary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              上一页
            </button>
            <span className="small">{page} / {data.totalPages}</span>
            <button className="btn btn-sm btn-outline-primary" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>
              下一页
            </button>
          </div>
        )}
      </div>

      {modalOpen && (
        <TransactionModal transaction={editing} onSaved={load} onClose={() => setModalOpen(false)} />
      )}
    </div>
  );
}
