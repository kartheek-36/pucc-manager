'use client';

import React from 'react';
import Link from 'next/link';
import { formatINR } from '@/lib/calculations/financial';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface TodayMetricsProps {
  totalCollection: number;
  totalTests: number;
  activeVans: number;
  totalVans: number;
  submittedReports: number;
  pendingReports: number;
  vsYesterdayFormatted?: string;
  vsYesterdayIsPositive?: boolean;
}

export function TodayMetricsCards({
  totalCollection,
  totalTests,
  activeVans,
  totalVans,
  submittedReports,
  pendingReports,
  vsYesterdayFormatted = '+12.4%',
  vsYesterdayIsPositive = true,
}: TodayMetricsProps) {
  return (
    <div className="space-y-3">
      {/* 1. Hero Card: TODAY COLLECTION */}
      <Link
        href="/admin/reports?filter=today"
        className="block bg-[#FFFFFF] rounded-xl p-5 border border-[#E7E9ED] shadow-xs hover:border-[#1D4ED8] transition-colors"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[#6B7280] tracking-wider uppercase">
            TODAY
          </span>
          <span
            className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md ${
              vsYesterdayIsPositive
                ? 'bg-emerald-50 text-[#16A34A] border border-emerald-200'
                : 'bg-rose-50 text-[#DC2626] border border-rose-200'
            }`}
          >
            {vsYesterdayIsPositive ? (
              <ArrowUpRight className="w-3.5 h-3.5" />
            ) : (
              <ArrowDownRight className="w-3.5 h-3.5" />
            )}
            {vsYesterdayFormatted} vs yesterday
          </span>
        </div>

        <div className="mt-2">
          <div className="text-3xl sm:text-4xl font-extrabold text-[#111827] tracking-tight">
            {formatINR(totalCollection)}
          </div>
          <p className="text-sm font-medium text-[#6B7280] mt-0.5">
            Collection
          </p>
        </div>
      </Link>

      {/* 2. Side-by-Side Grid: Tests & Vans Active */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/admin/reports?filter=today"
          className="bg-[#FFFFFF] rounded-xl p-4 border border-[#E7E9ED] shadow-xs hover:border-[#1D4ED8] transition-colors block"
        >
          <div className="text-2xl sm:text-3xl font-extrabold text-[#111827]">
            {totalTests}
          </div>
          <p className="text-xs sm:text-sm font-medium text-[#6B7280] mt-0.5">
            Tests
          </p>
        </Link>

        <Link
          href="/admin/vans"
          className="bg-[#FFFFFF] rounded-xl p-4 border border-[#E7E9ED] shadow-xs hover:border-[#1D4ED8] transition-colors block"
        >
          <div className="text-2xl sm:text-3xl font-extrabold text-[#111827]">
            {activeVans} / {totalVans}
          </div>
          <p className="text-xs sm:text-sm font-medium text-[#6B7280] mt-0.5">
            Vans Active
          </p>
        </Link>
      </div>
    </div>
  );
}
