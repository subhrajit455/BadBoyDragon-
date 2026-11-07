import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Warehouse,
  FileSpreadsheet,
  Receipt,
  BookOpen,
  Settings,
  LogOut,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import logoUrl from '../../assets/logo.png';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Purchases', path: '/purchases', icon: ShoppingCart },
  { name: 'Inventory', path: '/inventory', icon: Warehouse },
  { name: 'Quotations', path: '/quotations', icon: FileSpreadsheet },
  { name: 'Billing', path: '/billing', icon: Receipt },
  { name: 'Ledgers', path: '/ledgers', icon: BookOpen },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export default function Sidebar({ isOpen = false, onClose }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await logout();
      onClose?.();
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <>
      {/* Backdrop for mobile drawer */}
      <div
        className={`fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 transition-opacity duration-200 lg:hidden ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer on mobile, fixed sidebar on lg+ */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[80%] max-w-[288px] flex-shrink-0 bg-sidebar text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-200 ease-in-out lg:static lg:w-64 lg:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        } print:hidden`}
        role="dialog"
        aria-modal="true"
        aria-label="Main Navigation"
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between gap-3 px-4 border-b border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white p-1 shadow-sm flex-shrink-0">
              <img
                src={logoUrl}
                alt="Sibham Enterprises Logo"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-sm font-bold tracking-tight text-white block truncate">
                Sibham Enterprises
              </span>
              {/* <span className="text-[11px] text-slate-400 block -mt-0.5 truncate"> */}
                <p className="mt-0.5 text-xs text-muted">
            GSTIN: 19DSCPK9203C1ZX
          </p>
              {/* </span> */}
            </div>
          </div>

          {/* Close button for mobile drawer */}
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden rounded-lg p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex-shrink-0"
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px] ${
                    isActive
                      ? 'bg-sidebar-accent text-sidebar font-semibold shadow-sm'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Logout Footer Button */}
        <div className="p-3 border-t border-slate-800 print:hidden no-print pb-safe">
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors group cursor-pointer min-h-[44px]"
          >
            <LogOut className="h-5 w-5 flex-shrink-0 text-slate-400 group-hover:text-red-400" />
            <span>{loggingOut ? 'Logging out...' : 'Logout'}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
