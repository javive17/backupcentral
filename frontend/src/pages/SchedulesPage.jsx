import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Calendar, Plus, Trash2, ToggleLeft, ToggleRight, Edit } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import ScheduleModal from '../components/ScheduleModal';

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editSchedule, setEditSchedule] = useState(null);

  async function load() {
    try {
      setLoading(true);
      const data = await api.schedules.list();
      setSchedules(data);
    } catch (err) {
      toast.error('Failed to load schedules');
    } finally {
      setLoading(false);
    }
  }

  async function toggleSchedule(id, enabled) {
    try {
      await api.schedules.update(id, { enabled: enabled ? 1 : 0 });
      toast.success(enabled ? 'Schedule enabled' : 'Schedule disabled');
      load();
    } catch (err) {
      toast.error('Failed to update schedule');
    }
  }

  async function deleteSchedule(id) {
    if (!confirm('Delete this schedule?')) return;
    try {
      await api.schedules.delete(id);
      toast.success('Schedule deleted');
      load();
    } catch (err) {
      toast.error('Delete failed');
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Schedules</h1>
        <button onClick={() => { setEditSchedule(null); setShowModal(true); }} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> New Schedule
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : schedules.length === 0 ? (
        <div className="card text-center py-12">
          <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-4">No schedules configured</p>
          <button onClick={() => setShowModal(true)} className="btn-primary">Create Schedule</button>
        </div>
      ) : (
        <div className="grid gap-4">
          {schedules.map((s) => (
            <div key={s.id} className="card flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gray-800 rounded-lg">
                  <Calendar className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-semibold">{s.name || `Schedule #${s.id}`}</h3>
                  <p className="text-sm text-gray-500">{s.container_name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <code className="text-xs text-brand-400 bg-gray-800 px-2 py-0.5 rounded">{s.cron_expression}</code>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      s.backup_type === 'full' ? 'bg-brand-900/50 text-brand-300' : 'bg-amber-900/50 text-amber-300'
                    }`}>{s.backup_type}</span>
                    <span className="text-xs text-gray-600">Retain: {s.retention_count}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {s.last_run && (
                  <span className="text-xs text-gray-500 mr-2">
                    Last: {format(new Date(s.last_run), 'MMM dd HH:mm')}
                  </span>
                )}
                <button onClick={() => toggleSchedule(s.id, !s.enabled)} className="p-2 rounded-lg hover:bg-gray-800">
                  {s.enabled ? (
                    <ToggleRight className="w-6 h-6 text-emerald-400" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-gray-600" />
                  )}
                </button>
                <button onClick={() => { setEditSchedule(s); setShowModal(true); }} className="p-2 text-gray-400 hover:text-brand-400 rounded-lg hover:bg-gray-800">
                  <Edit className="w-4 h-4" />
                </button>
                <button onClick={() => deleteSchedule(s.id)} className="p-2 text-gray-400 hover:text-red-400 rounded-lg hover:bg-gray-800">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <ScheduleModal
          schedule={editSchedule}
          onClose={() => { setShowModal(false); setEditSchedule(null); load(); }}
        />
      )}
    </div>
  );
}
