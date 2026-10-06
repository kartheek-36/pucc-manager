'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { TodayMetricsCards } from '@/components/dashboard/TodayMetricsCards';
import { VanPerformanceCards } from '@/components/dashboard/VanPerformanceCards';
import { MetricCardSkeleton, ChartSkeleton } from '@/components/ui/Skeleton';
import { AdminDashboardData } from '@/types';
import { RefreshCw } from 'lucide-react';
import { useSyncListener } from '@/lib/sync/client';

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

  const latestRequestIdRef = React.useRef(0);
  const dataRef = React.useRef<AdminDashboardData | null>(null);
  dataRef.current = data;

  const fetchDashboard = React.useCallback(async (trigger = 'manual') => {
    const requestId = ++latestRequestIdRef.current;
    const isInitial = !dataRef.current;

    // STEP 5: NEVER CLEAR VALID STATE DURING REFRESH
    // If we already have valid data, keep it visible and set refreshing flag.
    if (isInitial) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    const tStart = Date.now();
    const stateBefore = dataRef.current ? {
      collection: dataRef.current.today.total_collection,
      submitted: dataRef.current.today.submitted_reports,
      pending: dataRef.current.today.pending_reports,
    } : null;

    console.log(`[FRONTEND_DASHBOARD] #${requestId} START trigger=${trigger}`, {
      timestamp: new Date().toISOString(),
      stateBefore,
    });

    try {
      const res = await fetch('/api/admin/dashboard', {
        cache: 'no-store',
        headers: {
          'X-Request-Id': `fe_${requestId}_${tStart}`,
          'X-Sync-Trigger': trigger,
        },
      });
      const json = await res.json();

      // STEP 4: STALE RESPONSE PROTECTION / RACE CONDITION ELIMINATION
      // If a newer request was dispatched while this one was in flight, discard this older response!
      if (requestId !== latestRequestIdRef.current) {
        console.warn(`[FRONTEND_DASHBOARD] #${requestId} DISCARDED stale response (current latest is #${latestRequestIdRef.current})`);
        return;
      }

      if (json.success && json.data) {
        const stateAfter = {
          collection: json.data.today.total_collection,
          submitted: json.data.today.submitted_reports,
          pending: json.data.today.pending_reports,
        };

        console.log(`[FRONTEND_DASHBOARD] #${requestId} SUCCESS in ${Date.now() - tStart}ms`, {
          trigger,
          stateBefore,
          stateAfter,
          vanCount: json.data.van_performance?.length,
        });

        // Diagnostic alert if UI receives PENDING with 0 after previously having collection:
        if (stateBefore && stateBefore.collection > 0 && stateAfter.collection === 0) {
          console.error(`[FRONTEND_DASHBOARD] CRITICAL WARNING: State dropped from ₹${stateBefore.collection} to ₹0! Trigger=${trigger}`);
        }

        setData(json.data);
      } else {
        console.warn(`[FRONTEND_DASHBOARD] #${requestId} Empty or error response`, json.error);
      }
    } catch (err) {
      console.error(`[FRONTEND_DASHBOARD] #${requestId} Network error:`, err);
    } finally {
      if (requestId === latestRequestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  // Real-time synchronization across tabs, SSE server push, focus, and background polling
  useSyncListener((trigger) => {
    fetchDashboard(trigger || 'sync-listener');
  }, { intervalMs: 6000 });


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
            onClick={() => fetchDashboard('manual-button')}
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
