import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Settings as SettingsIcon, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const data = await api.settings.list();
      setSettings(data);
    } catch (err) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }

  function handleChange(key, value) {
    setSettings(prev => prev.map(s => s.setting_key === key ? { ...s, setting_value: value } : s));
  }

  async function save() {
    try {
      setSaving(true);
      const obj = {};
      settings.forEach(s => { obj[s.setting_key] = s.setting_value; });
      await api.settings.update(obj);
      toast.success('Settings saved');
    } catch (err) {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Settings</h1>
        <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-2 text-sm">
          <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className="card space-y-6">
        {loading ? (
          <p className="text-gray-500 text-center py-8">Loading...</p>
        ) : (
          settings.map((s) => (
            <div key={s.setting_key}>
              <label className="label">{s.description || s.setting_key}</label>
              {s.setting_type === 'boolean' ? (
                <select
                  className="input-field"
                  value={s.setting_value}
                  onChange={e => handleChange(s.setting_key, e.target.value)}
                >
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              ) : s.setting_type === 'number' ? (
                <input
                  type="number"
                  className="input-field"
                  value={s.setting_value}
                  onChange={e => handleChange(s.setting_key, e.target.value)}
                />
              ) : (
                <input
                  type="text"
                  className="input-field"
                  value={s.setting_value || ''}
                  onChange={e => handleChange(s.setting_key, e.target.value)}
                />
              )}
              <p className="text-xs text-gray-600 mt-1 font-mono">{s.setting_key}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
