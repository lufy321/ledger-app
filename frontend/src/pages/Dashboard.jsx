import React, { useEffect, useState } from 'react';
import { statsApi, txApi, fmtMoney, currentMonth } from '../lib/api';
import TransactionModal from '../components/TransactionModal.jsx';

export default function Dashboard() {
  const [month, setMonth] = useState(currentMonth());
  const [summary, setSummary] = useState(null);
  const [recent, setRecent] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    const [s, t] = await Promise.all([
      statsApi.summary(month),
      txApi.list({ limit: 10 }),
    ]);
    setSummary(s);
    setRecent(t.items);
  };

  useEffect(() => {
    load().catch(() => {});
  }, [month]);

  // 移动端 FAB 触发快速记账
  useEffect(() => {
    const onQuick = () => {
      setEditing(null);
      setModalOpen(true);
    };
    window.addEventListener('ledger:quick-add', onQuick);
    return () => window.removeEventListener('ledger:quick-add', onQuick);
  }, []);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3 page-header">
        <h4 className="mb-0 fw-bold">
          <i className="bi bi-speedometer2 me-2 text-primary" />
          概览
        </h4>
        <div className="d-flex gap-2 align-items-center header-actions">
          <input
            type="month"
            className="form-control form-control-sm"
            style={{ width: 'auto', minWidth: 140 }}
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
          <button className="btn btn-primary d-none d-sm-inline-flex align-items-center" onClick={() => { setEditing(null); setModalOpen(true); }}>
            <i className="bi bi-plus-lg me-1" />
            记一笔
          </button>
        </div>
      </div>

      {summary && (
        <>
          <div className="row g-3 mb-3">
            <div className="col-12 col-md-4">
              <div className="card balance-card p-3 h-100">
                <div className="text-secondary small">总资产</div>
                <div className="balance-value text-primary">{fmtMoney(summary.totalBalance)}</div>
              </div>
            </div>
            <div className="col-6 col-md-4">
              <div className="card p-3 h-100" style={{ borderLeft: '4px solid #51cf66' }}>
                <div className="text-secondary small">本月收入</div>
                <div className="balance-value stat-income">
                  {fmtMoney(summary.income)}
                </div>
              </div>
            </div>
            <div className="col-6 col-md-4">
              <div className="card p-3 h-100" style={{ borderLeft: '4px solid #ff6b6b' }}>
                <div className="text-secondary small">本月支出</div>
                <div className="balance-value stat-expense">
                  {fmtMoney(summary.expense)}
                </div>
              </div>
            </div>
          </div>

          <div className="card p-3 mb-3">
            <h6 className="fw-bold mb-3">账户余额</h6>
            <div className="d-flex flex-wrap gap-2">
              {summary.accounts.map((a) => (
                <div key={a.id} className="account-chip">
                  <span className="account-chip-icon">{a.icon}</span>
                  <div className="account-chip-body">
                    <div className="account-chip-name">{a.name}</div>
                    <div className={`account-chip-bal ${a.balance < 0 ? 'neg' : ''}`}>{fmtMoney(a.balance)}</div>
                  </div>
                </div>
              ))}
              {summary.accounts.length === 0 && (
                <span className="text-secondary small">还没有账户，去「账户」页创建一个吧</span>
              )}
            </div>
          </div>
        </>
      )}

      <div className="card p-3">
        <h6 className="fw-bold mb-3">最近记录</h6>
        {recent.length === 0 ? (
          <div className="text-secondary text-center py-4">
            <i className="bi bi-inbox fs-1 d-block mb-2" />
            还没有记录，点「记一笔」开始吧
          </div>
        ) : (
          recent.map((t) => <TxRow key={t.id} tx={t} onEdit={() => { setEditing(t); setModalOpen(true); }} />)
        )}
      </div>

      {modalOpen && (
        <TransactionModal transaction={editing} onSaved={load} onClose={() => setModalOpen(false)} />
      )}
    </div>
  );
}

export function TxRow({ tx, onEdit, onDelete }) {
  const tags = parseTags(tx.tags);
  return (
    <div className="d-flex align-items-center gap-3 py-2 border-bottom tx-row tx-list-row" onClick={() => onEdit?.()}>
      <span className="tx-icon">{tx.category_icon || (tx.account_icon || '📦')}</span>
      <div className="flex-grow-1" style={{ minWidth: 0 }}>
        <div className="d-flex align-items-center gap-2">
          <span className="text-truncate" style={{ fontWeight: 500 }}>
            {tx.category_name || tx.account_name || (tx.is_transfer ? '转账' : '未分类')}
          </span>
          {tags.slice(0, 2).map((tag) => (
            <span key={tag} className="tag-badge d-none d-inline-block">{tag}</span>
          ))}
        </div>
        <div className="text-secondary small text-truncate">
          {[tx.description, tx.account_name, tx.date].filter(Boolean).join(' · ')}
        </div>
      </div>
      <span className={`tx-amount-${tx.type === 'income' ? 'income' : 'expense'} text-nowrap`}>
        {tx.type === 'income' ? '+' : '-'}
        {fmtMoney(tx.amount)}
      </span>
      <div className="d-flex gap-1" style={{ flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
        {onEdit && (
          <button className="btn btn-sm btn-light" title="编辑" onClick={() => onEdit(tx)}>
            <i className="bi bi-pencil" />
          </button>
        )}
        {onDelete && (
          <button className="btn btn-sm btn-light text-danger" title="删除" onClick={() => onDelete(tx)}>
            <i className="bi bi-trash" />
          </button>
        )}
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
      return [];
    }
  }
  return [];
}
