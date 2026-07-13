import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Container, HardDrive, Calendar, AlertTriangle, Clock, TrendingUp, RefreshCw, Server, Database } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function StatCard({ icon: Icon, label, value, color = 'text-brand-400', sub }) {
  return (
    <div className="stat-card">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gray-800">
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
          {sub && <p className="text-xs text-gray-600">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

function sourceBadge(source) {
  switch (source) {
    case 'container': return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-900/50 text-blue-300">Docker</span>;
    case 'remote': return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-900/50 text-purple-300">SSH</span>;
    case 'database': return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-900/50 text-emerald-300">DB</span>;
    default: return null;
  }
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
        <StatCard icon={HardDrive} label="Total Backups" value={data?.completedBackups || 0} color="text-emerald-400" sub={`${data?.remoteBackups || 0} SSH · ${data?.dbBackups || 0} DB`} />
        <StatCard icon={Calendar} label="Active Schedules" value={data?.activeSchedules || 0} color="text-amber-400" />
        <StatCard icon={AlertTriangle} label="Failed Today" value={data?.failedToday || 0} color={data?.failedToday > 0 ? 'text-red-400' : 'text-gray-500'} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-800">
              <HardDrive className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <p className="text-xl font-bold">{formatBytes(data?.totalBackupSize)}</p>
              <p className="text-xs text-gray-500">Total Backup Size</p>
            </div>
          </div>
          <div className="mt-3 flex gap-3 text-xs text-gray-600">
            <span>Docker: {formatBytes((data?.totalBackupSize || 0) - (data?.remoteBackupSize || 0) - (data?.dbBackupSize || 0))}</span>
            <span>·</span>
            <span>SSH: {formatBytes(data?.remoteBackupSize)}</span>
            <span>·</span>
            <span>DB: {formatBytes(data?.dbBackupSize)}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-800">
              <Server className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-xl font-bold">{data?.remoteConnections || 0}</p>
              <p className="text-xs text-gray-500">SSH Servers</p>
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-600">
            {data?.remoteBackups || 0} backups · {formatBytes(data?.remoteBackupSize)}
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-800">
              <Database className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xl font-bold">{data?.dbConnections || 0}</p>
              <p className="text-xs text-gray-500">DB Servers</p>
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-600">
            {data?.dbBackups || 0} backups · {formatBytes(data?.dbBackupSize)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-brand-400" /> Last Container Backup
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
            <p className="text-gray-500">No container backups yet</p>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-brand-400" /> Storage Breakdown
          </h2>
          <div className="space-y-3">
            {[
              { label: 'Docker Containers', size: (data?.totalBackupSize || 0) - (data?.remoteBackupSize || 0) - (data?.dbBackupSize || 0), color: 'bg-blue-500' },
              { label: 'SSH Remote Servers', size: data?.remoteBackupSize || 0, color: 'bg-purple-500' },
              { label: 'Database Dumps', size: data?.dbBackupSize || 0, color: 'bg-emerald-500' },
            ].map((item) => {
              const total = data?.totalBackupSize || 1;
              const pct = Math.max(1, (item.size / total) * 100);
              return (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">{item.label}</span>
                    <span className="text-gray-300 font-mono">{formatBytes(item.size)}</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${item.color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        {data?.recentBackups?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 text-xs uppercase border-b border-gray-800">
                  <th className="pb-3 pr-4">Source</th>
                  <th className="pb-3 pr-4">Name</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Size</th>
                  <th className="pb-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.recentBackups.map((b, i) => (
                  <tr key={`${b.source}-${b.id}-${i}`} className="table-row">
                    <td className="py-3 pr-4">{sourceBadge(b.source)}</td>
                    <td className="py-3 pr-4 font-medium">{b.container_name || b.connection_name || b.database_name}</td>
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
          <p className="text-gray-500 text-center py-8">No recent activity</p>
        )}
      </div>
    </div>
  );
}
