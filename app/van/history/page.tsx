'use client';

import React, { useState, useEffect } from 'react';
import { VanLayout } from '@/components/layout/VanLayout';
import { DailyReport, User } from '@/types';
import { formatINR } from '@/lib/calculations/financial';
import { Calendar } from 'lucide-react';

export default function VanHistoryPage() {
  const [user, setUser] = useState<User | null>(null);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const meRes = await fetch('/api/auth/me');
      const meJson = await meRes.json();
      if (!meJson.success) return;
      setUser(meJson.data.user);

      const vanId = meJson.data.user.van_id;
      if (!vanId) return;

      const repRes = await fetch(`/api/reports?van_id=${vanId}&limit=60`);
      const repJson = await repRes.json();
      if (repJson.success) {
        setReports(repJson.data);
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

  return (
    <VanLayout
      vanNumber={user?.van?.van_number || 'Van Operator'}
      registrationNumber={user?.van?.registration_number || 'PUC Fleet'}
      operatorName={user?.name || 'Operator'}
    >
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-[#111827]">
            Submission History
          </h1>
          <p className="text-xs text-[#6B7280]">
            Past daily testing reports and collections submitted by this van
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-[#F3F4F6] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="p-8 text-center bg-[#FFFFFF] rounded-xl border border-[#E7E9ED]">
            <p className="text-sm font-medium text-[#6B7280]">No reports yet</p>
            <p className="text-xs text-[#9CA3AF] mt-1">Your daily collection reports will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <div
                key={report.id}
                className="bg-[#FFFFFF] rounded-xl p-4 border border-[#E7E9ED] shadow-xs space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#6B7280]" />
                    <span className="font-bold text-sm text-[#111827] font-mono">
                      {report.report_date}
                    </span>
                  </div>

                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                      report.status === 'APPROVED'
                        ? 'bg-emerald-50 text-[#16A34A] border border-emerald-200'
                        : 'bg-blue-50 text-[#1D4ED8] border border-blue-200'
                    }`}
                  >
                    {report.status}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1 p-2 rounded-lg bg-[#F7F8FA] border border-[#E7E9ED] text-center text-xs">
                  <div>
                    <span className="text-[10px] text-[#6B7280] block">Petrol</span>
                    <span className="font-bold text-[#111827]">{report.petrol_tests}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#6B7280] block">Diesel</span>
                    <span className="font-bold text-[#111827]">{report.diesel_tests}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#6B7280] block">Other</span>
                    <span className="font-bold text-[#111827]">{report.other_tests}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#1D4ED8] font-bold block">Total</span>
                    <span className="font-extrabold text-[#1D4ED8]">{report.total_tests}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <div>
                    <span className="text-[#6B7280]">Collection: </span>
                    <strong className="text-[#111827] font-bold">{formatINR(report.total_collection)}</strong>
                  </div>
                  <div>
                    <span className="text-[#6B7280]">Net: </span>
                    <strong className="text-[#16A34A] font-bold">{formatINR(report.net_collection)}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </VanLayout>
  );
}
