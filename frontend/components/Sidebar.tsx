'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Key,
  FileText,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Settings,
  Webhook,
  KeyRound,
  BarChart3,
  ClipboardList,
  Shield,
  Globe,
  Package,
} from 'lucide-react';
import Cookies from 'js-cookie';
import { useState, useEffect } from 'react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/keys', label: 'License Keys', icon: Key },
  { href: '/dashboard/logs', label: 'Activity Logs', icon: FileText },
  { href: '/dashboard/webhooks', label: 'Webhooks', icon: Webhook },
  { href: '/dashboard/api-keys', label: 'API Keys', icon: KeyRound },
  { href: '/dashboard/audit', label: 'Audit Logs', icon: ClipboardList },
  { href: '/dashboard/usage', label: 'Usage Stats', icon: BarChart3 },
  { href: '/dashboard/2fa', label: '2FA', icon: Shield },
  { href: '/dashboard/ip-whitelist', label: 'IP Whitelist', icon: Globe },
  { href: '/dashboard/bundles', label: 'Bundles', icon: Package },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  const handleLogout = () => {
    Cookies.remove('token');
    router.push('/login');
  };

  return (
    <aside
      className="flex flex-col h-screen sticky top-0 transition-all duration-300"
      style={{
        width: collapsed ? '72px' : '260px',
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 h-16 border-b border-white/5">
        {!collapsed && (
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              <Key size={16} className="text-white" />
            </div>
            <div className="overflow-hidden">
              <h1 className="text-sm font-bold text-white whitespace-nowrap">Key Admin</h1>
              <p className="text-xs text-slate-500 whitespace-nowrap">License Manager</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-full flex justify-center">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              <Key size={16} className="text-white" />
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative"
              style={{
                color: isActive ? '#818cf8' : 'var(--sidebar-text)',
                background: isActive
                  ? 'rgba(99, 102, 241, 0.15)'
                  : 'transparent',
              }}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                  style={{ background: '#6366f1' }} />
              )}
              <Icon size={20} className="flex-shrink-0" />
              {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
              {collapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 rounded-md text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"
                  style={{
                    background: '#1e293b',
                    color: '#f1f5f9',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3)',
                  }}>
                  {item.label}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 space-y-1 border-t border-white/5">
        <button
          onClick={toggleDarkMode}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full transition-all duration-200"
          style={{ color: 'var(--sidebar-text)' }}
        >
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          {!collapsed && (
            <span className="whitespace-nowrap">{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
          )}
        </button>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full transition-all duration-200 hover:bg-red-500/10"
          style={{ color: '#f87171' }}
        >
          <LogOut size={20} />
          {!collapsed && <span className="whitespace-nowrap">Logout</span>}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center gap-3 px-3 py-2.5 rounded-xl text-sm w-full transition-all duration-200 mt-1"
          style={{ color: 'var(--sidebar-text)' }}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {!collapsed && <span className="whitespace-nowrap">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
