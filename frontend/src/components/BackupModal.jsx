import { useState } from 'react';
import { api } from '../services/api';
import { X, HardDrive, CheckSquare, Square } from 'lucide-react';
import toast from 'react-hot-toast';

export default function BackupModal({ container, onClose }) {
  const [type, setType] = useState('full');
  const [includeImage, setIncludeImage] = useState(true);
  const [includeVolumes, setIncludeVolumes] = useState(true);
  const [includeConfigs, setIncludeConfigs] = useState(true);
  const [includeFilesystem, setIncludeFilesystem] = useState(true);
  const [loading, setLoading] = useState(false);

  const isPartial = type === 'partial';

  async function handleBackup() {
    setLoading(true);
    try {
      await api.backups.create({
        container_id: container.id,
        type,
        include_image: isPartial ? includeImage : true,
        include_volumes: isPartial ? includeVolumes : true,
        include_configs: isPartial ? includeConfigs : true,
        include_filesystem: isPartial ? includeFilesystem : true,
      });
      toast.success(`Backup started for ${container.name}`);
      onClose();
    } catch (err) {
      toast.error('Backup failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-brand-400" />
            Backup {container.name}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <label className="label">Backup Type</label>
            <div className="flex gap-3">
              <button
                onClick={() => setType('full')}
                className={`flex-1 p-3 rounded-lg border text-center transition-colors ${
                  type === 'full' ? 'border-brand-500 bg-brand-600/10 text-brand-300' : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                }`}
              >
                <p className="font-semibold">Full</p>
                <p className="text-xs mt-1 opacity-70">Complete container data, volumes, configs</p>
              </button>
              <button
                onClick={() => setType('partial')}
                className={`flex-1 p-3 rounded-lg border text-center transition-colors ${
                  type === 'partial' ? 'border-amber-500 bg-amber-600/10 text-amber-300' : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                }`}
              >
                <p className="font-semibold">Partial</p>
                <p className="text-xs mt-1 opacity-70">Select specific items to backup</p>
              </button>
            </div>
          </div>

          {isPartial && (
            <div className="space-y-3">
              <p className="text-sm text-gray-400">Select items to include:</p>
              {[
                { label: 'Docker Image', value: includeImage, set: setIncludeImage, desc: 'Container image layers' },
                { label: 'Volumes & Data', value: includeVolumes, set: setIncludeVolumes, desc: 'Mounted volumes data' },
                { label: 'Configuration', value: includeConfigs, set: setIncludeConfigs, desc: 'Container config & compose files' },
                { label: 'Filesystem', value: includeFilesystem, set: setIncludeFilesystem, desc: 'Container filesystem export' },
              ].map(({ label, value, set, desc }) => (
                <button
                  key={label}
                  onClick={() => set(!value)}
                  className="flex items-center gap-3 w-full p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors text-left"
                >
                  {value ? <CheckSquare className="w-5 h-5 text-brand-400" /> : <Square className="w-5 h-5 text-gray-600" />}
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-gray-500">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="bg-gray-800/50 rounded-lg p-3 text-sm">
            <p className="text-gray-400">
              <span className="font-medium text-gray-300">Container:</span> {container.name}
            </p>
            <p className="text-gray-400 font-mono text-xs mt-1">{container.image}</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-gray-800">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleBackup} disabled={loading} className="btn-success flex items-center gap-2">
            <HardDrive className="w-4 h-4" />
            {loading ? 'Starting...' : 'Start Backup'}
          </button>
        </div>
      </div>
    </div>
  );
}
