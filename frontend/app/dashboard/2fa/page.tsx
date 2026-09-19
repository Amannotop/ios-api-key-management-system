'use client';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader, Shield, ShieldCheck, ShieldOff, Key, Copy, Check } from 'lucide-react';

export default function TwoFAPage() {
  const [status, setStatus] = useState<{ enabled: boolean; secret?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupLoading, setSetupLoading] = useState(false);
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/2fa/status', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      setStatus(data);
    } catch {
      toast.error('Failed to load 2FA status');
    }
    setLoading(false);
  };

  useEffect(() => { fetchStatus(); }, []);

  const handleSetup = async () => {
    setSetupLoading(true);
    try {
      const res = await fetch('/api/admin/2fa/setup', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      if (data.secret) {
        setStatus({ enabled: false, secret: data.secret });
        toast.success('2FA setup started');
      } else if (data.error) {
        toast.error(data.error);
      }
    } catch {
      toast.error('Failed to setup 2FA');
    }
    setSetupLoading(false);
  };

  const handleVerify = async () => {
    if (!code) return;
    try {
      const res = await fetch('/api/admin/2fa/verify', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('2FA enabled!');
        fetchStatus();
        setCode('');
      } else {
        toast.error(data.error || 'Invalid code');
      }
    } catch {
      toast.error('Verification failed');
    }
  };

  const handleDisable = async () => {
    if (!confirm('Disable 2FA?')) return;
    try {
      const res = await fetch('/api/admin/2fa/disable', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      if (data.success) {
        toast.success('2FA disabled');
        fetchStatus();
      } else {
        toast.error(data.error || 'Failed to disable');
      }
    } catch {
      toast.error('Failed to disable 2FA');
    }
  };

  const copySecret = () => {
    if (status?.secret) {
      navigator.clipboard.writeText(status.secret);
      setCopied(true);
      toast.success('Secret copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Two-Factor Authentication</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Secure your admin account</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader size={24} className="animate-spin" style={{ color: '#6366f1' }} />
        </div>
      ) : status?.enabled ? (
        <div className="rounded-2xl p-6" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl" style={{ background: 'rgba(16,185,129,0.1)' }}>
              <ShieldCheck size={32} style={{ color: '#10b981' }} />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>2FA is Enabled</h2>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Your account is protected with authenticator app</p>
            </div>
            <button
              onClick={handleDisable}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
            >
              <ShieldOff size={16} /> Disable
            </button>
          </div>
        </div>
      ) : status?.secret ? (
        <div className="rounded-2xl p-6" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3 mb-4">
            <Shield size={24} style={{ color: '#6366f1' }} />
            <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Setup Authenticator</h2>
          </div>
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
            Scan this QR code or enter the secret manually in your authenticator app (Google Authenticator, Authy, etc.)
          </p>
          <div className="flex items-center gap-4 mb-4">
            <code className="flex-1 px-4 py-3 rounded-xl text-sm font-mono break-all" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>{status.secret}</code>
            <button onClick={copySecret} className="p-3 rounded-xl" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              {copied ? <Check size={20} /> : <Copy size={20} />}
            </button>
          </div>
          <div className="space-y-3">
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="Enter 6-digit code"
              maxLength={6}
              className="w-full px-4 py-3 rounded-xl text-center text-lg font-mono tracking-widest"
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
            <div className="flex gap-2">
              <button
                onClick={handleVerify}
                disabled={code.length !== 6}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-medium"
                style={{ background: '#6366f1', color: 'white' }}
              >
                Verify & Enable
              </button>
              <button
                onClick={() => setStatus(null)}
                className="px-4 py-3 rounded-xl text-sm"
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl p-6" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl" style={{ background: 'rgba(99,102,241,0.1)' }}>
              <Shield size={32} style={{ color: '#6366f1' }} />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Enable 2FA</h2>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Add an extra layer of security to your account using an authenticator app</p>
            </div>
            <button
              onClick={handleSetup}
              disabled={setupLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
              style={{ background: '#6366f1', color: 'white' }}
            >
              {setupLoading ? <Loader size={16} className="animate-spin" /> : <Key size={16} />} Setup 2FA
            </button>
          </div>
        </div>
      )}
    </div>
  );
}