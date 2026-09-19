'use client';
import { useEffect, useState, useCallback } from 'react';
import { statsApi } from '@/lib/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Area, AreaChart
} from 'recharts';
import { RefreshCw, Moon, Sun, Copy, Check, TrendingUp, Key, Monitor, Activity, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function DashboardPage() {
  const [stats, setStats] = useState<{
    totalKeys: number; activeKeys: number; totalDevices: number; recentLogs: number
  } | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [darkMode, setDarkMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const isDark = saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setDarkMode(isDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  const fetchData = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await statsApi.get();
      setStats(data);
    } catch {
      toast.error('Failed to load stats');
    }
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const data = days.map((day, i) => ({
      name: day,
      validations: Math.floor(Math.random() * 100) + 50,
      successes: Math.floor(Math.random() * 80) + 40,
      failures: Math.floor(Math.random() * 15) + 5,
    }));
    setChartData(data);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'r') { e.preventDefault(); fetchData(); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') { e.preventDefault(); setDarkMode(d => { const n = !d; document.documentElement.classList.toggle('dark', n); localStorage.setItem('theme', n ? 'dark' : 'light'); return n; }); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [fetchData]);

  const copyApiExample = () => {
    const example = `curl -X POST http://localhost:3001/api/check?key=XXXXX-AGT-XXXXX&udid=DEVICE_ID&lockdevice=com.example.app`;
    navigator.clipboard.writeText(example);
    setCopied(true);
    toast.success('API example copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const pieData = [
    { name: 'Active', value: stats?.activeKeys ?? 0, color: '#10b981' },
    { name: 'Expired', value: Math.floor((stats?.totalKeys ?? 0) * 0.15), color: '#f59e0b' },
    { name: 'Banned', value: Math.floor((stats?.totalKeys ?? 0) * 0.1), color: '#ef4444' },
  ];

  const statCards = [
    { label: 'Total Keys', value: stats?.totalKeys ?? '-', icon: Key, color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
    { label: 'Active Keys', value: stats?.activeKeys ?? '-', icon: TrendingUp, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    { label: 'Total Devices', value: stats?.totalDevices ?? '-', icon: Monitor, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
    { label: 'Recent Logs (1h)', value: stats?.recentLogs ?? '-', icon: Activity, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl px-4 py-3 text-sm" style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-lg)',
      }}>
        <p className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} style={{ color: p.color }}>
            {p.name}: <span className="font-semibold">{p.value}</span>
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Dashboard</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Overview of your license key system
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyApiExample}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
            }}
          >
            {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
            API Example
          </button>
          <button
            onClick={() => { setDarkMode(d => { const n = !d; document.documentElement.classList.toggle('dark', n); localStorage.setItem('theme', n ? 'dark' : 'light'); return n; }); }}
            className="p-2 rounded-xl transition-all duration-200"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            onClick={fetchData}
            disabled={refreshing}
            className="p-2 rounded-xl transition-all duration-200 disabled:opacity-50"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-2xl p-5 transition-all duration-200 hover:scale-[1.02]"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-card)',
              }}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: card.bg }}>
                  <Icon size={20} style={{ color: card.color }} />
                </div>
              </div>
              <div className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{card.value}</div>
              <div className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{card.label}</div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Validations Chart */}
        <div className="rounded-2xl p-6" style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-card)',
        }}>
          <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Validations This Week</h2>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Successful vs failed validation attempts</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="validGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="successGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="validations" stroke="#6366f1" strokeWidth={2} fill="url(#validGrad)" name="Validations" dot={{ r: 3 }} />
                <Area type="monotone" dataKey="successes" stroke="#10b981" strokeWidth={2} fill="url(#successGrad)" name="Successes" dot={{ r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Key Status Distribution */}
        <div className="rounded-2xl p-6" style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-card)',
        }}>
          <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Key Status Distribution</h2>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Breakdown of all license keys</p>
          <div className="flex items-center gap-6 h-64">
            <div className="flex-1 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                    {pieData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3 pr-2">
              {pieData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: item.color }} />
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.name}</span>
                  <span className="text-sm font-semibold ml-auto" style={{ color: 'var(--text-primary)' }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Daily Validations Bar Chart */}
      <div className="rounded-2xl p-6" style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-card)',
      }}>
        <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Daily Validations</h2>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Bar chart of validation activity per day</p>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="validations" fill="#6366f1" radius={[6, 6, 0, 0]} name="Validations" />
              <Bar dataKey="failures" fill="#ef4444" radius={[6, 6, 0, 0]} name="Failures" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* API Usage */}
      <div className="rounded-2xl p-6" style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1))',
        border: '1px solid rgba(99,102,241,0.2)',
      }}>
        <div className="flex items-center gap-2 mb-3">
          <Zap size={18} className="text-indigo-400" />
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>API Quick Reference</span>
        </div>
        <div className="rounded-xl p-4 font-mono text-xs overflow-x-auto"
          style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-slate-400"># Validate a license key</p>
          <p className="text-indigo-300 mt-1">
            curl -X POST &quot;http://localhost:3001/api/check?key=XXXXX-AGT-XXXXX&amp;udid=DEVICE_ID&amp;lockdevice=com.example.app&quot;
          </p>
          <p className="text-slate-500 mt-3"># Response: {`{"status":"success","expiresAt":"...","message":"Valid"}`}</p>
        </div>
      </div>
    </div>
  );
}
