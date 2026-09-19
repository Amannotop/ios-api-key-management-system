'use client';
import { useEffect, useState } from 'react';
import { apiKeysApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Trash2, Copy, Check, Key, Loader } from 'lucide-react';

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', expiresAt: '' });
  const [newKey, setNewKey] = useState<{ key: string; id: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchApiKeys = async () => {
    setLoading(true);
    try {
      const data = await apiKeysApi.getAll();
      setApiKeys(data);
    } catch {
      toast.error('Failed to load API keys');
    }
    setLoading(false);
  };

  useEffect(() => { fetchApiKeys(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await apiKeysApi.create(form.name, form.expiresAt || undefined);
      setNewKey({ key: result.key, id: result.id });
      toast.success('API key created');
      setShowForm(false);
      setForm({ name: '', expiresAt: '' });
      fetchApiKeys();
    } catch {
      toast.error('Failed to create API key');
    }
  };

  const handleDelete = async (keyId: string) => {
    if (!confirm('Delete this API key?')) return;
    try {
      await apiKeysApi.delete(keyId);
      toast.success('API key deleted');
      fetchApiKeys();
    } catch {
      toast.error('Failed to delete API key');
    }
  };

  const copyKey = () => {
    if (newKey?.key) {
      navigator.clipboard.writeText(newKey.key);
      setCopied(true);
      toast.success('API key copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>API Keys</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Programmatic access</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
          style={{ background: '#6366f1', color: 'white' }}
        >
          <Plus size={16} /> Create API Key
        </button>
      </div>

      {newKey && (
        <div className="rounded-2xl p-6" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}>
          <h2 className="font-semibold mb-2" style={{ color: '#10b981' }}>API Key Created</h2>
          <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>Copy this key now. You won't be able to see it again.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-4 py-2 rounded-xl text-sm font-mono" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>{newKey.key}</code>
            <button onClick={copyKey} className="p-2 rounded-xl" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
            <button onClick={() => setNewKey(null)} className="px-4 py-2 rounded-xl text-sm" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>Done</button>
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="rounded-2xl p-6" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>New API Key</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-2 rounded-xl text-sm"
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                placeholder="My API Key"
              />
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Expires (optional)</label>
              <input
                type="date"
                value={form.expiresAt}
                onChange={e => setForm({ ...form, expiresAt: e.target.value })}
                className="w-full px-4 py-2 rounded-xl text-sm"
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 rounded-xl text-sm font-medium" style={{ background: '#6366f1', color: 'white' }}>Create</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-sm" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>Cancel</button>
            </div>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader size={24} className="animate-spin" style={{ color: '#6366f1' }} />
        </div>
      ) : apiKeys.length === 0 ? (
        <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>No API keys created</div>
      ) : (
        <div className="space-y-3">
          {apiKeys.map(apiKey => (
            <div key={apiKey.id} className="rounded-2xl p-5" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Key size={20} style={{ color: '#6366f1' }} />
                  <div>
                    <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{apiKey.name}</div>
                    <div className="text-sm" style={{ color: 'var(--text-muted)' }}>ID: {apiKey.keyId}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {apiKey.lastUsedAt && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Last used: {new Date(apiKey.lastUsedAt).toLocaleDateString()}</span>}
                  <button onClick={() => handleDelete(apiKey.id)} className="p-2 rounded-xl" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: '#ef4444' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}