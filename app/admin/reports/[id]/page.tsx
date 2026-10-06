'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { DailyReport } from '@/types';
import { formatINR, formatISTDateTime } from '@/lib/calculations/financial';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  User,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export default function AdminReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const id = params?.id as string;
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchReport = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/reports/${id}`);
      const json = await res.json();
      if (json.success) {
        setReport(json.data);
      } else {
        toast(json.error?.message || 'Report not found', 'error');
      }
    } catch {
      toast('Error loading report', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [id]);

  const updateStatus = async (newStatus: 'APPROVED' | 'REJECTED') => {
    if (!report) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/reports/${report.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        setReport(json.data);
        toast(`Report status set to ${newStatus}`, 'success');
      } else {
        toast(json.error?.message || 'Failed to update status', 'error');
      }
    } catch {
      toast('Failed to update report', 'error');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-4 max-w-xl mx-auto">
          <div className="h-6 w-32 bg-[#F3F4F6] rounded-md animate-pulse" />
          <div className="h-64 bg-[#FFFFFF] rounded-xl border border-[#E7E9ED] animate-pulse" />
        </div>
      </AdminLayout>
    );
  }

  if (!report) {
    return (
      <AdminLayout>
        <div className="max-w-md mx-auto text-center py-12 space-y-4">
          <p className="text-base font-semibold text-[#111827]">Report not found</p>
          <button
            onClick={() => router.push('/admin/reports')}
            className="px-4 py-2 bg-[#1D4ED8] text-white rounded-lg text-xs font-semibold"
          >
            Back to Reports
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout adminName="Venkateswara Rao">
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#6B7280] hover:text-[#111827] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Reports
          </button>

          <span
            className={`text-xs font-semibold px-2.5 py-0.5 rounded-md ${
              report.status === 'APPROVED'
                ? 'bg-emerald-50 text-[#16A34A] border border-emerald-200'
                : report.status === 'REJECTED'
                ? 'bg-rose-50 text-[#DC2626] border border-rose-200'
                : 'bg-blue-50 text-[#1D4ED8] border border-blue-200'
            }`}
          >
            {report.status}
          </span>
        </div>

        {/* Report Overview Card */}
        <div className="bg-[#FFFFFF] rounded-xl p-6 border border-[#E7E9ED] shadow-xs space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-[#E7E9ED] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-[#111827]">
                  {report.van?.van_number}
                </h1>
                <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-[#F7F8FA] text-[#6B7280] border border-[#E7E9ED]">
                  {report.van?.registration_number}
                </span>
              </div>
              <p className="text-xs text-[#6B7280] mt-1 font-mono">Date: {report.report_date}</p>
            </div>

            <div className="text-right text-xs">
              <span className="text-[#6B7280] block">Submitted</span>
              <span className="font-semibold text-[#111827]">
                {formatISTDateTime(report.submitted_at)}
              </span>
            </div>
          </div>

          {/* Operator Info */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[#F7F8FA] border border-[#E7E9ED] text-xs">
            <User className="w-4 h-4 text-[#6B7280]" />
            <div>
              <p className="font-semibold text-[#111827]">
                {report.operator?.name || 'Assigned Operator'}
              </p>
              <p className="text-[#6B7280]">{report.operator?.email} • {report.operator?.phone || 'No phone'}</p>
            </div>
          </div>

          {/* Test Numbers Breakdown */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
              Vehicles Tested
            </h3>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-3 rounded-lg bg-[#F7F8FA] border border-[#E7E9ED]">
                <span className="text-[10px] text-[#6B7280] block uppercase">Petrol</span>
                <span className="text-base font-bold text-[#111827]">{report.petrol_tests}</span>
              </div>
              <div className="p-3 rounded-lg bg-[#F7F8FA] border border-[#E7E9ED]">
                <span className="text-[10px] text-[#6B7280] block uppercase">Diesel</span>
                <span className="text-base font-bold text-[#111827]">{report.diesel_tests}</span>
              </div>
              <div className="p-3 rounded-lg bg-[#F7F8FA] border border-[#E7E9ED]">
                <span className="text-[10px] text-[#6B7280] block uppercase">Other</span>
                <span className="text-base font-bold text-[#111827]">{report.other_tests}</span>
              </div>
              <div className="p-3 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE]">
                <span className="text-[10px] text-[#1D4ED8] font-bold block uppercase">Total</span>
                <span className="text-base font-extrabold text-[#1D4ED8]">{report.total_tests}</span>
              </div>
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
              Financial Breakdown
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-lg bg-[#F7F8FA] border border-[#E7E9ED]">
                <span className="text-[10px] text-[#6B7280] block uppercase">Gross Collection</span>
                <span className="text-base font-bold text-[#111827]">
                  {formatINR(report.total_collection)}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-[#F7F8FA] border border-[#E7E9ED]">
                <span className="text-[10px] text-[#6B7280] block uppercase">Expenses</span>
                <span className="text-base font-bold text-[#DC2626]">
                  {formatINR(report.expenses)}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-[#F7F8FA] border border-[#E7E9ED]">
                <span className="text-[10px] text-[#6B7280] block uppercase">Net Collection</span>
                <span className="text-base font-bold text-[#16A34A]">
                  {formatINR(report.net_collection)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {report.notes && (
            <div className="p-3 rounded-lg bg-[#F7F8FA] border border-[#E7E9ED] text-xs">
              <span className="font-semibold text-[#111827] block mb-0.5">Operator Remarks:</span>
              <p className="text-[#6B7280]">{report.notes}</p>
            </div>
          )}

          {/* Admin Approval Actions */}
          <div className="pt-3 border-t border-[#E7E9ED] flex items-center gap-3">
            <button
              onClick={() => updateStatus('APPROVED')}
              disabled={updating || report.status === 'APPROVED'}
              className="flex-1 h-11 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Approve Report</span>
            </button>

            <button
              onClick={() => updateStatus('REJECTED')}
              disabled={updating || report.status === 'REJECTED'}
              className="flex-1 h-11 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40"
            >
              <XCircle className="w-4 h-4" />
              <span>Reject Report</span>
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
