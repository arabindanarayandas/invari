import { Folder, LogOut, LayoutDashboard, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

/**
 * Sidebar component following the "Observational Blueprint" design system
 * - No border, distinction via surface-container-low fill
 * - 2px vertical "needle" indicator for active state
 * - 64px collapsed / 240px expanded width
 */
const Sidebar = ({ activeView, onNavigate, onLogout }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'applications', label: 'Agents', icon: Folder },
  ];

  return (
    <div className={`
      ${isCollapsed ? 'w-16' : 'w-60'}
      bg-surface-container-low flex flex-col h-screen fixed left-0 top-0
      transition-all duration-300 z-20
    `}>
      {/* Header - Logo area */}
      <div className="h-16 flex items-center justify-between px-4">
        <Link to="/" className="cursor-pointer">
          <img
            src="/invari_white.png"
            alt="Invari"
            className={`h-8 w-auto object-contain transition-all duration-300 ${
              isCollapsed ? 'opacity-0 w-0' : 'opacity-100'
            }`}
          />
        </Link>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-sm hover:bg-surface-container-high transition-colors cursor-pointer"
          aria-label="Toggle sidebar"
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5 text-on-surface-variant" />
          ) : (
            <ChevronLeft className="w-5 h-5 text-on-surface-variant" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-sm
                  transition-all duration-150 relative group cursor-pointer
                  ${isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-on-surface hover:bg-surface-container-high'
                  }
                `}
              >
                {/* Active needle indicator */}
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary rounded-r" />
                )}

                <Icon className={`w-5 h-5 flex-shrink-0 ${
                  isActive ? 'text-primary' : 'text-on-surface-variant'
                }`} />

                {!isCollapsed && (
                  <span className="font-medium text-body-sm">
                    {item.label}
                  </span>
                )}

                {/* Tooltip for collapsed state */}
                {isCollapsed && (
                  <div className="
                    absolute left-full ml-2 px-2 py-1 bg-on-surface text-white
                    text-label-sm rounded-sm whitespace-nowrap
                    opacity-0 group-hover:opacity-100 pointer-events-none
                    transition-opacity duration-150
                  ">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer - Logout */}
      <div className="px-3 pb-4">
        <button
          onClick={onLogout}
          className="
            w-full flex items-center gap-3 px-3 py-2.5
            text-on-surface hover:bg-surface-container-high
            rounded-sm transition-colors duration-150 group cursor-pointer
          "
        >
          <LogOut className="w-5 h-5 text-on-surface-variant flex-shrink-0" />
          {!isCollapsed && (
            <span className="font-medium text-body-sm">Logout</span>
          )}

          {/* Tooltip for collapsed state */}
          {isCollapsed && (
            <div className="
              absolute left-full ml-2 px-2 py-1 bg-on-surface text-white
              text-label-sm rounded-sm whitespace-nowrap
              opacity-0 group-hover:opacity-100 pointer-events-none
              transition-opacity duration-150
            ">
              Logout
            </div>
          )}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
