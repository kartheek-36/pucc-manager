'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { TodayMetricsCards } from '@/components/dashboard/TodayMetricsCards';
import { VanPerformanceCards } from '@/components/dashboard/VanPerformanceCards';
import { MetricCardSkeleton, ChartSkeleton } from '@/components/ui/Skeleton';
import { AdminDashboardData } from '@/types';
import { RefreshCw } from 'lucide-react';

// Dynamic imports for heavy recharts components to drastically reduce initial JS bundle size
const TodayCollectionChart = dynamic(
  () => import('@/components/charts/TodayCollectionChart').then((m) => m.TodayCollectionChart),
  { loading: () => <ChartSkeleton />, ssr: false }
);

const WeeklyOverviewChart = dynamic(
  () => import('@/components/charts/WeeklyOverviewChart').then((m) => m.WeeklyOverviewChart),
  { loading: () => <ChartSkeleton />, ssr: false }
);

const MonthlyOverviewChart = dynamic(
  () => import('@/components/charts/MonthlyOverviewChart').then((m) => m.MonthlyOverviewChart),
  { loading: () => <ChartSkeleton />, ssr: false }
);

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      else setRefreshing(true);

      const res = await fetch('/api/admin/dashboard');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (err) {
      console.error('Failed to load admin dashboard:', err);
    } finally {
      if (!isBackground) setLoading(false);
      else setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard(false);

    // Auto-sync interval: checks for operator report submissions every 15 seconds when tab is active
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return; // Pause background polling
      }
      fetchDashboard(true);
    }, 15000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchDashboard(true);
      }
    };

    window.addEventListener('focus', handleVisibility);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleVisibility);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);


  return (
    <AdminLayout adminName="Venkateswara Rao">
      <div className="space-y-6">
        {/* Top Header / Live Fleet Status */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
              <span className="text-[11px] font-semibold text-[#16A34A] uppercase tracking-wider">
                Fleet Live
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#111827] tracking-tight mt-0.5">
              Dashboard Overview
            </h1>
            <p className="text-xs text-[#6B7280]">
              Today: {data?.today.date || new Date().toISOString().slice(0, 10)} (IST)
            </p>
          </div>

          <button
            onClick={() => fetchDashboard(false)}
            disabled={loading || refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FFFFFF] border border-[#E7E9ED] text-[#111827] hover:bg-[#F7F8FA] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#1D4ED8] ${loading || refreshing ? 'animate-spin' : ''}`} />
            <span>{loading || refreshing ? 'Syncing...' : 'Refresh'}</span>
          </button>

        </div>

        {/* 1. TODAY'S METRIC CARDS (Hero Collection + 2-Card Grid) */}
        {loading || !data ? (
          <div className="space-y-3">
            <MetricCardSkeleton />
            <div className="grid grid-cols-2 gap-3">
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </div>
          </div>
        ) : (
          <TodayMetricsCards
            totalCollection={data.today.total_collection}
            totalTests={data.today.total_tests}
            activeVans={data.today.active_vans}
            totalVans={data.today.total_vans}
            submittedReports={data.today.submitted_reports}
            pendingReports={data.today.pending_reports}
            vsYesterdayFormatted={data.today.vs_yesterday_formatted || '+12.4%'}
            vsYesterdayIsPositive={data.today.vs_yesterday_is_positive ?? true}
          />
        )}

        {/* 2. TODAY'S VANS */}
        {loading || !data ? (
          <div className="space-y-3">
            <div className="h-4 w-28 bg-[#F3F4F6] rounded-md animate-pulse" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </div>
          </div>
        ) : (
          <VanPerformanceCards vans={data.van_performance} />
        )}

        {/* 3. TODAY'S COLLECTION BAR CHART */}
        {loading || !data ? (
          <ChartSkeleton />
        ) : (
          <TodayCollectionChart
            data={data.van_performance.map((v) => ({
              van_number: v.van_number,
              collection: v.collection,
              tests: v.tests,
            }))}
          />
        )}

        {/* 4. WEEKLY OVERVIEW (with Week-over-Week & Van Ranking) */}
        {loading || !data ? (
          <ChartSkeleton />
        ) : (
          <WeeklyOverviewChart
            totalCollection={data.weekly.total_collection}
            totalTests={data.weekly.total_tests}
            dailyAverage={data.weekly.daily_average}
            bestDay={data.weekly.best_day}
            bestVan={data.weekly.best_van}
            vsPreviousWeekFormatted={data.weekly.vs_previous_week_formatted}
            vsPreviousWeekIsPositive={data.weekly.vs_previous_week_is_positive}
            vanRanking={data.weekly.van_ranking}
            days={data.weekly.days}
          />
        )}

        {/* 5. MONTHLY OVERVIEW (with 5-Stat Summary, Daily Bars & Van Comparison) */}
        {loading || !data ? (
          <ChartSkeleton />
        ) : (
          <MonthlyOverviewChart initialData={data.monthly} />
        )}
      </div>
    </AdminLayout>
  );
}
