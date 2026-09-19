'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { keysApi } from '@/lib/api';
import { ChevronLeft, Monitor, Clock, Globe, Smartphone, Activity } from 'lucide-react';
import toast from 'react-hot-toast';

interface Device {
  id: string;
  udid: string;
  bundleId: string;
  firstSeen: string;
  lastSeen: string;
}

export default function KeyDevicesPage() {
  const router = useRouter();
  const params = useParams();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.id) return;
    keysApi.getDevices(params.id as string)
      .then(setDevices)
      .catch(() => toast.error('Failed to load devices'))
      .finally(() => setLoading(false));
  }, [params.id]);

  const formatDate = (date: string) => new Date(date).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/dashboard/keys')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
          <ChevronLeft size={16} /> Back to Keys
        </button>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Registered Devices</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{devices.length} device{devices.length !== 1 ? 's' : ''} linked</p>
        </div>
      </div>

      {/* Device cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl p-5 h-36 animate-shimmer" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }} />
          ))}
        </div>
      ) : devices.length === 0 ? (
        <div className="rounded-2xl p-12 text-center" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <Monitor size={40} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--text-muted)' }} />
          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>No devices registered</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Devices will appear here when users validate their license key</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map((device, i) => (
            <div key={device.id} className="rounded-2xl p-5 transition-all hover:scale-[1.02]"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)', animationDelay: `${i * 50}ms` }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.1)' }}>
                  <Smartphone size={20} style={{ color: '#6366f1' }} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Device {i + 1}</p>
                  <p className="font-mono text-xs truncate" style={{ color: 'var(--text-primary)' }}>{device.udid}</p>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-start gap-2">
                  <Globe size={14} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                  <div className="min-w-0">
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Bundle ID</p>
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-secondary)' }}>{device.bundleId}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Clock size={14} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                  <div className="min-w-0">
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>First Seen</p>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{formatDate(device.firstSeen)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Activity size={14} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                  <div className="min-w-0">
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Last Seen</p>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{formatDate(device.lastSeen)}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
