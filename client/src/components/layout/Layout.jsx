import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { User, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';

export default function Layout() {
  const location = useLocation();
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  // Handle Escape key and lock body scroll when mobile drawer is open
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };

    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSidebarOpen]);

  // Map route pathname to title
  const routeTitles = {
    '/dashboard': 'Dashboard',
    '/purchases': 'Purchases',
    '/purchases/new': 'New Purchase',
    '/inventory': 'Inventory',
    '/quotations': 'Quotations',
    '/quotations/new': 'New Quotation',
    '/billing': 'Billing & Invoicing',
    '/billing/new': 'New Invoice',
    '/ledgers': 'Customer & Vendor Ledgers',
    '/settings': 'Settings',
  };

  const currentTitle =
    routeTitles[location.pathname] ||
    (location.pathname.startsWith('/purchases/')
      ? 'Purchase Detail'
      : location.pathname.startsWith('/billing/')
      ? 'Invoice Detail'
      : location.pathname.startsWith('/quotations/')
      ? 'Quotation Detail'
      : 'Sibham Enterprises');

  return (
    <div className="flex min-h-dvh h-dvh overflow-hidden bg-page-bg font-sans text-text print:block print:h-auto print:min-h-0 print:overflow-visible print:bg-white">
      {/* Off-canvas on mobile, fixed w-64 on lg+ */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0 print:block print:h-auto print:overflow-visible print:w-full">
        {/* Top bar with hamburger, title and admin badge - sticky */}
        <header className="sticky top-0 z-30 flex h-14 sm:h-16 items-center justify-between border-b border-border bg-surface px-4 sm:px-6 shadow-xs flex-shrink-0 print:hidden">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Hamburger button on mobile */}
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden rounded-lg p-2 text-text hover:bg-slate-100 transition-colors -ml-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Open navigation menu"
              aria-expanded={isSidebarOpen}
            >
              <Menu className="h-5 w-5" />
            </button>

            <h1 className="text-base sm:text-lg font-bold text-text truncate">
              {currentTitle}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Admin Profile Info */}
            <div className="flex items-center gap-2 rounded-lg border border-border bg-slate-50 px-2.5 py-1 text-sm sm:px-3 sm:py-1.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sidebar text-sidebar-accent font-semibold text-xs flex-shrink-0">
                {user?.name ? user.name.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-semibold text-text leading-tight">{user?.name || 'Admin'}</p>
                <p className="text-[11px] text-muted leading-tight">{user?.email || ''}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content max width 1280px, padding 16px on phones, 24px on lg+ */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6 print:block print:p-0 print:overflow-visible print:h-auto print:w-full">
          <div className="mx-auto max-w-[1280px] w-full print:max-w-none">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
