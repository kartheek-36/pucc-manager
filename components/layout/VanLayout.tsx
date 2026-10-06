'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  FilePlus,
  History,
  User,
  LogOut,
  Truck,
} from 'lucide-react';

interface VanLayoutProps {
  children: React.ReactNode;
  vanNumber?: string;
  registrationNumber?: string;
  operatorName?: string;
}

export function VanLayout({
  children,
  vanNumber = 'umamaheswara',
  registrationNumber = 'MH-12-PUC-1001',
  operatorName = 'umamaheswara',
}: VanLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch {
      router.push('/login');
    }
  };

  const navItems = [
    { name: 'Home', href: '/van/dashboard', icon: LayoutDashboard },
    { name: 'Submit', href: '/van/daily-report', icon: FilePlus },
    { name: 'History', href: '/van/history', icon: History },
    { name: 'Profile', href: '/van/profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#FFFFFF] flex flex-col pb-20 text-[#111827]">
      {/* Mobile-first Clean White Header */}
      <header className="sticky top-0 z-30 bg-[#FFFFFF] border-b border-[#E7E9ED] px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#1D4ED8] flex items-center justify-center font-bold text-white shadow-xs">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-[#111827]">{vanNumber}</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-[#F7F8FA] text-[#6B7280] border border-[#E7E9ED]">
                  {registrationNumber}
                </span>
              </div>
              <p className="text-xs text-[#6B7280]">{operatorName}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 text-[#6B7280] hover:text-[#DC2626] hover:bg-[#F7F8FA] rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="Log Out"
            aria-label="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container - max-w-md for pristine 320px-430px mobile focus */}
      <main className="flex-1 p-4 max-w-md mx-auto w-full">
        {children}
      </main>

      {/* Van Mobile Bottom Navigation (Phone 320px - 430px) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#FFFFFF] border-t border-[#E7E9ED] flex justify-around items-center py-2 px-2 shadow-xs pb-safe">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-lg text-[11px] font-medium transition-colors min-h-[44px] min-w-[48px] ${
                isActive
                  ? 'text-[#1D4ED8] font-semibold'
                  : 'text-[#6B7280] hover:text-[#111827]'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
