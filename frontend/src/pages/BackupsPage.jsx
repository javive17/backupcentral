import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { HardDrive, Trash2, Download, Eye, Filter } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function BackupsPage() {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  async function load() {
    try {
      setLoading(true);
      const params = filter !== 'all' ? { status: filter } : {};
      const data = await api.backups.list(params);
      setBackups(data);
    } catch (err) {
      toast.error('Failed to load backups');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filter]);

  async function deleteBackup(id) {
    if (!confirm('Delete this backup?')) return;
    try {
      await api.backups.delete(id);
      toast.success('Backup deleted');
      load();
    } catch (err) {
      toast.error('Delete failed');
    }
  }

  async function viewBackup(id) {
    try {
      const data = await api.backups.download(id);
      toast.success(`Files: ${data.files.join(', ')}`);
    } catch (err) {
      toast.error('Failed to get backup info');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Backups</h1>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          {['all', 'completed', 'running', 'failed'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f ? 'bg-brand-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading backups...</div>
      ) : backups.length === 0 ? (
        <div className="card text-center py-12">
          <HardDrive className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No backups found</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 text-xs uppercase border-b border-gray-800">
                  <th className="p-4">Container</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Size</th>
                  <th className="p-4">Created</th>
                  <th className="p-4">Completed</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((b) => (
                  <tr key={b.id} className="table-row">
                    <td className="p-4 font-medium">{b.container_name}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        b.type === 'full' ? 'bg-brand-900/50 text-brand-300' : 'bg-amber-900/50 text-amber-300'
                      }`}>{b.type}</span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        b.status === 'completed' ? 'bg-emerald-900/50 text-emerald-300' :
                        b.status === 'running' ? 'bg-blue-900/50 text-blue-300 animate-pulse' :
                        b.status === 'failed' ? 'bg-red-900/50 text-red-300' :
                        'bg-gray-800 text-gray-400'
                      }`}>{b.status}</span>
                    </td>
                    <td className="p-4 text-gray-400">{formatBytes(b.backup_size)}</td>
                    <td className="p-4 text-gray-400">{format(new Date(b.created_at), 'MMM dd HH:mm')}</td>
                    <td className="p-4 text-gray-400">
                      {b.completed_at ? format(new Date(b.completed_at), 'MMM dd HH:mm') : '-'}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => viewBackup(b.id)} className="p-2 text-gray-400 hover:text-brand-400 rounded-lg hover:bg-gray-800" title="View">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteBackup(b.id)} className="p-2 text-gray-400 hover:text-red-400 rounded-lg hover:bg-gray-800" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
