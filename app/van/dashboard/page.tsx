'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { VanLayout } from '@/components/layout/VanLayout';
import { DailyReport, Van, User } from '@/types';
import { formatINR, getTodayISTDateString, formatISTTime } from '@/lib/calculations/financial';
import {
  FilePlus,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { MetricCardSkeleton } from '@/components/ui/Skeleton';

export default function VanDashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [van, setVan] = useState<Van | null>(null);
  const [todayReport, setTodayReport] = useState<DailyReport | null>(null);
  const [recentReports, setRecentReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);

  const todayStr = getTodayISTDateString();

  const loadData = async () => {
    try {
      setLoading(true);
      const meRes = await fetch('/api/auth/me');
      const meJson = await meRes.json();
      if (!meJson.success) return;
      setUser(meJson.data.user);

      const vanId = meJson.data.user.van_id;
      if (!vanId) return;

      const repRes = await fetch(`/api/reports/today?van_id=${vanId}`);
      const repJson = await repRes.json();
      if (repJson.success) {
        setVan(repJson.data.van);
        setTodayReport(repJson.data.report);
      }

      const histRes = await fetch(`/api/reports?van_id=${vanId}&limit=7`);
      const histJson = await histRes.json();
      if (histJson.success) {
        setRecentReports(histJson.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Calculate week total from recent reports (last 7 days)
  const weekCollection = recentReports.reduce((acc, r) => acc + r.total_collection, 0);
  const weekTests = recentReports.reduce((acc, r) => acc + r.total_tests, 0);

  return (
    <VanLayout
      vanNumber={van?.van_number || user?.van?.van_number || 'Van Operator'}
      registrationNumber={van?.registration_number || user?.van?.registration_number || 'PUC Fleet'}
      operatorName={user?.name || 'Operator'}
    >
      <div className="space-y-5">
        {/* Operator Greeting & Van ID */}
        <div>
          <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider block">
            GOOD MORNING
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <h1 className="text-2xl font-extrabold text-[#111827]">
              {van?.van_number || user?.van?.van_number || 'Van Operator'}
            </h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-[#F7F8FA] border border-[#E7E9ED] text-[#6B7280]">
              {van?.registration_number || 'PUC'}
            </span>
          </div>
        </div>

        {/* TODAY'S REPORT CARD */}
        {loading ? (
          <MetricCardSkeleton />
        ) : (
          <div className="bg-[#FFFFFF] rounded-xl p-5 border border-[#E7E9ED] space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-[#6B7280] uppercase tracking-wider block">
                  Today's Report
                </span>
                <span className="text-xs font-mono text-[#6B7280]">{todayStr}</span>
              </div>

              {todayReport ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-[#16A34A] border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                  SUBMITTED
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-[#F59E0B] border border-amber-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                  NOT SUBMITTED
                </span>
              )}
            </div>

            {todayReport ? (
              <div className="space-y-3 pt-2 border-t border-[#E7E9ED]">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-[#6B7280] block">Today's Collection</span>
                    <span className="text-xl font-bold text-[#111827]">
                      {formatINR(todayReport.total_collection)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#6B7280] block">Total Tests</span>
                    <span className="text-xl font-bold text-[#111827]">
                      {todayReport.total_tests} Tests
                    </span>
                  </div>
                </div>

                <Link
                  href="/van/daily-report"
                  className="w-full h-11 flex items-center justify-center gap-2 rounded-lg bg-[#F7F8FA] border border-[#E7E9ED] text-[#111827] text-sm font-semibold hover:bg-slate-100 transition-colors"
                >
                  View / Edit Submitted Report
                </Link>
              </div>
            ) : (
              <div className="pt-2">
                <Link
                  href="/van/daily-report"
                  className="w-full h-12 flex items-center justify-center gap-2 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-[#FFFFFF] text-sm font-semibold transition-colors shadow-xs"
                >
                  <FilePlus className="w-4 h-4" />
                  Submit Today's Report
                </Link>
              </div>
            )}
          </div>
        )}

        {/* THIS WEEK SECTION */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-[#111827]">
            This Week
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#FFFFFF] rounded-xl p-4 border border-[#E7E9ED] shadow-xs">
              <span className="text-xs text-[#6B7280] block">Total Collection</span>
              <div className="text-xl font-bold text-[#111827] mt-0.5">
                {formatINR(weekCollection)}
              </div>
            </div>

            <div className="bg-[#FFFFFF] rounded-xl p-4 border border-[#E7E9ED] shadow-xs">
              <span className="text-xs text-[#6B7280] block">Vehicles Tested</span>
              <div className="text-xl font-bold text-[#111827] mt-0.5">
                {weekTests} Tests
              </div>
            </div>
          </div>
        </div>

        {/* HISTORY SECTION */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#111827]">
              History
            </h2>
            <Link
              href="/van/history"
              className="text-xs font-medium text-[#1D4ED8] hover:underline flex items-center gap-1"
            >
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-2">
            {recentReports.length === 0 ? (
              <div className="bg-[#FFFFFF] rounded-xl p-4 border border-[#E7E9ED] text-center text-xs text-[#6B7280]">
                No reports submitted yet.
              </div>
            ) : (
              recentReports.slice(0, 4).map((r) => (
                <div
                  key={r.id}
                  className="bg-[#FFFFFF] rounded-xl p-3.5 border border-[#E7E9ED] flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-semibold text-[#111827] block font-mono">{r.report_date}</span>
                    <span className="text-[#6B7280]">{r.total_tests} Tests</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-[#111827] block">{formatINR(r.total_collection)}</span>
                    <span className="text-emerald-600 font-medium">✓ {r.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </VanLayout>
  );
}
