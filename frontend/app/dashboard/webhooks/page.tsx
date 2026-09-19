'use client';
import { useEffect, useState } from 'react';
import { webhooksApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Trash2, Play, Check, X, Copy, CheckCircle, XCircle, Loader } from 'lucide-react';

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ url: '', events: ['key_created'] });
  const [testing, setTesting] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchWebhooks = async () => {
    setLoading(true);
    try {
      const data = await webhooksApi.getAll();
      setWebhooks(data);
    } catch {
      toast.error('Failed to load webhooks');
    }
    setLoading(false);
  };

  useEffect(() => { fetchWebhooks(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await webhooksApi.create(form.url, form.events);
      toast.success('Webhook created');
      setShowForm(false);
      setForm({ url: '', events: ['key_created'] });
      fetchWebhooks();
    } catch {
      toast.error('Failed to create webhook');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this webhook?')) return;
    try {
      await webhooksApi.delete(id);
      toast.success('Webhook deleted');
      fetchWebhooks();
    } catch {
      toast.error('Failed to delete webhook');
    }
  };

  const handleTest = async (id: string) => {
    setTesting(id);
    try {
      await webhooksApi.test(id);
      toast.success('Test webhook sent!');
    } catch {
      toast.error('Test failed');
    }
    setTesting(null);
  };

  const copySecret = (id: string, secret: string) => {
    navigator.clipboard.writeText(secret);
    setCopiedId(id);
    toast.success('Secret copied!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const availableEvents = ['key_created', 'key_expired', 'key_banned', 'key_updated', 'device_added', 'suspicious_activity'];

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Webhooks</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>External integrations</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
          style={{ background: '#6366f1', color: 'white' }}
        >
          <Plus size={16} /> Add Webhook
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="rounded-2xl p-6" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>New Webhook</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>URL</label>
              <input
                type="url"
                required
                value={form.url}
                onChange={e => setForm({ ...form, url: e.target.value })}
                className="w-full px-4 py-2 rounded-xl text-sm"
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                placeholder="https://example.com/webhook"
              />
            </div>
            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--text-muted)' }}>Events</label>
              <div className="flex flex-wrap gap-2">
                {availableEvents.map(event => (
                  <label key={event} className="flex items-center gap-2 px-3 py-1 rounded-lg text-sm cursor-pointer" style={{ background: form.events.includes(event) ? 'rgba(99,102,241,0.2)' : 'var(--bg-primary)', border: '1px solid var(--border)' }}>
                    <input
                      type="checkbox"
                      checked={form.events.includes(event)}
                      onChange={e => {
                        const events = e.target.checked ? [...form.events, event] : form.events.filter(e => e !== event);
                        setForm({ ...form, events });
                      }}
                      className="hidden"
                    />
                    {form.events.includes(event) ? <Check size={14} /> : <X size={14} />}
                    <span style={{ color: 'var(--text-secondary)' }}>{event}</span>
                  </label>
                ))}
              </div>
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
      ) : webhooks.length === 0 ? (
        <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>No webhooks configured</div>
      ) : (
        <div className="space-y-3">
          {webhooks.map(webhook => (
            <div key={webhook.id} className="rounded-2xl p-5" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm" style={{ color: 'var(--text-primary)' }}>{webhook.url}</span>
                    {webhook.active ? <CheckCircle size={16} className="text-green-500" /> : <XCircle size={16} className="text-red-500" />}
                  </div>
                  <div className="flex gap-2 mt-2">
                    {webhook.events?.map((e: string) => (
                      <span key={e} className="px-2 py-0.5 rounded text-xs" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>{e}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleTest(webhook.id)} disabled={testing === webhook.id} className="p-2 rounded-xl" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                    {testing === webhook.id ? <Loader size={16} className="animate-spin" /> : <Play size={16} />}
                  </button>
                  <button onClick={() => copySecret(webhook.id, webhook.secret)} className="p-2 rounded-xl" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                    {copiedId === webhook.id ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                  <button onClick={() => handleDelete(webhook.id)} className="p-2 rounded-xl" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: '#ef4444' }}>
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