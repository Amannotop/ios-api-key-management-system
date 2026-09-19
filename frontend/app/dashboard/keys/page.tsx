'use client';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { keysApi } from '@/lib/api';
import {
  Trash2, AlertTriangle, RefreshCw, Edit2, Download, X, Check, Copy,
  Plus, Search, Filter, ChevronLeft, ChevronRight, MoreHorizontal,
  ArrowUpDown, CheckCircle2, XCircle, Ban, Unlock, Clock, Key as KeyIcon
} from 'lucide-react';
import toast from 'react-hot-toast';

interface LicenseKey {
  id: string;
  keyValue: string;
  expiresAt: string;
  status: 'active' | 'expired' | 'banned';
  maxDevices: number;
  isTrial: boolean;
  trialExpiresAt: string | null;
  tier: string;
  createdAt: string;
  _count: { devices: number };
  allowedIPs?: string[];
  bundleIds?: string[];
}

function SkeletonRow() {
  return (
    <tr>
      <td className="px-4 py-3"><div className="w-5 h-5 rounded animate-shimmer" /></td>
      <td className="px-4 py-3"><div className="h-4 w-40 rounded animate-shimmer" /></td>
      <td className="px-4 py-3"><div className="h-5 w-16 rounded-full animate-shimmer" /></td>
      <td className="px-4 py-3"><div className="h-4 w-12 rounded animate-shimmer" /></td>
      <td className="px-4 py-3"><div className="h-4 w-14 rounded animate-shimmer" /></td>
      <td className="px-4 py-3"><div className="h-4 w-24 rounded animate-shimmer" /></td>
      <td className="px-4 py-3"><div className="h-4 w-24 rounded animate-shimmer" /></td>
      <td className="px-4 py-3"><div className="h-8 w-20 rounded animate-shimmer" /></td>
    </tr>
  );
}

const tierColors: Record<string, string> = {
  basic: 'badge-info',
  pro: 'badge-warning',
  premium: 'badge-purple',
};

const statusBadge: Record<string, { cls: string; icon: any }> = {
  active: { cls: 'badge-success', icon: CheckCircle2 },
  expired: { cls: 'badge-warning', icon: Clock },
  banned: { cls: 'badge-danger', icon: Ban },
};

export default function KeysPage() {
  const router = useRouter();
  const [keys, setKeys] = useState<LicenseKey[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingKey, setEditingKey] = useState<LicenseKey | null>(null);
  const [newExpiresAt, setNewExpiresAt] = useState('');
  const [newMaxDevices, setNewMaxDevices] = useState(1);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [bulkAction, setBulkAction] = useState<'ban' | 'unban' | 'delete' | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [isTrial, setIsTrial] = useState(false);
  const [trialDurationHours, setTrialDurationHours] = useState(24);
  const [selectedTier, setSelectedTier] = useState('basic');
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertingKey, setConvertingKey] = useState<LicenseKey | null>(null);
  const [convertExpiresAt, setConvertExpiresAt] = useState('');
  const [convertMaxDevices, setConvertMaxDevices] = useState(1);
  const [convertTier, setConvertTier] = useState('basic');
  const [bulkCount, setBulkCount] = useState(1);
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [offlineKeyId, setOfflineKeyId] = useState<string | null>(null);
  const [offlineUdid, setOfflineUdid] = useState('');
  const [offlineBundleId, setOfflineBundleId] = useState('');
  const [allowedIPs, setAllowedIPs] = useState('');
  const [editAllowedIPs, setEditAllowedIPs] = useState('');
  const [bundleIds, setBundleIds] = useState('');
  const [editBundleIds, setEditBundleIds] = useState('');
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [renewKey, setRenewKey] = useState<LicenseKey | null>(null);
  const [extendDays, setExtendDays] = useState(30);
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [cloneKey, setCloneKey] = useState<LicenseKey | null>(null);
  const [cloneCount, setCloneCount] = useState(1);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJson, setImportJson] = useState('');

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const data = await keysApi.getAll({ page, search, status: statusFilter || undefined, tier: tierFilter || undefined });
      setKeys(data.keys);
      setTotal(data.totalPages);
    } catch {
      toast.error('Failed to fetch keys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchKeys(); }, [page, search, statusFilter, tierFilter]);

  const handleCreate = async () => {
    if (!newExpiresAt && !isTrial) { toast.error('Expiration date is required'); return; }
    const t = toast.loading(bulkCount > 1 ? `Creating ${bulkCount} keys...` : (isTrial ? 'Creating trial key...' : 'Creating key...'));
    try {
      const ips = allowedIPs ? allowedIPs.split(',').map(ip => ip.trim()).filter(ip => ip) : [];
      const bundles = bundleIds ? bundleIds.split(',').map(b => b.trim()).filter(b => b) : [];
      const result = await keysApi.create(newExpiresAt, newMaxDevices, isTrial, trialDurationHours, selectedTier, bulkCount > 1 ? bulkCount : undefined, ips, bundles);
      if (bulkCount > 1 && result.keys) {
        toast.success(`Created ${result.count} keys`, { id: t });
        // Copy keys to clipboard
        const keysList = result.keys.map((k: any) => k.keyValue).join('\n');
        navigator.clipboard.writeText(keysList);
      } else {
        toast.success(isTrial ? 'Trial key created' : 'Key created', { id: t });
      }
      setShowModal(false);
      setNewExpiresAt(''); setNewMaxDevices(1); setIsTrial(false);
      setTrialDurationHours(24); setSelectedTier('basic'); setBulkCount(1); setAllowedIPs('');
      fetchKeys();
    } catch { toast.error('Failed to create key', { id: t }); }
  };

  const handleEdit = (key: LicenseKey) => {
    setEditingKey(key);
    setNewExpiresAt(key.expiresAt.slice(0, 16));
    setNewMaxDevices(key.maxDevices);
    setSelectedTier(key.tier);
    setEditAllowedIPs(key.allowedIPs?.join(', ') || '');
    setEditBundleIds(key.bundleIds?.join(', ') || '');
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!editingKey || !newExpiresAt) { toast.error('Please fill all required fields'); return; }
    const t = toast.loading('Updating...');
    try {
      const ips = editAllowedIPs ? editAllowedIPs.split(',').map(ip => ip.trim()).filter(ip => ip) : [];
      const bundles = editBundleIds ? editBundleIds.split(',').map(b => b.trim()).filter(b => b) : [];
      await keysApi.update(editingKey.id, { expiresAt: new Date(newExpiresAt).toISOString(), maxDevices: newMaxDevices, tier: selectedTier, allowedIPs: ips, bundleIds: bundles });
      toast.success('Key updated', { id: t });
      setShowEditModal(false); setEditingKey(null); fetchKeys();
    } catch { toast.error('Update failed', { id: t }); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this key? This cannot be undone.')) return;
    const t = toast.loading('Deleting...');
    try {
      await keysApi.delete(id);
      toast.success('Key deleted', { id: t });
      setSelectedKeys(prev => { const n = new Set(prev); n.delete(id); return n; });
      fetchKeys();
    } catch { toast.error('Delete failed', { id: t }); }
  };

  const handleBan = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'banned' ? 'active' : 'banned';
    const t = toast.loading('Updating...');
    try {
      await keysApi.update(id, { status: newStatus });
      toast.success(`Key ${newStatus === 'banned' ? 'banned' : 'unbanned'}`, { id: t });
      fetchKeys();
    } catch { toast.error('Update failed', { id: t }); }
  };

  const handleReset = async (id: string) => {
    if (!confirm('Disconnect all devices?')) return;
    const t = toast.loading('Resetting...');
    try {
      await keysApi.resetDevices(id);
      toast.success('Devices reset', { id: t }); fetchKeys();
    } catch { toast.error('Reset failed', { id: t }); }
  };

  const handleConvertTrial = async () => {
    if (!convertingKey) return;
    const t = toast.loading('Converting...');
    try {
      await keysApi.convertTrial(convertingKey.id, convertExpiresAt ? new Date(convertExpiresAt).toISOString() : undefined, convertMaxDevices, convertTier);
      toast.success('Trial converted', { id: t });
      setShowConvertModal(false); setConvertingKey(null); fetchKeys();
    } catch { toast.error('Conversion failed', { id: t }); }
  };

  const handleGenerateOffline = async () => {
    if (!offlineKeyId || !offlineUdid || !offlineBundleId) { toast.error('Please fill all fields'); return; }
    const t = toast.loading('Generating offline license...');
    try {
      const result = await keysApi.generateOffline(offlineKeyId, offlineUdid, offlineBundleId);
      toast.success('Offline license generated', { id: t });
      // Copy to clipboard
      navigator.clipboard.writeText(result.licenseData);
      setShowOfflineModal(false); setOfflineKeyId(null); setOfflineUdid(''); setOfflineBundleId('');
      toast.success('License data copied to clipboard');
    } catch { toast.error('Failed to generate offline license', { id: t }); }
  };

  const openOfflineModal = (id: string) => {
    setOfflineKeyId(id); setShowOfflineModal(true);
  };

  const openRenewModal = (key: LicenseKey) => {
    setRenewKey(key); setShowRenewModal(true);
  };

  const handleRenew = async () => {
    if (!renewKey) return;
    const t = toast.loading('Extending key...');
    try {
      await keysApi.renew(renewKey.id, undefined, extendDays);
      toast.success(`Extended by ${extendDays} days`, { id: t });
      setShowRenewModal(false); setRenewKey(null); fetchKeys();
    } catch { toast.error('Renew failed', { id: t }); }
  };

  const openCloneModal = (key: LicenseKey) => {
    setCloneKey(key); setShowCloneModal(true);
  };

  const handleClone = async () => {
    if (!cloneKey) return;
    const t = toast.loading('Cloning key...');
    try {
      const result = await keysApi.clone(cloneKey.id, cloneCount);
      toast.success(`Created ${result.count} clones`, { id: t });
      const keysList = result.keys.map((k: any) => k.keyValue).join('\n');
      navigator.clipboard.writeText(keysList);
      setShowCloneModal(false); setCloneKey(null); fetchKeys();
    } catch { toast.error('Clone failed', { id: t }); }
  };

  const handleImport = async () => {
    if (!importJson.trim()) { toast.error('Please paste JSON data'); return; }
    let keys: any[];
    try { keys = JSON.parse(importJson); } catch { toast.error('Invalid JSON'); return; }
    if (!Array.isArray(keys)) { toast.error('Expected array of keys'); return; }
    const t = toast.loading(`Importing ${keys.length} keys...`);
    try {
      const result = await keysApi.import(keys);
      toast.success(`Imported ${result.count} keys`, { id: t });
      setShowImportModal(false); setImportJson(''); fetchKeys();
    } catch { toast.error('Import failed', { id: t }); }
  };

  const handleCopyKey = (id: string, keyValue: string) => {
    navigator.clipboard.writeText(keyValue);
    setCopiedKeyId(id);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const handleSelectAll = () => {
    setSelectedKeys(selectedKeys.size === keys.length ? new Set() : new Set(keys.map(k => k.id)));
  };

  const handleSelectKey = (id: string) => {
    setSelectedKeys(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedKeys.size === 0) return;
    if (!confirm(`Confirm: ${bulkAction} ${selectedKeys.size} keys?`)) { setShowBulkConfirm(false); return; }
    const t = toast.loading(`Processing ${selectedKeys.size} keys...`);
    try {
      const ids = Array.from(selectedKeys);
      if (bulkAction === 'delete') { await Promise.allSettled(ids.map(id => keysApi.delete(id))); }
      else { const ns = bulkAction === 'ban' ? 'banned' : 'active'; await Promise.allSettled(ids.map(id => keysApi.update(id, { status: ns }))); }
      toast.success(`${selectedKeys.size} keys ${bulkAction === 'delete' ? 'deleted' : bulkAction + 'ed'}`, { id: t });
      setSelectedKeys(new Set()); setShowBulkConfirm(false); setBulkAction(null); fetchKeys();
    } catch { toast.error('Bulk operation failed', { id: t }); }
  };

  const handleExportCSV = () => {
    const headers = ['Key', 'Status', 'Trial', 'Tier', 'Max Devices', 'Devices', 'Expires', 'Created'];
    const rows = keys.map(k => [k.keyValue, k.status, k.isTrial ? 'Yes' : 'No', k.tier, k.maxDevices, k._count.devices, new Date(k.expiresAt).toISOString(), new Date(k.createdAt).toISOString()]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `license-keys-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(a.href);
    toast.success('CSV exported');
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const pageNumbers = useMemo(() => {
    const pages: (number | 'ellipsis')[] = [];
    if (total <= 7) { for (let i = 1; i <= total; i++) pages.push(i); }
    else { pages.push(1); if (page > 3) pages.push('ellipsis'); for (let i = Math.max(2, page - 1); i <= Math.min(total - 1, page + 1); i++) pages.push(i); if (page < total - 2) pages.push('ellipsis'); pages.push(total); }
    return pages;
  }, [page, total]);

  const Modal = ({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-md rounded-2xl p-6 animate-fade-in-up"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xl)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--text-muted)', background: 'var(--bg-tertiary)' }}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );

  const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} className="w-full px-4 py-2.5 rounded-xl text-sm transition-all"
      style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)', ...props.style }} />
  );

  const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) => (
    <select {...props} className="w-full px-4 py-2.5 rounded-xl text-sm transition-all appearance-none cursor-pointer"
      style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
      {props.children}
    </select>
  );

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>License Keys</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{keys.length} of {total * 10}+ total keys</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            <Download size={16} /> Import
          </button>
          <button onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            <Download size={16} /> Export
          </button>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 14px rgba(99,102,241,0.3)' }}>
            <Plus size={16} /> Create Key
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input type="text" placeholder="Search keys..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-4 py-2.5 rounded-xl text-sm"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="banned">Banned</option>
        </select>
        <select value={tierFilter} onChange={(e) => { setTierFilter(e.target.value); setPage(1); }}
          className="px-4 py-2.5 rounded-xl text-sm"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
          <option value="">All Tiers</option>
          <option value="basic">Basic</option>
          <option value="pro">Pro</option>
          <option value="premium">Premium</option>
        </select>
        <button onClick={fetchKeys} className="p-2.5 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
          <RefreshCw size={16} />
        </button>

        {selectedKeys.size > 0 && (
          <div className="flex items-center gap-2 ml-auto px-4 py-2 rounded-xl"
            style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <span className="text-sm font-medium text-indigo-400">{selectedKeys.size} selected</span>
            <button onClick={() => { setBulkAction('ban'); setShowBulkConfirm(true); }}
              className="px-2.5 py-1 rounded-lg text-xs font-medium text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 transition-colors">Ban</button>
            <button onClick={() => { setBulkAction('unban'); setShowBulkConfirm(true); }}
              className="px-2.5 py-1 rounded-lg text-xs font-medium text-green-400 bg-green-500/10 hover:bg-green-500/20 transition-colors">Unban</button>
            <button onClick={() => { setBulkAction('delete'); setShowBulkConfirm(true); }}
              className="px-2.5 py-1 rounded-lg text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors">Delete</button>
            <button onClick={() => setSelectedKeys(new Set())} className="p-1 rounded hover:bg-white/10"><X size={14} /></button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="table-container" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
        <table>
          <thead>
            <tr style={{ background: 'var(--bg-tertiary)' }}>
              <th className="px-4 py-3 text-left">
                <input type="checkbox" checked={selectedKeys.size === keys.length && keys.length > 0} onChange={handleSelectAll}
                  className="rounded" style={{ accentColor: '#6366f1' }} />
              </th>
              {['Key', 'Status', 'Devices', 'Tier', 'Expires', 'Bundles', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              : keys.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                  <div className="flex flex-col items-center gap-2"><KeyIcon size={32} className="opacity-30" /><p>No keys found</p></div>
                </td></tr>
              ) : keys.map((key) => {
                const sb = statusBadge[key.status];
                const SbIcon = sb.icon;
                return (
                  <tr key={key.id} className="transition-colors"
                    style={{ borderBottom: '1px solid var(--border)', background: selectedKeys.has(key.id) ? 'rgba(99,102,241,0.05)' : 'transparent' }}>
                    <td className="px-4 py-3"><input type="checkbox" checked={selectedKeys.has(key.id)} onChange={() => handleSelectKey(key.id)} className="rounded" style={{ accentColor: '#6366f1' }} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">{key.keyValue}</span>
                        <button onClick={() => handleCopyKey(key.id, key.keyValue)} className="transition-colors" style={{ color: 'var(--text-muted)' }}>
                          {copiedKeyId === key.id ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5 flex-wrap">
                        {key.isTrial && <span className="px-2 py-0.5 rounded-full text-xs font-medium badge-purple">Trial</span>}
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${sb.cls}`}>
                          <SbIcon size={12} />{key.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <span className={key._count.devices >= key.maxDevices ? 'text-red-400' : 'text-green-400'}>
                        {key._count.devices}/{key.maxDevices}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tierColors[key.tier] || 'badge-info'}`}>{key.tier}</span>
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{formatDate(key.expiresAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {key.bundleIds && key.bundleIds.length > 0 ? key.bundleIds.slice(0, 2).map((b, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded text-xs bg-indigo-500/20 text-indigo-400">{b.split('.').pop()}</span>
                        )) : <span className="text-xs" style={{ color: 'var(--text-muted)' }}>All</span>}
                        {key.bundleIds && key.bundleIds.length > 2 && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>+{key.bundleIds.length - 2}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {key.isTrial && (
                          <button onClick={() => { setConvertingKey(key); setConvertExpiresAt(key.expiresAt.slice(0, 16)); setConvertMaxDevices(key.maxDevices); setConvertTier(key.tier); setShowConvertModal(true); }}
                            className="p-1.5 rounded-lg transition-colors text-purple-400 hover:bg-purple-500/10" title="Convert"><Clock size={15} /></button>
                        )}
                        <button onClick={() => handleEdit(key)} className="p-1.5 rounded-lg transition-colors hover:bg-blue-500/10" style={{ color: '#60a5fa' }} title="Edit"><Edit2 size={15} /></button>
                        <button onClick={() => handleBan(key.id, key.status)}
                          className="p-1.5 rounded-lg transition-colors" style={{ color: key.status === 'banned' ? '#10b981' : '#fb923c' }} title={key.status === 'banned' ? 'Unban' : 'Ban'}>
                          {key.status === 'banned' ? <Unlock size={15} /> : <Ban size={15} />}
                        </button>
                        <button onClick={() => handleReset(key.id)} className="p-1.5 rounded-lg transition-colors hover:bg-blue-500/10" style={{ color: '#60a5fa' }} title="Reset devices"><RefreshCw size={15} /></button>
                        <button onClick={() => openOfflineModal(key.id)} className="p-1.5 rounded-lg transition-colors hover:bg-green-500/10 text-green-400" title="Generate offline license"><Download size={15} /></button>
                        <button onClick={() => openRenewModal(key)} className="p-1.5 rounded-lg transition-colors hover:bg-yellow-500/10 text-yellow-400" title="Renew key"><Clock size={15} /></button>
                        <button onClick={() => openCloneModal(key)} className="p-1.5 rounded-lg transition-colors hover:bg-purple-500/10 text-purple-400" title="Clone key">⧉</button>
                        <button onClick={() => router.push(`/dashboard/keys/${key.id}`)} className="p-1.5 rounded-lg transition-colors hover:bg-indigo-500/10" style={{ color: '#818cf8' }} title="View devices">→</button>
                        <button onClick={() => handleDelete(key.id)} className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10 text-red-400" title="Delete"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 1 && (
        <div className="flex items-center justify-center gap-1">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="p-2 rounded-xl disabled:opacity-30 transition-colors"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            <ChevronLeft size={16} />
          </button>
          {pageNumbers.map((num, idx) => num === 'ellipsis'
            ? <span key={`e${idx}`} className="px-3 py-2 text-sm" style={{ color: 'var(--text-muted)' }}>…</span>
            : <button key={num} onClick={() => setPage(num)}
                className="px-3.5 py-2 rounded-xl text-sm font-medium transition-colors"
                style={page === num ? { background: '#6366f1', color: '#fff' } : { background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                {num}
              </button>
          )}
          <button onClick={() => setPage(p => Math.min(total, p + 1))} disabled={page === total}
            className="p-2 rounded-xl disabled:opacity-30 transition-colors"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <Modal title="Create New Key" onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl" style={{ background: 'var(--bg-tertiary)' }}>
              <input type="checkbox" checked={isTrial} onChange={(e) => setIsTrial(e.target.checked)} style={{ accentColor: '#6366f1' }} />
              <div>
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Trial Key</span>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Auto-expires 12-72h after first use</p>
              </div>
            </label>
            {isTrial && (
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Trial Duration</label>
                <Select value={trialDurationHours} onChange={(e) => setTrialDurationHours(parseInt(e.target.value))}>
                  <option value={12}>12 hours</option><option value={24}>24 hours</option>
                  <option value={48}>48 hours</option><option value={72}>72 hours</option>
                </Select>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>License Tier</label>
              <Select value={selectedTier} onChange={(e) => setSelectedTier(e.target.value)}>
                <option value="basic">Basic</option><option value="pro">Pro</option><option value="premium">Premium</option>
              </Select>
            </div>
            {!isTrial && (
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Expiration Date</label>
                <Input type="datetime-local" value={newExpiresAt} onChange={(e) => setNewExpiresAt(e.target.value)} />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Max Devices</label>
              <Input type="number" min={1} max={100} value={newMaxDevices} onChange={(e) => setNewMaxDevices(parseInt(e.target.value) || 1)} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Quantity (bulk generate)</label>
              <Input type="number" min={1} max={1000} value={bulkCount} onChange={(e) => setBulkCount(parseInt(e.target.value) || 1)} />
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Generate multiple keys at once</p>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>IP Whitelist (optional)</label>
              <Input type="text" value={allowedIPs} onChange={(e) => setAllowedIPs(e.target.value)} placeholder="192.168.1.1, 10.0.0.0/24" />
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Comma-separated IPs or CIDR ranges</p>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Allowed Bundles (optional)</label>
              <Input type="text" value={bundleIds} onChange={(e) => setBundleIds(e.target.value)} placeholder="com.app.id, com.app.id2" />
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Bundle IDs key works for</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl font-medium transition-colors"
                style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>Cancel</button>
              <button onClick={handleCreate}
                className="flex-1 py-2.5 rounded-xl font-medium text-white transition-all"
                style={{ background: isTrial ? '#8b5cf6' : 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                Create {isTrial ? 'Trial' : 'Key'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Modal */}
      {showEditModal && editingKey && (
        <Modal title="Edit Key" onClose={() => { setShowEditModal(false); setEditingKey(null); }}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Key</label>
              <div className="font-mono text-sm px-4 py-2.5 rounded-xl" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>{editingKey.keyValue}</div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>License Tier</label>
              <Select value={selectedTier} onChange={(e) => setSelectedTier(e.target.value)}>
                <option value="basic">Basic</option><option value="pro">Pro</option><option value="premium">Premium</option>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Expiration Date</label>
              <Input type="datetime-local" value={newExpiresAt} onChange={(e) => setNewExpiresAt(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Max Devices</label>
              <Input type="number" min={1} max={100} value={newMaxDevices} onChange={(e) => setNewMaxDevices(parseInt(e.target.value) || 1)} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>IP Whitelist</label>
              <Input type="text" value={editAllowedIPs} onChange={(e) => setEditAllowedIPs(e.target.value)} placeholder="192.168.1.1, 10.0.0.0/24" />
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Comma-separated IPs or CIDR</p>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Allowed Bundles</label>
              <Input type="text" value={editBundleIds} onChange={(e) => setEditBundleIds(e.target.value)} placeholder="com.app.id, com.app.id2" />
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Bundle IDs this key works for</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setShowEditModal(false); setEditingKey(null); }} className="flex-1 py-2.5 rounded-xl font-medium transition-colors"
                style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>Cancel</button>
              <button onClick={handleUpdate}
                className="flex-1 py-2.5 rounded-xl font-medium text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                Save Changes
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Bulk Confirm */}
      {showBulkConfirm && (
        <Modal title="Confirm Action" onClose={() => { setShowBulkConfirm(false); setBulkAction(null); }}>
          <p className="mb-5 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {bulkAction === 'ban' && `Ban ${selectedKeys.size} selected keys?`}
            {bulkAction === 'unban' && `Unban ${selectedKeys.size} selected keys?`}
            {bulkAction === 'delete' && `Delete ${selectedKeys.size} selected keys? This cannot be undone.`}
          </p>
          <div className="flex gap-3">
            <button onClick={() => { setShowBulkConfirm(false); setBulkAction(null); }}
              className="flex-1 py-2.5 rounded-xl font-medium transition-colors"
              style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>Cancel</button>
            <button onClick={handleBulkAction}
              className="flex-1 py-2.5 rounded-xl font-medium text-white transition-all"
              style={{ background: bulkAction === 'delete' ? '#ef4444' : '#6366f1' }}>
              Confirm
            </button>
          </div>
        </Modal>
      )}

      {/* Convert Trial Modal */}
      {showConvertModal && convertingKey && (
        <Modal title="Convert Trial Key" onClose={() => { setShowConvertModal(false); setConvertingKey(null); }}>
          <p className="mb-4 text-xs" style={{ color: 'var(--text-muted)' }}>
            Converting: <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>{convertingKey.keyValue}</span>
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Expiration Date</label>
              <Input type="datetime-local" value={convertExpiresAt} onChange={(e) => setConvertExpiresAt(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Max Devices</label>
              <Input type="number" min={1} max={100} value={convertMaxDevices} onChange={(e) => setConvertMaxDevices(parseInt(e.target.value) || 1)} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>License Tier</label>
              <Select value={convertTier} onChange={(e) => setConvertTier(e.target.value)}>
                <option value="basic">Basic</option><option value="pro">Pro</option><option value="premium">Premium</option>
              </Select>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setShowConvertModal(false); setConvertingKey(null); }}
                className="flex-1 py-2.5 rounded-xl font-medium transition-colors"
                style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>Cancel</button>
              <button onClick={handleConvertTrial}
                className="flex-1 py-2.5 rounded-xl font-medium text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #c084fc)' }}>
                Convert to Paid
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Offline License Modal */}
      {showOfflineModal && (
        <Modal title="Generate Offline License" onClose={() => { setShowOfflineModal(false); setOfflineKeyId(null); setOfflineUdid(''); setOfflineBundleId(''); }}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Device UDID</label>
              <Input type="text" value={offlineUdid} onChange={(e) => setOfflineUdid(e.target.value)} placeholder="e.g., ABC123-DEF456" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Bundle ID</label>
              <Input type="text" value={offlineBundleId} onChange={(e) => setOfflineBundleId(e.target.value)} placeholder="e.g., com.example.app" />
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>The generated license will be bound to this device and cannot be used on other devices.</p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setShowOfflineModal(false); setOfflineKeyId(null); setOfflineUdid(''); setOfflineBundleId(''); }}
                className="flex-1 py-2.5 rounded-xl font-medium transition-colors"
                style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>Cancel</button>
              <button onClick={handleGenerateOffline}
                className="flex-1 py-2.5 rounded-xl font-medium text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #10b981, #34d399)' }}>
                Generate
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Renew Key Modal */}
      {showRenewModal && renewKey && (
        <Modal title="Renew Key" onClose={() => { setShowRenewModal(false); setRenewKey(null); }}>
          <p className="mb-4 text-xs" style={{ color: 'var(--text-muted)' }}>
            Renew: <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>{renewKey.keyValue}</span>
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Extend by (days)</label>
              <Select value={extendDays} onChange={(e) => setExtendDays(parseInt(e.target.value))}>
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
                <option value={180}>180 days</option>
                <option value={365}>1 year</option>
              </Select>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>New expiration: {renewKey.expiresAt ? formatDate(new Date(new Date(renewKey.expiresAt).getTime() + extendDays * 24 * 60 * 60 * 1000).toISOString()) : 'N/A'}</p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setShowRenewModal(false); setRenewKey(null); }}
                className="flex-1 py-2.5 rounded-xl font-medium transition-colors"
                style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>Cancel</button>
              <button onClick={handleRenew}
                className="flex-1 py-2.5 rounded-xl font-medium text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #eab308, #facc15)' }}>
                Renew Key
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Clone Key Modal */}
      {showCloneModal && cloneKey && (
        <Modal title="Clone Key" onClose={() => { setShowCloneModal(false); setCloneKey(null); }}>
          <p className="mb-4 text-xs" style={{ color: 'var(--text-muted)' }}>
            Clone: <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>{cloneKey.keyValue}</span>
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Number of clones</label>
              <Input type="number" min={1} max={100} value={cloneCount} onChange={(e) => setCloneCount(parseInt(e.target.value) || 1)} />
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Clones will have the same expiration and settings as the original</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setShowCloneModal(false); setCloneKey(null); }}
                className="flex-1 py-2.5 rounded-xl font-medium transition-colors"
                style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>Cancel</button>
              <button onClick={handleClone}
                className="flex-1 py-2.5 rounded-xl font-medium text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)' }}>
                Clone Key
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <Modal title="Import Keys" onClose={() => { setShowImportModal(false); setImportJson(''); }}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Paste JSON keys</label>
              <textarea value={importJson} onChange={(e) => setImportJson(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-sm font-mono"
                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)', minHeight: '200px' }}
                placeholder='[{"keyValue": "XXXX-XXXX-XXXX-XXXX", "expiresAt": "2025-12-31", "maxDevices": 1, "tier": "basic"}]' />
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Format: Array of objects with keyValue, expiresAt (ISO), maxDevices, tier, isTrial, allowedIPs, bundleIds</p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setShowImportModal(false); setImportJson(''); }}
                className="flex-1 py-2.5 rounded-xl font-medium transition-colors"
                style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>Cancel</button>
              <button onClick={handleImport}
                className="flex-1 py-2.5 rounded-xl font-medium text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                Import Keys
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
