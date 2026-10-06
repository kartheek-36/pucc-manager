'use client';

import React, { useState, useEffect } from 'react';
import { VanLayout } from '@/components/layout/VanLayout';
import { DailyReportForm } from '@/components/van/DailyReportForm';
import { Van, DailyReport, User } from '@/types';
import { getTodayISTDateString } from '@/lib/calculations/financial';
import { MetricCardSkeleton } from '@/components/ui/Skeleton';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useSyncListener } from '@/lib/sync/client';

export default function VanDailyReportPage() {
  const [user, setUser] = useState<User | null>(null);
  const [van, setVan] = useState<Van | null>(null);
  const [existingReport, setExistingReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);

      const meRes = await fetch('/api/auth/me', { cache: 'no-store' });
      const meJson = await meRes.json();
      if (!meJson.success) {
        setErrorMessage('Failed to authenticate session');
        return;
      }

      setUser(meJson.data.user);
      const vanId = meJson.data.user.van_id;

      if (!vanId) {
        setErrorMessage('No vehicle assigned to your operator account yet. Please contact your Admin to assign a van in Admin > Users.');
        return;
      }

      const todayStr = getTodayISTDateString();
      const repRes = await fetch(`/api/reports/today?van_id=${vanId}&date=${todayStr}`, { cache: 'no-store' });
      const repJson = await repRes.json();

      if (repJson.success) {
        setVan(repJson.data.van);
        setExistingReport(repJson.data.report);
      } else {
        setErrorMessage(repJson.error?.message || 'Could not load today\'s report status');
      }
    } catch (e: any) {
      console.error(e);
      setErrorMessage('Network error while connecting to fleet database');
    } finally {
      setLoading(false);
    }
  }, []);

  useSyncListener(() => {
    loadData();
  }, { intervalMs: 8000 });

  return (
    <VanLayout
      vanNumber={van?.van_number || user?.van?.van_number || 'Van Operator'}
      registrationNumber={van?.registration_number || user?.van?.registration_number || 'PUC Fleet'}
      operatorName={user?.name || 'Operator'}
    >
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </div>
        ) : errorMessage ? (
          <div className="bg-[#FFFFFF] rounded-xl p-5 border border-[#E7E9ED] space-y-4 shadow-xs text-center">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-[#F59E0B] flex items-center justify-center mx-auto border border-amber-200">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111827]">Assignment Status</h3>
              <p className="text-xs text-[#6B7280] mt-1 max-w-sm mx-auto leading-relaxed">
                {errorMessage}
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/van/dashboard"
                className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-[#1D4ED8] text-white text-xs font-semibold hover:bg-[#1E40AF] transition-colors"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        ) : van ? (
          <DailyReportForm
            van={van}
            existingReport={existingReport}
            onSubmitted={() => loadData()}
          />
        ) : null}
      </div>
    </VanLayout>
  );
}
