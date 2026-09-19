'use client';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Loader, Save, User, Lock, Bell } from 'lucide-react';

export default function SettingsPage() {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ username: '', email: '' });

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Settings saved');
      } else {
        toast.error(data.error || 'Failed to save');
      }
    } catch {
      toast.error('Failed to save settings');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Settings</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Manage your account</p>
      </div>

      <div className="rounded-2xl p-6" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 mb-4">
          <User size={20} style={{ color: '#6366f1' }} />
          <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Profile</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Username</label>
            <input
              type="text"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              className="w-full px-4 py-2 rounded-xl text-sm"
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full px-4 py-2 rounded-xl text-sm"
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
            style={{ background: '#6366f1', color: 'white' }}
          >
            {saving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />} Save Changes
          </button>
        </div>
      </div>

      <div className="rounded-2xl p-6" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 mb-4">
          <Lock size={20} style={{ color: '#6366f1' }} />
          <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Security</h2>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Manage your password and 2FA in the <a href="/dashboard/2fa" className="underline">2FA settings</a>.
        </p>
      </div>

      <div className="rounded-2xl p-6" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 mb-4">
          <Bell size={20} style={{ color: '#6366f1' }} />
          <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Notifications</h2>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Configure webhook notifications and email alerts.
        </p>
      </div>
    </div>
  );
}