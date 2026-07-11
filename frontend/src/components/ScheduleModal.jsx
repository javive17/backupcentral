import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { X, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

const CRON_PRESETS = [
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Every 12 hours', value: '0 */12 * * *' },
  { label: 'Daily at midnight', value: '0 0 * * *' },
  { label: 'Daily at 2 AM', value: '0 2 * * *' },
  { label: 'Weekly (Sunday 3 AM)', value: '0 3 * * 0' },
  { label: 'Weekly (Monday 3 AM)', value: '0 3 * * 1' },
  { label: 'Monthly (1st at 3 AM)', value: '0 3 1 * *' },
];

export default function ScheduleModal({ schedule, onClose }) {
  const [containers, setContainers] = useState([]);
  const [containerId, setContainerId] = useState(schedule?.container_id || '');
  const [name, setName] = useState(schedule?.name || '');
  const [cronExpression, setCronExpression] = useState(schedule?.cron_expression || '0 2 * * *');
  const [backupType, setBackupType] = useState(schedule?.backup_type || 'full');
  const [includeImage, setIncludeImage] = useState(schedule?.include_image ?? true);
  const [includeVolumes, setIncludeVolumes] = useState(schedule?.include_volumes ?? true);
  const [includeConfigs, setIncludeConfigs] = useState(schedule?.include_configs ?? true);
  const [includeFilesystem, setIncludeFilesystem] = useState(schedule?.include_filesystem ?? true);
  const [retentionCount, setRetentionCount] = useState(schedule?.retention_count || 10);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.containers.list().then(setContainers).catch(() => {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      if (schedule) {
        await api.schedules.update(schedule.id, {
          name, cron_expression: cronExpression, backup_type: backupType,
          include_image: includeImage, include_volumes: includeVolumes,
          include_configs: includeConfigs, include_filesystem: includeFilesystem,
          retention_count: retentionCount,
        });
        toast.success('Schedule updated');
      } else {
        await api.schedules.create({
          container_id: parseInt(containerId), name, cron_expression: cronExpression,
          backup_type: backupType, include_image: includeImage, include_volumes: includeVolumes,
          include_configs: includeConfigs, include_filesystem: includeFilesystem,
          retention_count: retentionCount,
        });
        toast.success('Schedule created');
      }
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-800 sticky top-0 bg-gray-900">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-amber-400" />
            {schedule ? 'Edit Schedule' : 'New Schedule'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {!schedule && (
            <div>
              <label className="label">Container</label>
              <select className="input-field" value={containerId} onChange={e => setContainerId(e.target.value)} required>
                <option value="">Select container...</option>
                {containers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="label">Schedule Name</label>
            <input type="text" className="input-field" placeholder="Daily backup" value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div>
            <label className="label">Cron Expression</label>
            <input type="text" className="input-field font-mono" value={cronExpression} onChange={e => setCronExpression(e.target.value)} required />
            <div className="flex flex-wrap gap-2 mt-2">
              {CRON_PRESETS.map(p => (
                <button key={p.value} type="button" onClick={() => setCronExpression(p.value)}
                  className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                    cronExpression === p.value ? 'border-amber-500 bg-amber-900/30 text-amber-300' : 'border-gray-700 text-gray-500 hover:border-gray-600'
                  }`}>{p.label}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Backup Type</label>
            <div className="flex gap-3">
              {['full', 'partial'].map(t => (
                <button key={t} type="button" onClick={() => setBackupType(t)}
                  className={`flex-1 p-2 rounded-lg border text-center text-sm transition-colors ${
                    backupType === t ? 'border-amber-500 bg-amber-600/10 text-amber-300' : 'border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
              ))}
            </div>
          </div>

          {backupType === 'partial' && (
            <div className="space-y-2">
              {[
                { label: 'Image', val: includeImage, set: setIncludeImage },
                { label: 'Volumes', val: includeVolumes, set: setIncludeVolumes },
                { label: 'Configs', val: includeConfigs, set: setIncludeConfigs },
                { label: 'Filesystem', val: includeFilesystem, set: setIncludeFilesystem },
              ].map(({ label, val, set }) => (
                <label key={label} className="flex items-center gap-2 text-sm text-gray-400">
                  <input type="checkbox" checked={val} onChange={e => set(e.target.checked)} className="rounded border-gray-600" />
                  {label}
                </label>
              ))}
            </div>
          )}

          <div>
            <label className="label">Retention (max backups to keep)</label>
            <input type="number" className="input-field" value={retentionCount} onChange={e => setRetentionCount(parseInt(e.target.value) || 10)} min="1" max="100" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Saving...' : schedule ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
