'use client';
import { useEffect, useState } from 'react';
import { usageApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Loader, BarChart3 } from 'lucide-react';

export default function UsagePage() {
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await usageApi.getAll(days);
      setStats(data);
    } catch {
      toast.error('Failed to load usage stats');
    }
    setLoading(false);
  };

  useEffect(() => { fetchStats(); }, [days]);

  const totalRequests = stats.reduce((sum, s) => sum + (s.requestCount || 0), 0);
  const uniqueDevices = new Set(stats.flatMap(s => s.keyId)).size;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Usage Stats</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>License key usage over time</p>
        </div>
        <select
          value={days}
          onChange={e => setDays(Number(e.target.value))}
          className="px-3 py-2 rounded-xl text-sm"
          style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        >
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl p-5" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ background: 'rgba(99,102,241,0.1)' }}>
              <BarChart3 size={20} style={{ color: '#6366f1' }} />
            </div>
            <div>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Total Requests</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{totalRequests.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl p-5" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ background: 'rgba(16,185,129,0.1)' }}>
              <BarChart3 size={20} style={{ color: '#10b981' }} />
            </div>
            <div>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Active Keys</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{uniqueDevices}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl p-5" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ background: 'rgba(245,158,11,0.1)' }}>
              <BarChart3 size={20} style={{ color: '#f59e0b' }} />
            </div>
            <div>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Days</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{days}</p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader size={24} className="animate-spin" style={{ color: '#6366f1' }} />
        </div>
      ) : stats.length === 0 ? (
        <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>No usage data available</div>
      ) : (
        <div className="space-y-2">
          {stats.map(stat => (
            <div key={stat.id} className="rounded-xl p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{stat.key?.keyValue || stat.keyId}</span>
                  <div className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                    Tier: {stat.key?.tier || 'N/A'} • {new Date(stat.date).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{stat.requestCount || 0}</span>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>requests</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}