import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { statsApi, currentMonth, fmtMoney } from '../lib/api';
import { useTheme } from '../components/ThemeContext.jsx';

const CHART_COLORS_LIGHT = ['#ff6b6b', '#ffa94d', '#845ef7', '#339af0', '#f06595', '#20c997', '#7952b3', '#4dabf7', '#51cf66', '#94d82d', '#12b886', '#63e6be', '#adb5bd', '#fa5252', '#e8590c', '#6741d9'];
const CHART_COLORS_DARK = ['#ff8787', '#ffa94d', '#9775fa', '#4dabf7', '#faa2c1', '#38d9a9', '#9775fa', '#74c0fc', '#69db7c', '#a9e34b', '#20c997', '#66d9e8', '#868e96', '#ff6b6b', '#fd7e14', '#845ef7'];

export default function Stats() {
  const { theme } = useTheme();
  const CHART_COLORS = theme === 'dark' ? CHART_COLORS_DARK : CHART_COLORS_LIGHT;
  const [month, setMonth] = useState(currentMonth());
  const [byCategory, setByCategory] = useState([]);
  const [byMonth, setByMonth] = useState([]);
  const [budgetProgress, setBudgetProgress] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [cat, mon, budget] = await Promise.all([
        statsApi.byCategory(month),
        statsApi.byMonth(12),
        statsApi.budgetProgress(month),
      ]);
      setByCategory(cat);
      setByMonth(mon);
      setBudgetProgress(budget);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [month]);

  const totalExpense = byCategory.reduce((s, c) => s + c.total, 0);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <h4 className="mb-0 fw-bold">
          <i className="bi bi-bar-chart me-2 text-primary" />
          统计
        </h4>
        <input
          type="month"
          className="form-control form-control-sm"
          style={{ width: 160 }}
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" />
        </div>
      ) : (
        <>
          {/* Expense by category - donut */}
          <div className="row g-3 mb-3">
            <div className="col-12 col-lg-6">
              <div className="card p-3 h-100">
                <h6 className="fw-bold mb-3">
                  支出分类分布
                  <span className="ms-2 text-secondary small">{fmtMoney(totalExpense)}</span>
                </h6>
                {byCategory.length === 0 ? (
                  <div className="text-secondary text-center py-4">本月暂无支出数据</div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={byCategory}
                        dataKey="total"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        label={({ name, percent }) => `${name || '未分类'} ${(percent * 100).toFixed(0)}%`}
                      >
                        {byCategory.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => fmtMoney(v)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Budget progress */}
            <div className="col-12 col-lg-6">
              <div className="card p-3 h-100">
                <h6 className="fw-bold mb-3">预算执行情况</h6>
                {budgetProgress.length === 0 ? (
                  <div className="text-secondary text-center py-4">该月暂无预算</div>
                ) : (
                  <div className="d-flex flex-column gap-3">
                    {budgetProgress.map((b) => {
                      const pct = Math.min((b.spent / b.amount) * 100, 100);
                      const over = b.spent > b.amount;
                      return (
                        <div key={b.id}>
                          <div className="d-flex justify-content-between small mb-1">
                            <span className="fw-bold">
                              {b.category_icon} {b.category_name || '总预算'}
                            </span>
                            <span className={over ? 'text-danger' : 'text-secondary'}>
                              {fmtMoney(b.spent)} / {fmtMoney(b.amount)}
                            </span>
                          </div>
                          <div className="budget-bar" style={{ height: 10 }}>
                            <div
                              className="budget-bar-fill"
                              style={{ width: `${pct}%`, background: over ? 'var(--expense)' : b.category_color || 'var(--income)' }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Monthly income vs expense bar chart */}
          <div className="card p-3 mb-3">
            <h6 className="fw-bold mb-3">近 12 个月收支对比</h6>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byMonth} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#2d333d' : '#e9ecef'} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: theme === 'dark' ? '#8b95a3' : '#6c757d' }} stroke={theme === 'dark' ? '#2d333d' : '#e9ecef'} />
                <YAxis tick={{ fontSize: 12, fill: theme === 'dark' ? '#8b95a3' : '#6c757d' }} stroke={theme === 'dark' ? '#2d333d' : '#e9ecef'} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip formatter={(v) => fmtMoney(v)} />
                <Legend />
                <Bar dataKey="income" name="收入" fill="var(--income)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="支出" fill="var(--expense)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Category detail table */}
          {byCategory.length > 0 && (
            <div className="card p-3">
              <h6 className="fw-bold mb-3">分类明细</h6>
              <table className="table table-hover align-middle">
                <thead>
                  <tr className="text-secondary small">
                    <th>分类</th>
                    <th>次数</th>
                    <th>金额</th>
                    <th>占比</th>
                    <th>分布</th>
                  </tr>
                </thead>
                <tbody>
                  {byCategory.map((c, i) => {
                    const pct = totalExpense > 0 ? (c.total / totalExpense) * 100 : 0;
                    return (
                      <tr key={i}>
                        <td><span className="category-icon-chip me-2" style={{ background: c.color, width: '1.8rem', height: '1.8rem', fontSize: '0.9rem' }}>{c.icon}</span>{c.name || '未分类'}</td>
                        <td>{c.count}</td>
                        <td className="fw-bold text-nowrap">{fmtMoney(c.total)}</td>
                        <td>{pct.toFixed(1)}%</td>
                        <td style={{ width: '30%' }}>
                          <div className="budget-bar" style={{ height: 8 }}>
                            <div className="budget-bar-fill" style={{ width: `${pct}%`, background: c.color || 'var(--primary)' }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
