'use client';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Package, Plus, Trash2, Save, Loader, Edit2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Bundle {
  id: string;
  bundleId: string;
  name: string;
  displayName?: string;
  iconUrl?: string;
  isActive: boolean;
  createdAt: string;
}

export default function BundlesPage() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Bundle | null>(null);
  const [form, setForm] = useState({ bundleId: '', name: '', displayName: '', iconUrl: '' });

  const fetchBundles = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/packages', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setBundles(data.packages || []);
      }
    } catch {
      toast.error('Failed to load bundles');
    }
    setLoading(false);
  };

  useEffect(() => { fetchBundles(); }, []);

  const handleSubmit = async () => {
    if (!form.bundleId || !form.name) { toast.error('Bundle ID and name required'); return; }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/packages', {
        method: editing ? 'PATCH' : 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, id: editing?.id })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(editing ? 'Bundle updated' : 'Bundle created');
        setShowModal(false);
        setEditing(null);
        setForm({ bundleId: '', name: '', displayName: '', iconUrl: '' });
        fetchBundles();
      } else {
        toast.error(data.error || 'Failed to save');
      }
    } catch {
      toast.error('Failed to save bundle');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/packages/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Bundle deleted');
        fetchBundles();
      } else {
        toast.error(data.error || 'Failed to delete');
      }
    } catch {
      toast.error('Failed to delete bundle');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Bundles</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Manage app bundles</p>
        </div>
        <Link href="/dashboard/settings" className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={16} /> Back to Settings
        </Link>
      </div>

      <div className="flex justify-end">
        <button onClick={() => { setEditing(null); setForm({ bundleId: '', name: '', displayName: '', iconUrl: '' }); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium" style={{ background: '#6366f1', color: 'white' }}>
          <Plus size={16} /> Add Bundle
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader size={24} className="animate-spin" style={{ color: '#6366f1' }} />
        </div>
      ) : bundles.length === 0 ? (
        <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>No bundles added</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bundles.map(bundle => (
            <div key={bundle.id} className="rounded-xl p-5" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.1)' }}>
                    <Package size={20} style={{ color: '#6366f1' }} />
                  </div>
                  <div>
                    <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>{bundle.name}</h3>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{bundle.bundleId}</p>
                  </div>
                </div>
                {!bundle.isActive && <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">Inactive</span>}
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => { setEditing(bundle); setForm({ bundleId: bundle.bundleId, name: bundle.name, displayName: bundle.displayName || '', iconUrl: bundle.iconUrl || '' }); setShowModal(true); }}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                  <Edit2 size={12} /> Edit
                </button>
                <button onClick={() => handleDelete(bundle.id)}
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="rounded-2xl p-6 w-full max-w-md mx-4" style={{ background: 'var(--bg-secondary)' }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>{editing ? 'Edit' : 'Add'} Bundle</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Bundle ID *</label>
                <input type="text" value={form.bundleId} onChange={e => setForm({ ...form, bundleId: e.target.value })}
                  placeholder="com.example.app"
                  className="w-full px-4 py-2 rounded-xl text-sm"
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Name *</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="My App"
                  className="w-full px-4 py-2 rounded-xl text-sm"
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Display Name</label>
                <input type="text" value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })}
                  placeholder="My Application"
                  className="w-full px-4 py-2 rounded-xl text-sm"
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Icon URL</label>
                <input type="text" value={form.iconUrl} onChange={e => setForm({ ...form, iconUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-4 py-2 rounded-xl text-sm"
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => { setShowModal(false); setEditing(null); }}
                className="flex-1 px-4 py-2 rounded-xl text-sm" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                Cancel
              </button>
              <button onClick={handleSubmit}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium" style={{ background: '#6366f1', color: 'white' }}>
                <Save size={16} /> Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}