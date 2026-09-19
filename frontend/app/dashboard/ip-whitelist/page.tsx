'use client';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Shield, Plus, Trash2, Save, Loader, ArrowLeft } from 'lucide-react';
import { ipWhitelistApi } from '@/lib/api';
import Link from 'next/link';

interface IPEntry {
  id: string;
  ip: string;
  description?: string;
  createdAt: string;
}

export default function IPWhitelistPage() {
  const [ips, setIPs] = useState<IPEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newIP, setNewIP] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const fetchIPs = async () => {
    setLoading(true);
    try {
      const data = await ipWhitelistApi.getAll();
      if (data.success) {
        setIPs(data.ips || []);
      }
    } catch {
      toast.error('Failed to load IP whitelist');
    }
    setLoading(false);
  };

  useEffect(() => { fetchIPs(); }, []);

  const handleAdd = async () => {
    if (!newIP) { toast.error('IP address required'); return; }
    try {
      const data = await ipWhitelistApi.add(newIP, newDesc);
      if (data.success) {
        toast.success('IP added');
        setNewIP('');
        setNewDesc('');
        fetchIPs();
      } else {
        toast.error(data.error || 'Failed to add IP');
      }
    } catch {
      toast.error('Failed to add IP');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const data = await ipWhitelistApi.remove(id);
      if (data.success) {
        toast.success('IP removed');
        fetchIPs();
      } else {
        toast.error(data.error || 'Failed to remove IP');
      }
    } catch {
      toast.error('Failed to remove IP');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>IP Whitelist</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Manage allowed IP addresses</p>
        </div>
        <Link href="/dashboard/settings" className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={16} /> Back to Settings
        </Link>
      </div>

      <div className="rounded-2xl p-6" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 mb-4">
          <Shield size={20} style={{ color: '#6366f1' }} />
          <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Add IP Address</h2>
        </div>
        <div className="flex gap-3">
          <input
            type="text"
            value={newIP}
            onChange={e => setNewIP(e.target.value)}
            placeholder="e.g., 192.168.1.1 or 10.0.0.0/24"
            className="flex-1 px-4 py-2 rounded-xl text-sm"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
          <input
            type="text"
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
            placeholder="Description (optional)"
            className="flex-1 px-4 py-2 rounded-xl text-sm"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
          <button onClick={handleAdd} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium" style={{ background: '#6366f1', color: 'white' }}>
            <Plus size={16} /> Add
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader size={24} className="animate-spin" style={{ color: '#6366f1' }} />
        </div>
      ) : ips.length === 0 ? (
        <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>No IP addresses added</div>
      ) : (
        <div className="space-y-2">
          {ips.map(ip => (
            <div key={ip.id} className="rounded-xl p-4 flex items-center justify-between" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              <div>
                <code className="font-medium" style={{ color: 'var(--text-primary)' }}>{ip.ip}</code>
                {ip.description && <div className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{ip.description}</div>}
              </div>
              <button onClick={() => handleDelete(ip.id)} className="p-2 rounded-lg hover:bg-red-500/10" style={{ color: '#f87171' }}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}