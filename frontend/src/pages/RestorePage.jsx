import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { RotateCcw, Server, Play, CheckCircle, XCircle, Clock, Loader } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function RestorePage() {
  const [logs, setLogs] = useState([]);
  const [containers, setContainers] = useState([]);
  const [selectedContainer, setSelectedContainer] = useState('');
  const [availableBackups, setAvailableBackups] = useState([]);
  const [selectedBackup, setSelectedBackup] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const [logsData, containersData] = await Promise.all([
        api.restore.logs(),
        api.containers.list(),
      ]);
      setLogs(logsData);
      setContainers(containersData);
    } catch (err) {
      toast.error('Failed to load restore data');
    } finally {
      setLoading(false);
    }
  }

  async function loadBackups(containerId) {
    setSelectedContainer(containerId);
    setSelectedBackup('');
    if (!containerId) { setAvailableBackups([]); return; }
    try {
      const data = await api.backups.list({ container_id: containerId, status: 'completed' });
      setAvailableBackups(data);
    } catch (err) {
      toast.error('Failed to load backups');
    }
  }

  async function handleRestore() {
    if (!selectedBackup) return toast.error('Select a backup to restore');
    setRestoring(true);
    try {
      await api.restore.create({
        backup_id: parseInt(selectedBackup),
        target_portainer_url: targetUrl || null,
      });
      toast.success('Restore started');
      setSelectedBackup('');
      load();
    } catch (err) {
      toast.error('Restore failed: ' + err.message);
    } finally {
      setRestoring(false);
    }
  }

  useEffect(() => { load(); }, []);

  function statusIcon(status) {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'running': return <Loader className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-400" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Restore & Migration</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-brand-400" /> Restore Container
          </h2>
          <p className="text-sm text-gray-500">Select a container and a backup to restore from. Optionally specify a different Portainer server for migration.</p>

          <div>
            <label className="label">Container</label>
            <select className="input-field" value={selectedContainer} onChange={e => loadBackups(e.target.value)}>
              <option value="">Select container...</option>
              {containers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Backup</label>
            <select className="input-field" value={selectedBackup} onChange={e => setSelectedBackup(e.target.value)}>
              <option value="">Select backup...</option>
              {availableBackups.map(b => (
                <option key={b.id} value={b.id}>
                  {b.type} - {format(new Date(b.created_at), 'MMM dd yyyy HH:mm')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Target Portainer URL (optional - for migration)</label>
            <input
              type="text"
              className="input-field"
              placeholder="http://new-server:9000"
              value={targetUrl}
              onChange={e => setTargetUrl(e.target.value)}
            />
            <p className="text-xs text-gray-600 mt-1">Leave empty to restore to current server</p>
          </div>

          <button onClick={handleRestore} disabled={!selectedBackup || restoring} className="btn-success flex items-center gap-2">
            <Play className="w-4 h-4" />
            {restoring ? 'Starting Restore...' : 'Start Restore'}
          </button>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Server className="w-5 h-5 text-brand-400" /> Restore History
          </h2>
          {loading ? (
            <p className="text-gray-500 text-center py-8">Loading...</p>
          ) : logs.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No restore operations yet</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
                  {statusIcon(log.status)}
                  <div className="flex-1">
                    <p className="text-sm font-medium">{log.container_name}</p>
                    <p className="text-xs text-gray-500">
                      {log.backup_type} backup - {format(new Date(log.created_at), 'MMM dd HH:mm')}
                    </p>
                    {log.target_portainer_url && (
                      <p className="text-xs text-brand-400">Target: {log.target_portainer_url}</p>
                    )}
                    {log.error_message && (
                      <p className="text-xs text-red-400 mt-1">{log.error_message}</p>
                    )}
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    log.status === 'completed' ? 'bg-emerald-900/50 text-emerald-300' :
                    log.status === 'running' ? 'bg-blue-900/50 text-blue-300' :
                    log.status === 'failed' ? 'bg-red-900/50 text-red-300' :
                    'bg-gray-800 text-gray-400'
                  }`}>{log.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
