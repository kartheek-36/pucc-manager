'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  BarChart3,
  Truck,
  Bell,
  Settings,
  Users,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  Download,
} from 'lucide-react';
import { NotificationBell } from '../notifications/NotificationBell';
import { useToast } from '../ui/Toast';

interface AdminLayoutProps {
  children: React.ReactNode;
  adminName?: string;
}

export function AdminLayout({ children, adminName = 'Venkateswara Rao' }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      toast('To install, use browser menu > "Add to Home screen"', 'info');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
      toast('RTO Van Manager installed!', 'success');
    }
    setDeferredPrompt(null);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch {
      router.push('/login');
    }
  };

  const navItems = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
    { name: 'Vans', href: '/admin/vans', icon: Truck },
    { name: 'Notifications', href: '/admin/notifications', icon: Bell },
    { name: 'Users', href: '/admin/users', icon: Users },
    { name: 'Audit Logs', href: '/admin/audit', icon: ShieldCheck },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#FFFFFF] flex flex-col lg:flex-row pb-20 lg:pb-0 text-[#111827]">
      {/* Desktop Sidebar (>= 1024px) */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#FFFFFF] border-r border-[#E7E9ED] shrink-0 sticky top-0 h-screen">
        {/* Brand Header */}
        <div className="p-5 border-b border-[#E7E9ED] flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#1D4ED8] flex items-center justify-center font-bold text-white shadow-xs">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-sm tracking-tight text-[#111827]">RTO VAN MANAGER</h1>
            <p className="text-xs text-[#6B7280]">Fleet Portal</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== '/admin/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#EFF6FF] text-[#1D4ED8] font-semibold'
                    : 'text-[#6B7280] hover:text-[#111827] hover:bg-[#F7F8FA]'
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${isActive ? 'text-[#1D4ED8]' : 'text-[#6B7280]'}`}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* PWA Install */}
        {isInstallable && (
          <div className="p-3 border-t border-[#E7E9ED]">
            <button
              onClick={handleInstallClick}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-lg bg-[#F7F8FA] border border-[#E7E9ED] hover:bg-slate-100 text-[#111827] transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-[#1D4ED8]" />
              Install App
            </button>
          </div>
        )}

        {/* User Card & Logout */}
        <div className="p-4 border-t border-[#E7E9ED] flex items-center justify-between bg-[#FFFFFF]">
          <div className="truncate pr-2">
            <p className="text-[11px] text-[#6B7280] uppercase tracking-wider font-medium">Head Admin</p>
            <p className="text-sm font-semibold text-[#111827] truncate">{adminName}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-[#6B7280] hover:text-[#DC2626] hover:bg-[#F7F8FA] rounded-lg transition-colors"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile / Header */}
        <header className="sticky top-0 z-30 bg-[#FFFFFF] border-b border-[#E7E9ED] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="lg:hidden w-8 h-8 rounded-lg bg-[#1D4ED8] flex items-center justify-center text-white">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm md:text-base font-semibold text-[#111827] tracking-tight">
                RTO Pollution Manager
              </h1>
              <p className="text-xs text-[#6B7280] hidden sm:block">Good morning, {adminName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isInstallable && (
              <button
                onClick={handleInstallClick}
                className="lg:hidden flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-[#F7F8FA] border border-[#E7E9ED] text-[#111827]"
              >
                <Download className="w-3 h-3 text-[#1D4ED8]" />
                App
              </button>
            )}
            <NotificationBell />
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-[#6B7280] hover:bg-[#F7F8FA] rounded-lg"
              aria-label="Open Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
          {children}
        </main>

        {/* Mobile Bottom Navigation Bar (Phone 320px - 430px) */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FFFFFF] border-t border-[#E7E9ED] flex justify-around items-center py-2 px-1 pb-safe shadow-xs">
          <Link
            href="/admin/dashboard"
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[11px] font-medium transition-colors ${
              pathname === '/admin/dashboard'
                ? 'text-[#1D4ED8] font-semibold'
                : 'text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>Home</span>
          </Link>

          <Link
            href="/admin/reports"
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[11px] font-medium transition-colors ${
              pathname.startsWith('/admin/reports')
                ? 'text-[#1D4ED8] font-semibold'
                : 'text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span>Reports</span>
          </Link>

          <Link
            href="/admin/vans"
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[11px] font-medium transition-colors ${
              pathname.startsWith('/admin/vans')
                ? 'text-[#1D4ED8] font-semibold'
                : 'text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            <Truck className="w-5 h-5" />
            <span>Vans</span>
          </Link>

          <Link
            href="/admin/notifications"
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[11px] font-medium transition-colors ${
              pathname.startsWith('/admin/notifications')
                ? 'text-[#1D4ED8] font-semibold'
                : 'text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            <Bell className="w-5 h-5" />
            <span>Alerts</span>
          </Link>

          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[11px] font-medium text-[#6B7280] hover:text-[#111827]"
          >
            <Menu className="w-5 h-5" />
            <span>More</span>
          </button>
        </nav>

        {/* Mobile "More" Drawer Modal */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex justify-end">
            <div className="w-4/5 max-w-xs bg-[#FFFFFF] h-full p-5 flex flex-col border-l border-[#E7E9ED] shadow-xl">
              <div className="flex justify-between items-center pb-4 border-b border-[#E7E9ED]">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-[#1D4ED8] flex items-center justify-center font-bold text-white">
                    <Truck className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-sm text-[#111827]">More Options</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-md text-[#6B7280] hover:bg-[#F7F8FA]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 py-4 space-y-1 overflow-y-auto">
                <Link
                  href="/admin/users"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#F7F8FA] text-sm font-medium text-[#111827]"
                >
                  <Users className="w-4 h-4 text-[#1D4ED8]" />
                  Manage Operators
                </Link>
                <Link
                  href="/admin/audit"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#F7F8FA] text-sm font-medium text-[#111827]"
                >
                  <ShieldCheck className="w-4 h-4 text-[#1D4ED8]" />
                  Audit Logs
                </Link>
                <Link
                  href="/admin/settings"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#F7F8FA] text-sm font-medium text-[#111827]"
                >
                  <Settings className="w-4 h-4 text-[#1D4ED8]" />
                  Reporting Deadline
                </Link>
              </div>

              <div className="pt-4 border-t border-[#E7E9ED]">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg bg-[#F7F8FA] border border-[#E7E9ED] text-[#DC2626] font-medium text-sm hover:bg-rose-50"
                >
                  <LogOut className="w-4 h-4" />
                  Log Out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
