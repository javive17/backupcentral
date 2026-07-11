import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Container, HardDrive, Calendar, AlertTriangle, Clock, TrendingUp, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function StatCard({ icon: Icon, label, value, color = 'text-brand-400' }) {
  return (
    <div className="stat-card">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-gray-800`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setLoading(true);
      const d = await api.dashboard.get();
      setData(d);
    } catch (err) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading && !data) return <div className="flex items-center justify-center h-64"><div className="text-gray-500">Loading...</div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <button onClick={load} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Container} label="Containers" value={data?.containers || 0} color="text-blue-400" />
        <StatCard icon={HardDrive} label="Completed Backups" value={data?.completedBackups || 0} color="text-emerald-400" />
        <StatCard icon={Calendar} label="Active Schedules" value={data?.activeSchedules || 0} color="text-amber-400" />
        <StatCard icon={AlertTriangle} label="Failed Today" value={data?.failedToday || 0} color="text-red-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-brand-400" /> Backup Storage
          </h2>
          <div className="text-3xl font-bold text-brand-300">{formatBytes(data?.totalBackupSize)}</div>
          <p className="text-sm text-gray-500 mt-1">Total backup size across all containers</p>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-brand-400" /> Last Backup
          </h2>
          {data?.lastBackup ? (
            <div>
              <p className="text-lg font-medium">{data.lastBackup.container_name}</p>
              <p className="text-sm text-gray-400">
                {format(new Date(data.lastBackup.completed_at), 'MMM dd, yyyy HH:mm')}
              </p>
              <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-900/50 text-emerald-300">
                {data.lastBackup.type}
              </span>
            </div>
          ) : (
            <p className="text-gray-500">No backups yet</p>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Recent Backups</h2>
        {data?.recentBackups?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 text-xs uppercase border-b border-gray-800">
                  <th className="pb-3 pr-4">Container</th>
                  <th className="pb-3 pr-4">Type</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Size</th>
                  <th className="pb-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.recentBackups.map((b) => (
                  <tr key={b.id} className="table-row">
                    <td className="py-3 pr-4 font-medium">{b.container_name}</td>
                    <td className="py-3 pr-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        b.type === 'full' ? 'bg-brand-900/50 text-brand-300' : 'bg-amber-900/50 text-amber-300'
                      }`}>{b.type}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        b.status === 'completed' ? 'bg-emerald-900/50 text-emerald-300' :
                        b.status === 'running' ? 'bg-blue-900/50 text-blue-300' :
                        b.status === 'failed' ? 'bg-red-900/50 text-red-300' :
                        'bg-gray-800 text-gray-400'
                      }`}>{b.status}</span>
                    </td>
                    <td className="py-3 pr-4 text-gray-400">{formatBytes(b.backup_size)}</td>
                    <td className="py-3 text-gray-400">{format(new Date(b.created_at), 'MMM dd HH:mm')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No recent backups</p>
        )}
      </div>
    </div>
  );
}
