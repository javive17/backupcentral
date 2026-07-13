import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Database, Plus, Trash2, Edit, Play, RefreshCw, Wifi, X, HardDrive } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function ConnectionModal({ connection, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: '', host: '', port: 3306, username: '', password: '', databases_to_backup: '*', description: '',
    ...(connection || {}),
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [availDbs, setAvailDbs] = useState([]);

  async function testConn() {
    try {
      setTesting(true);
      let id = connection?.id;
      if (!id) {
        const result = await api.dbConnections.create(form);
        id = result.id;
      }
      const result = await api.dbConnections.test(id);
      toast.success(`Connected! MySQL ${result.version}`);
      setAvailDbs(result.databases || []);
      if (!connection?.id) { onSaved(); }
    } catch (err) {
      toast.error(`Connection failed: ${err.message}`);
    } finally {
      setTesting(false);
    }
  }

  async function save() {
    try {
      setSaving(true);
      if (connection?.id) {
        await api.dbConnections.update(connection.id, form);
        toast.success('Connection updated');
      } else {
        await api.dbConnections.create(form);
        toast.success('Connection created');
      }
      onSaved();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">{connection?.id ? 'Edit' : 'Add'} Database Connection</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div><label className="label">Name</label><input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Production DB" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Host</label><input className="input-field" value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} placeholder="192.168.1.50" /></div>
            <div><label className="label">Port</label><input className="input-field" type="number" value={form.port} onChange={(e) => setForm({ ...form, port: parseInt(e.target.value) || 3306 })} /></div>
          </div>
          <div><label className="label">Username</label><input className="input-field" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="backup_user" /></div>
          <div><label className="label">Password</label><input className="input-field" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="********" /></div>
          <div>
            <label className="label">Databases</label>
            <input className="input-field" value={form.databases_to_backup} onChange={(e) => setForm({ ...form, databases_to_backup: e.target.value })} placeholder="* (all) or db1,db2" />
            {availDbs.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {availDbs.map(db => (
                  <button key={db} onClick={() => {
                    const current = form.databases_to_backup === '*' ? '' : form.databases_to_backup;
                    const list = current ? current.split(',').map(d => d.trim()) : [];
                    if (!list.includes(db)) { list.push(db); setForm({ ...form, databases_to_backup: list.join(',') }); }
                  }} className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-400 hover:bg-gray-700 hover:text-gray-200">
                    {db}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div><label className="label">Description</label><input className="input-field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional" /></div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={testConn} disabled={testing || !form.name || !form.host || !form.username} className="btn-secondary flex items-center gap-2">
            <Wifi className={`w-4 h-4 ${testing ? 'animate-pulse' : ''}`} /> {testing ? 'Testing...' : 'Test & Save'}
          </button>
          <button onClick={save} disabled={saving || !form.name || !form.host || !form.username} className="btn-primary">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function BackupModal({ connection, onClose, onSaved }) {
  const [databases, setDatabases] = useState([]);
  const [selectedDbs, setSelectedDbs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadDatabases() {
    try {
      setLoading(true);
      const dbs = await api.dbConnections.databases(connection.id);
      setDatabases(dbs);
      setSelectedDbs(dbs);
    } catch (err) {
      toast.error('Failed to list databases');
    } finally {
      setLoading(false);
    }
  }

  async function startBackup() {
    try {
      setSaving(true);
      await api.dbBackups.create({ connection_id: connection.id, databases: selectedDbs });
      toast.success('Database backup started');
      onSaved();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => { loadDatabases(); }, []);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Backup from {connection.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200"><X className="w-5 h-5" /></button>
        </div>
        {loading ? (
          <div className="text-center py-6 text-gray-500">Loading databases...</div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">Select databases to backup:</p>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedDbs.length === databases.length}
                  onChange={() => setSelectedDbs(selectedDbs.length === databases.length ? [] : [...databases])}
                  className="rounded border-gray-600 bg-gray-800 text-brand-500 focus:ring-brand-500"
                />
                All databases
              </label>
              {databases.map(db => (
                <label key={db} className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer ml-2">
                  <input
                    type="checkbox"
                    checked={selectedDbs.includes(db)}
                    onChange={() => setSelectedDbs(prev => prev.includes(db) ? prev.filter(d => d !== db) : [...prev, db])}
                    className="rounded border-gray-600 bg-gray-800 text-brand-500 focus:ring-brand-500"
                  />
                  <span className="font-mono">{db}</span>
                </label>
              ))}
            </div>
          </div>
        )}
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={startBackup} disabled={saving || selectedDbs.length === 0} className="btn-success flex items-center gap-2">
            <Play className="w-4 h-4" /> {saving ? 'Starting...' : 'Start Backup'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DatabaseServersPage() {
  const [connections, setConnections] = useState([]);
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [backupModal, setBackupModal] = useState(null);
  const [testing, setTesting] = useState(null);
  const [selected, setSelected] = useState(null);

  async function load() {
    try {
      setLoading(true);
      const [conns, bcks] = await Promise.all([
        api.dbConnections.list(),
        api.dbBackups.list(),
      ]);
      setConnections(conns);
      setBackups(bcks);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function testConnection(conn) {
    try {
      setTesting(conn.id);
      const result = await api.dbConnections.test(conn.id);
      toast.success(`Connected! MySQL ${result.version}, ${result.databases?.length || 0} databases`);
    } catch (err) {
      toast.error(`Connection failed: ${err.message}`);
    } finally {
      setTesting(null);
    }
  }

  async function deleteConnection(id) {
    if (!confirm('Delete this connection and all its backups?')) return;
    try {
      await api.dbConnections.delete(id);
      toast.success('Connection deleted');
      setSelected(null);
      load();
    } catch (err) {
      toast.error('Delete failed');
    }
  }

  async function deleteBackup(id) {
    if (!confirm('Delete this backup?')) return;
    try {
      await api.dbBackups.delete(id);
      toast.success('Backup deleted');
      load();
    } catch (err) {
      toast.error('Delete failed');
    }
  }

  useEffect(() => { load(); }, []);

  const selectedConn = connections.find(c => c.id === selected);
  const filteredBackups = selected ? backups.filter(b => b.connection_id === selected) : backups;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Database Servers</h1>
        <button onClick={() => setModal({})} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Add Connection
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : connections.length === 0 ? (
        <div className="card text-center py-12">
          <Database className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-4">No database connections configured</p>
          <button onClick={() => setModal({})} className="btn-primary">Add Connection</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Connections</h2>
            {connections.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelected(selected === c.id ? null : c.id)}
                className={`card cursor-pointer transition-all ${selected === c.id ? 'border-brand-500 ring-1 ring-brand-500/30' : 'hover:border-gray-700'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Database className="w-5 h-5 text-emerald-400" />
                    <div>
                      <h3 className="font-semibold">{c.name}</h3>
                      <p className="text-xs text-gray-500 font-mono">{c.username}@{c.host}:{c.port}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); testConnection(c); }}
                      disabled={testing === c.id}
                      className="p-1.5 text-gray-400 hover:text-emerald-400 rounded-lg hover:bg-gray-800"
                      title="Test connection"
                    >
                      {testing === c.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setBackupModal(c); }}
                      className="p-1.5 text-gray-400 hover:text-brand-400 rounded-lg hover:bg-gray-800"
                      title="Backup now"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setModal(c); }}
                      className="p-1.5 text-gray-400 hover:text-amber-400 rounded-lg hover:bg-gray-800"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteConnection(c.id); }}
                      className="p-1.5 text-gray-400 hover:text-red-400 rounded-lg hover:bg-gray-800"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-xs text-gray-600">Databases: <span className="text-gray-400 font-mono">{c.databases_to_backup || '*'}</span></p>
                  {c.last_backup_at && (
                    <p className="text-xs text-gray-600">Last backup: {format(new Date(c.last_backup_at), 'MMM dd HH:mm')}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-2 space-y-3">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
              {selectedConn ? `Backups: ${selectedConn.name}` : 'All Database Backups'}
            </h2>
            {filteredBackups.length === 0 ? (
              <div className="card text-center py-8">
                <HardDrive className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No backups yet</p>
              </div>
            ) : (
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 text-xs uppercase border-b border-gray-800">
                        <th className="p-4">Server</th>
                        <th className="p-4">Database(s)</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Size</th>
                        <th className="p-4">Created</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBackups.map((b) => (
                        <tr key={b.id} className="table-row">
                          <td className="p-4 font-medium">{b.connection_name}</td>
                          <td className="p-4 text-gray-400 font-mono text-xs">{b.database_name}</td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              b.status === 'completed' ? 'bg-emerald-900/50 text-emerald-300' :
                              b.status === 'running' ? 'bg-blue-900/50 text-blue-300 animate-pulse' :
                              b.status === 'failed' ? 'bg-red-900/50 text-red-300' :
                              'bg-gray-800 text-gray-400'
                            }`}>{b.status}</span>
                            {b.error_message && <p className="text-xs text-red-400 mt-1">{b.error_message}</p>}
                          </td>
                          <td className="p-4 text-gray-400">{formatBytes(b.backup_size)}</td>
                          <td className="p-4 text-gray-400">{format(new Date(b.created_at), 'MMM dd HH:mm')}</td>
                          <td className="p-4">
                            <div className="flex justify-end">
                              <button onClick={() => deleteBackup(b.id)} className="p-2 text-gray-400 hover:text-red-400 rounded-lg hover:bg-gray-800">
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
        </div>
      )}

      {modal && <ConnectionModal connection={modal.id ? modal : null} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
      {backupModal && <BackupModal connection={backupModal} onClose={() => setBackupModal(null)} onSaved={() => { setBackupModal(null); load(); }} />}
    </div>
  );
}
