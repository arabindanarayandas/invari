import { Folder, LogOut, LayoutDashboard } from 'lucide-react';

const Sidebar = ({ activeView, onNavigate, onLogout }) => {
  return (
    <div className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen fixed left-0 top-0 shadow-sm">
      {/* Header */}
      <div className="p-6 border-b border-slate-200">
        <img
          src="/invari_white.png"
          alt="Invari"
          className="h-12 w-auto object-contain mx-auto"
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-1">
          <button
            onClick={() => onNavigate('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              activeView === 'dashboard'
                ? 'bg-slate-900 border border-slate-800 text-white'
                : 'text-slate-900 hover:bg-slate-50'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="font-medium text-sm">Dashboard</span>
          </button>

          <button
            onClick={() => onNavigate('applications')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              activeView === 'applications'
                ? 'bg-slate-900 border border-slate-800 text-white'
                : 'text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Folder className="w-5 h-5" />
            <span className="font-medium text-sm">Agents</span>
          </button>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-slate-900 hover:bg-slate-50 rounded-lg transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium text-sm">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
