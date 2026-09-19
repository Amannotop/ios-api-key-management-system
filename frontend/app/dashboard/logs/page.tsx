'use client';
import { useEffect, useState, useMemo } from 'react';
import { logsApi } from '@/lib/api';
import { Search, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock, Activity, Filter, RefreshCw } from 'lucide-react';

interface Log {
  id: string;
  key: string;
  udid: string | null;
  ipAddress: string | null;
  status: 'success' | 'fail';
  reason: string | null;
  timestamp: string;
}

function SkeletonRow() {
  return (
    <tr>
      <td className="px-4 py-3"><div className="h-4 w-28 rounded animate-shimmer" /></td>
      <td className="px-4 py-3"><div className="h-4 w-32 rounded animate-shimmer" /></td>
      <td className="px-4 py-3"><div className="h-4 w-24 rounded animate-shimmer" /></td>
      <td className="px-4 py-3"><div className="h-4 w-20 rounded animate-shimmer" /></td>
      <td className="px-4 py-3"><div className="h-5 w-16 rounded-full animate-shimmer" /></td>
      <td className="px-4 py-3"><div className="h-4 w-20 rounded animate-shimmer" /></td>
    </tr>
  );
}

export default function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await logsApi.getAll({ page, search, status: statusFilter || undefined });
      setLogs(data.logs);
      setTotal(data.totalPages);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLogs(); }, [page, search, statusFilter]);

  const formatDate = (date: string) => new Date(date).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
  });

  const pageNumbers = useMemo(() => {
    const pages: (number | 'ellipsis')[] = [];
    if (total <= 7) { for (let i = 1; i <= total; i++) pages.push(i); }
    else { pages.push(1); if (page > 3) pages.push('ellipsis'); for (let i = Math.max(2, page - 1); i <= Math.min(total - 1, page + 1); i++) pages.push(i); if (page < total - 2) pages.push('ellipsis'); pages.push(total); }
    return pages;
  }, [page, total]);

  const successCount = logs.filter(l => l.status === 'success').length;
  const failCount = logs.filter(l => l.status === 'fail').length;

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Activity Logs</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Real-time validation events</p>
        </div>
        <button onClick={fetchLogs}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-1">
            <Activity size={16} className="text-indigo-400" />
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Total Events</span>
          </div>
          <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{logs.length}</div>
        </div>
        <div className="rounded-2xl p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 size={16} className="text-green-400" />
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Successful</span>
          </div>
          <div className="text-2xl font-bold text-green-400">{successCount}</div>
        </div>
        <div className="rounded-2xl p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-1">
            <XCircle size={16} className="text-red-400" />
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Failed</span>
          </div>
          <div className="text-2xl font-bold text-red-400">{failCount}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input type="text" placeholder="Search by key..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-4 py-2.5 rounded-xl text-sm"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
          <option value="">All Status</option>
          <option value="success">Success</option>
          <option value="fail">Failed</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-container" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
        <table>
          <thead>
            <tr style={{ background: 'var(--bg-tertiary)' }}>
              {['Timestamp', 'Key', 'UDID', 'IP Address', 'Status', 'Reason'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              : logs.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                  <div className="flex flex-col items-center gap-2"><Activity size={32} className="opacity-30" /><p>No logs found</p></div>
                </td></tr>
              ) : logs.map((log) => (
                <tr key={log.id} className="transition-colors" style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                    <div className="flex items-center gap-1.5">
                      <Clock size={12} className="opacity-50" />
                      {formatDate(log.timestamp)}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{log.key}</td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: log.udid ? 'var(--text-muted)' : 'var(--text-muted)' }}>
                    {log.udid || <span className="italic opacity-50">null</span>}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{log.ipAddress || <span className="italic opacity-50">-</span>}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${log.status === 'success' ? 'badge-success' : 'badge-danger'}`}>
                      {log.status === 'success' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: log.reason ? '#f87171' : 'var(--text-muted)' }}>
                    {log.reason || <span className="italic opacity-50">-</span>}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 1 && (
        <div className="flex items-center justify-center gap-1">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="p-2 rounded-xl disabled:opacity-30" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            <ChevronLeft size={16} />
          </button>
          {pageNumbers.map((num, idx) => num === 'ellipsis'
            ? <span key={`e${idx}`} className="px-3 py-2 text-sm" style={{ color: 'var(--text-muted)' }}>…</span>
            : <button key={num} onClick={() => setPage(num)}
                className="px-3.5 py-2 rounded-xl text-sm font-medium"
                style={page === num ? { background: '#6366f1', color: '#fff' } : { background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                {num}
              </button>
          )}
          <button onClick={() => setPage(p => Math.min(total, p + 1))} disabled={page === total}
            className="p-2 rounded-xl disabled:opacity-30" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
