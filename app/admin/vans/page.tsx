'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { formatINR } from '@/lib/calculations/financial';
import { ArrowRight, User, Edit3, X } from 'lucide-react';
import { VanCardSkeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useSyncListener, broadcastClientSync } from '@/lib/sync/client';

interface VanSummary {
  id: string;
  van_number: string;
  registration_number: string;
  status: string;
  operator?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  } | null;
  today_collection: number;
  today_tests: number;
  today_status: string;
  weekly_collection: number;
  monthly_collection: number;
  last_report_date?: string | null;
}

export function AdminVansPageContent() {
  const [vans, setVans] = useState<VanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingVan, setEditingVan] = useState<VanSummary | null>(null);
  const [editRegNum, setEditRegNum] = useState('');
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  const inFlightRef = React.useRef(false);

  const fetchVans = React.useCallback(async (isBackground = false) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      if (!isBackground) setLoading(true);
      const res = await fetch('/api/admin/vans', { cache: 'no-store' });
      const json = await res.json();
      if (json.success) setVans(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      inFlightRef.current = false;
      if (!isBackground) setLoading(false);
    }
  }, []);

  // Real-time synchronization across tabs, SSE push, and active visibility
  useSyncListener(() => {
    fetchVans(vans.length > 0);
  }, { intervalMs: 6000 });

  const handleEditClick = (van: VanSummary, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingVan(van);
    setEditRegNum(van.registration_number);
  };

  const handleSaveRegNum = async () => {
    if (!editingVan) return;
    setUpdating(true);
    try {
      const res = await fetch('/api/admin/vans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingVan.id,
          registration_number: editRegNum,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast(`Updated registration number for ${editingVan.van_number}!`, 'success');
        broadcastClientSync({ type: 'VAN_UPDATED', vanId: editingVan.id });
        setEditingVan(null);
        fetchVans();
      } else {
        toast(json.error?.message || 'Failed to update', 'error');
      }
    } catch {
      toast('Error saving changes', 'error');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <AdminLayout adminName="Venkateswara Rao">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#111827]">
            Fleet Management
          </h1>
          <p className="text-xs text-[#6B7280]">
            Monitor individual vans, operators, and official registration numbers
          </p>
        </div>

        {/* 3 Van Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <VanCardSkeleton />
            <VanCardSkeleton />
            <VanCardSkeleton />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {vans.map((van) => (
              <div
                key={van.id}
                className="bg-[#FFFFFF] rounded-xl p-5 border border-[#E7E9ED] shadow-xs flex flex-col justify-between space-y-4 hover:border-[#1D4ED8] transition-colors"
              >
                {/* Header */}
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg text-[#111827]">
                          {van.van_number}
                        </span>
                        <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-md bg-[#F7F8FA] text-[#6B7280] border border-[#E7E9ED]">
                          {van.registration_number}
                        </span>
                        <button
                          onClick={(e) => handleEditClick(van, e)}
                          className="p-1 text-[#6B7280] hover:text-[#1D4ED8] rounded-md hover:bg-[#F7F8FA]"
                          title="Edit registration number"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-[#6B7280] mt-1">
                        <User className="w-3.5 h-3.5" />
                        <span>{van.operator?.name || 'Unassigned'}</span>
                      </div>
                    </div>

                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                        van.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-[#16A34A] border border-emerald-200'
                          : 'bg-[#F7F8FA] text-[#6B7280]'
                      }`}
                    >
                      {van.status}
                    </span>
                  </div>
                </div>

                {/* Metrics Breakdown */}
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 rounded-lg bg-[#F7F8FA] border border-[#E7E9ED]">
                    <span className="text-[10px] text-[#6B7280] font-medium uppercase block">Today's Collection</span>
                    <span className="text-base font-bold text-[#111827] mt-0.5 block">
                      {formatINR(van.today_collection)}
                    </span>
                    <span className="text-[11px] text-[#6B7280]">{van.today_tests} Tests</span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#F7F8FA] border border-[#E7E9ED]">
                    <span className="text-[10px] text-[#6B7280] font-medium uppercase block">Today's Status</span>
                    <span
                      className={`text-xs font-semibold mt-1 block ${
                        van.today_status === 'SUBMITTED' || van.today_status === 'APPROVED'
                          ? 'text-[#16A34A]'
                          : 'text-[#F59E0B]'
                      }`}
                    >
                      {van.today_status === 'SUBMITTED' || van.today_status === 'APPROVED'
                        ? 'Submitted ✓'
                        : 'Pending ⚠'}
                    </span>
                    <span className="text-[10px] text-[#6B7280]">
                      Last: {van.last_report_date || 'None'}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#F7F8FA] border border-[#E7E9ED]">
                    <span className="text-[10px] text-[#6B7280] font-medium uppercase block">Weekly Collection</span>
                    <span className="text-sm font-bold text-[#111827] mt-0.5 block">
                      {formatINR(van.weekly_collection)}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#F7F8FA] border border-[#E7E9ED]">
                    <span className="text-[10px] text-[#6B7280] font-medium uppercase block">Monthly Collection</span>
                    <span className="text-sm font-bold text-[#111827] mt-0.5 block">
                      {formatINR(van.monthly_collection)}
                    </span>
                  </div>
                </div>

                {/* View Details Link */}
                <Link
                  href={`/admin/vans/${van.id}`}
                  className="w-full h-10 rounded-lg bg-[#F7F8FA] border border-[#E7E9ED] text-[#1D4ED8] hover:bg-[#EFF6FF] font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>View Van Analytics</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Edit Registration Modal */}
        {editingVan && (
          <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-[#FFFFFF] rounded-xl p-5 max-w-sm w-full space-y-4 border border-[#E7E9ED] shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#111827]">
                  Edit {editingVan.van_number} Registration
                </h3>
                <button
                  onClick={() => setEditingVan(null)}
                  className="p-1 rounded-md text-[#6B7280] hover:bg-[#F7F8FA]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-[#6B7280]">Vehicle Registration Number</label>
                <input
                  type="text"
                  value={editRegNum}
                  onChange={(e) => setEditRegNum(e.target.value)}
                  placeholder="MH-12-PUC-1001"
                  className="w-full px-3 py-2 rounded-lg border border-[#E7E9ED] bg-[#FFFFFF] font-mono font-bold text-sm text-[#111827] outline-none focus:border-[#1D4ED8]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => setEditingVan(null)}
                  className="flex-1 h-9 text-xs font-semibold text-[#6B7280] hover:bg-[#F7F8FA] rounded-lg border border-[#E7E9ED]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveRegNum}
                  disabled={updating}
                  className="flex-1 h-9 text-xs font-semibold bg-[#1D4ED8] text-white rounded-lg hover:bg-[#1E40AF] disabled:opacity-50"
                >
                  {updating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default function AdminVansPage() {
  return <AdminVansPageContent />;
}
