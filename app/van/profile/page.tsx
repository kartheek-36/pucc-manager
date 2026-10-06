'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { VanLayout } from '@/components/layout/VanLayout';
import { User } from '@/types';
import { User as UserIcon, Truck, Mail, Phone, LogOut } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export default function VanProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setUser(json.data.user);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      toast('Logged out successfully', 'info');
      router.push('/login');
    } catch {
      router.push('/login');
    }
  };

  return (
    <VanLayout
      vanNumber={user?.van?.van_number || 'Van Operator'}
      registrationNumber={user?.van?.registration_number || 'PUC Fleet'}
      operatorName={user?.name || 'Operator'}
    >
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-[#111827]">
            Operator Profile
          </h1>
          <p className="text-xs text-[#6B7280]">
            Assigned van credentials and personal testing shift profile
          </p>
        </div>

        {/* Profile Card */}
        <div className="bg-[#FFFFFF] rounded-xl p-5 border border-[#E7E9ED] shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8] flex items-center justify-center font-bold text-lg">
              <UserIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#111827]">
                {user?.name || 'Loading...'}
              </h2>
              <span className="text-[11px] font-semibold text-[#1D4ED8] bg-[#EFF6FF] px-2 py-0.5 rounded-md border border-[#BFDBFE]">
                VAN OPERATOR
              </span>
            </div>
          </div>

          <div className="space-y-2.5 pt-2 text-xs">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[#F7F8FA] border border-[#E7E9ED]">
              <Truck className="w-4 h-4 text-[#1D4ED8]" />
              <div>
                <span className="text-[10px] text-[#6B7280] font-medium uppercase block">Assigned Van</span>
                <span className="font-semibold text-[#111827]">
                  {user?.van ? `${user.van.van_number} (${user.van.registration_number})` : 'Unassigned'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-[#F7F8FA] border border-[#E7E9ED]">
              <Mail className="w-4 h-4 text-[#6B7280]" />
              <div>
                <span className="text-[10px] text-[#6B7280] font-medium uppercase block">Email</span>
                <span className="font-semibold text-[#111827]">{user?.email}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-[#F7F8FA] border border-[#E7E9ED]">
              <Phone className="w-4 h-4 text-[#6B7280]" />
              <div>
                <span className="text-[10px] text-[#6B7280] font-medium uppercase block">Phone</span>
                <span className="font-semibold text-[#111827]">{user?.phone || 'Not registered'}</span>
              </div>
            </div>
          </div>

          {/* Logout Action */}
          <div className="pt-2">
            <button
              onClick={handleLogout}
              className="w-full h-11 rounded-lg bg-[#F7F8FA] border border-[#E7E9ED] hover:bg-rose-50 text-[#DC2626] font-semibold text-xs transition-colors flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Log Out of Session
            </button>
          </div>
        </div>
      </div>
    </VanLayout>
  );
}
