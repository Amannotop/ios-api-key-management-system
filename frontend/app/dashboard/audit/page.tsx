'use client';
import { useEffect, useState } from 'react';
import { auditApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Loader, Search, Filter } from 'lucide-react';

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [action, setAction] = useState('');

  const fetchLogs = async (pageNum: number = 1) => {
    setLoading(true);
    try {
      const data = await auditApi.getAll({ page: pageNum, limit: 20, action: action || undefined });
      setLogs(data.logs);
      setTotalPages(data.totalPages);
      setPage(data.page);
    } catch {
      toast.error('Failed to load audit logs');
    }
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs(1);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Audit Logs</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Track all admin actions</p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={action}
            onChange={e => setAction(e.target.value)}
            placeholder="Filter by action..."
            className="w-full pl-10 pr-4 py-2 rounded-xl text-sm"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
        </div>
        <button type="submit" className="px-4 py-2 rounded-xl text-sm" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
          <Filter size={16} />
        </button>
      </form>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader size={24} className="animate-spin" style={{ color: '#6366f1' }} />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>No audit logs found</div>
      ) : (
        <div className="space-y-2">
          {logs.map(log => (
            <div key={log.id} className="rounded-xl p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{log.action}</span>
                  <div className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                    by {log.admin?.username || 'System'} • {new Date(log.timestamp).toLocaleString()}
                  </div>
                </div>
                {log.details && (
                  <code className="text-xs" style={{ color: 'var(--text-muted)' }}>{JSON.stringify(log.details)}</code>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => fetchLogs(page - 1)}
            disabled={page === 1}
            className="px-3 py-1 rounded-lg text-sm"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            Previous
          </button>
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Page {page} of {totalPages}</span>
          <button
            onClick={() => fetchLogs(page + 1)}
            disabled={page === totalPages}
            className="px-3 py-1 rounded-lg text-sm"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}