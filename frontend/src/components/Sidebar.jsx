import { NavLink, useNavigate } from 'react-router-dom';
import { clearToken } from '../services/api';
import {
  LayoutDashboard, Container, HardDrive, RotateCcw,
  Calendar, Settings, LogOut, ChevronLeft, ChevronRight, Shield
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/containers', icon: Container, label: 'Containers' },
  { to: '/backups', icon: HardDrive, label: 'Backups' },
  { to: '/restore', icon: RotateCcw, label: 'Restore' },
  { to: '/schedules', icon: Calendar, label: 'Schedules' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar({ open, onToggle }) {
  const navigate = useNavigate();

  function handleLogout() {
    clearToken();
    navigate('/login');
  }

  return (
    <aside className={`fixed left-0 top-0 h-full bg-gray-900 border-r border-gray-800 z-40 transition-all duration-300 flex flex-col ${open ? 'w-64' : 'w-16'}`}>
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        {open && (
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-brand-400" />
            <span className="font-bold text-lg text-brand-300">Backup Central</span>
          </div>
        )}
        {!open && <Shield className="w-6 h-6 text-brand-400 mx-auto" />}
        <button onClick={onToggle} className="text-gray-400 hover:text-gray-200 p-1">
          {open ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
      </div>

      <nav className="flex-1 py-4 space-y-1 px-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive ? 'bg-brand-600/20 text-brand-300' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              } ${!open ? 'justify-center' : ''}`
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {open && <span className="text-sm font-medium">{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="p-2 border-t border-gray-800">
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-red-400 transition-colors ${!open ? 'justify-center' : ''}`}
        >
          <LogOut className="w-5 h-5" />
          {open && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  );
}
