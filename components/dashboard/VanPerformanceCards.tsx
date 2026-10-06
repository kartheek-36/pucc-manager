'use client';

import React from 'react';
import Link from 'next/link';
import { formatINR } from '@/lib/calculations/financial';
import { ArrowRight } from 'lucide-react';

interface VanPerformanceItem {
  van_id: string;
  van_number: string;
  registration_number: string;
  operator_name?: string;
  status: string;
  report_status: 'SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'NO_REPORT';
  collection: number;
  tests: number;
  expenses: number;
  net: number;
  submitted_at?: string | null;
  report_id?: string | null;
}

interface VanPerformanceCardsProps {
  vans: VanPerformanceItem[];
}

export function VanPerformanceCards({ vans }: VanPerformanceCardsProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-[#111827]">
          TODAY'S VANS
        </h2>
        <Link
          href="/admin/vans"
          className="text-xs font-medium text-[#1D4ED8] hover:underline flex items-center gap-1"
        >
          All Vans <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {vans.map((van) => {
          const isSubmitted = van.report_status === 'SUBMITTED' || van.report_status === 'APPROVED';

          return (
            <Link
              key={van.van_id}
              href={van.report_id ? `/admin/reports/${van.report_id}` : `/admin/vans/${van.van_id}`}
              className="bg-[#FFFFFF] rounded-xl p-4 border border-[#E7E9ED] hover:border-[#1D4ED8] transition-colors block shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-base text-[#111827]">
                  {van.van_number}
                </span>
                {isSubmitted ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#16A34A]">
                    <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
                    Submitted
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#F59E0B]">
                    <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                    Pending
                  </span>
                )}
              </div>

              <div className="mt-2.5">
                <div className="text-2xl font-bold text-[#111827]">
                  {isSubmitted ? formatINR(van.collection) : 'Pending'}
                </div>
                <div className="text-xs text-[#6B7280] mt-0.5 flex items-center justify-between">
                  <span>{isSubmitted ? `${van.tests} tests` : 'No report yet ⚠'}</span>
                  <span className="font-mono text-[11px]">{van.registration_number}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
