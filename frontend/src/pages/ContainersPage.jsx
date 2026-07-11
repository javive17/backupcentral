import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Container, RefreshCw, HardDrive, Clock, Server } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import BackupModal from '../components/BackupModal';

export default function ContainersPage() {
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [backupModal, setBackupModal] = useState(null);

  async function load() {
    try {
      setLoading(true);
      const data = await api.containers.list();
      setContainers(data);
    } catch (err) {
      toast.error('Failed to load containers');
    } finally {
      setLoading(false);
    }
  }

  async function sync() {
    try {
      setSyncing(true);
      const result = await api.containers.sync();
      toast.success(result.message);
      await load();
    } catch (err) {
      toast.error('Sync failed: ' + err.message);
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => { load(); }, []);

  function stateColor(state) {
    switch (state) {
      case 'running': return 'bg-emerald-900/50 text-emerald-300';
      case 'exited': return 'bg-gray-700/50 text-gray-400';
      case 'paused': return 'bg-amber-900/50 text-amber-300';
      default: return 'bg-gray-800 text-gray-500';
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Containers</h1>
        <div className="flex gap-3">
          <button onClick={sync} disabled={syncing} className="btn-primary flex items-center gap-2 text-sm">
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync from Portainer'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading containers...</div>
      ) : containers.length === 0 ? (
        <div className="card text-center py-12">
          <Server className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-4">No containers found. Click "Sync from Portainer" to discover containers.</p>
          <button onClick={sync} className="btn-primary">Sync Now</button>
        </div>
      ) : (
        <div className="grid gap-4">
          {containers.map((c) => (
            <div key={c.id} className="card flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gray-800 rounded-lg">
                  <Container className="w-6 h-6 text-brand-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{c.name}</h3>
                  <p className="text-sm text-gray-500 font-mono">{c.image}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${stateColor(c.state)}`}>
                      {c.state}
                    </span>
                    {c.stack_name && (
                      <span className="text-xs text-gray-500">Stack: {c.stack_name}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right text-sm">
                  <p className="text-gray-500">
                    <span className="text-gray-400">{c.backup_count || 0}</span> backups
                  </p>
                  {c.last_backup_at ? (
                    <p className="text-xs text-gray-600 flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3" />
                      {format(new Date(c.last_backup_at), 'MMM dd HH:mm')}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-600">No backups</p>
                  )}
                </div>
                <button
                  onClick={() => setBackupModal(c)}
                  className="btn-success flex items-center gap-2 text-sm"
                >
                  <HardDrive className="w-4 h-4" /> Backup
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {backupModal && (
        <BackupModal container={backupModal} onClose={() => setBackupModal(null)} />
      )}
    </div>
  );
}
