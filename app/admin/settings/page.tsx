'use client';

import React, { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Clock, Play, Shield, Database, Smartphone } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export default function AdminSettingsPage() {
  const [deadlineHour, setDeadlineHour] = useState('20');
  const [deadlineMin, setDeadlineMin] = useState('00');
  const [cronSecret, setCronSecret] = useState('rto_cron_secret_key_2026');
  const [testingCron, setTestingCron] = useState(false);
  const [cronResult, setCronResult] = useState<any>(null);
  const { toast } = useToast();

  const handleTestCron = async (force: boolean) => {
    setTestingCron(true);
    setCronResult(null);
    try {
      const res = await fetch(`/api/cron/pending-reports?secret=${cronSecret}&force=${force}`);
      const json = await res.json();
      setCronResult(json);
      if (json.success) {
        toast('Pending reports cron executed successfully!', 'success');
      } else {
        toast(json.error?.message || 'Cron execution failed', 'error');
      }
    } catch {
      toast('Error triggering cron endpoint', 'error');
    } finally {
      setTestingCron(false);
    }
  };

  return (
    <AdminLayout adminName="Venkateswara Rao">
      <div className="space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#111827]">
            System & Reporting Settings
          </h1>
          <p className="text-xs text-[#6B7280]">
            Configure reporting deadlines, scheduled cron triggers, and integrations
          </p>
        </div>

        {/* 1. Daily Reporting Deadline Card */}
        <div className="bg-[#FFFFFF] rounded-xl p-5 border border-[#E7E9ED] shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-[#F59E0B] border border-amber-200 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#111827]">
                Daily Reporting Deadline
              </h2>
              <p className="text-xs text-[#6B7280]">
                Threshold after which unsubmitted van reports trigger pending alerts
              </p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-[#F7F8FA] border border-[#E7E9ED] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-medium text-[#6B7280] block">
                Deadline (Asia/Kolkata IST):
              </span>
              <span className="text-lg font-bold text-[#1D4ED8] mt-0.5 block">
                {deadlineHour}:{deadlineMin} IST (Default: 8:00 PM IST)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={deadlineHour}
                onChange={(e) => setDeadlineHour(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FFFFFF] border border-[#E7E9ED] text-[#111827] outline-none"
              >
                <option value="18">06:00 PM (18:00)</option>
                <option value="19">07:00 PM (19:00)</option>
                <option value="20">08:00 PM (20:00 - Default)</option>
                <option value="21">09:00 PM (21:00)</option>
                <option value="22">10:00 PM (22:00)</option>
              </select>
              <button
                onClick={() => toast(`Daily reporting deadline set to ${deadlineHour}:00 IST!`, 'success')}
                className="px-3 py-1.5 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white font-semibold text-xs transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>

        {/* 2. Scheduled Cron Job Endpoint */}
        <div className="bg-[#FFFFFF] rounded-xl p-5 border border-[#E7E9ED] shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] flex items-center justify-center">
              <Play className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#111827]">
                Scheduled Server Job / Cron Trigger
              </h2>
              <p className="text-xs text-[#6B7280]">
                Protected endpoint invoked daily at 8:00 PM IST to alert on unsubmitted vans
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-medium text-[#6B7280] block mb-1">
                Cron Secret (CRON_SECRET)
              </label>
              <input
                type="text"
                value={cronSecret}
                onChange={(e) => setCronSecret(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#E7E9ED] bg-[#FFFFFF] font-mono text-xs text-[#111827] outline-none focus:border-[#1D4ED8]"
              />
              <p className="text-[11px] text-[#6B7280] mt-1">
                Cron URL: <code className="text-[#1D4ED8]">/api/cron/pending-reports?secret={cronSecret}</code>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                onClick={() => handleTestCron(true)}
                disabled={testingCron}
                className="h-10 px-3.5 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white font-semibold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Test Run: Check Pending Vans Now (Force)</span>
              </button>

              <button
                onClick={() => handleTestCron(false)}
                disabled={testingCron}
                className="h-10 px-3.5 rounded-lg bg-[#F7F8FA] hover:bg-slate-100 text-[#111827] border border-[#E7E9ED] font-semibold text-xs transition-colors disabled:opacity-50"
              >
                <span>Run Standard Deadline Check</span>
              </button>
            </div>

            {cronResult && (
              <div className="p-3.5 rounded-lg bg-[#F7F8FA] border border-[#E7E9ED] text-[#111827] font-mono text-xs space-y-1 overflow-x-auto">
                <p className="text-[#16A34A] font-bold">Execution Output:</p>
                <pre>{JSON.stringify(cronResult, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>

        {/* 3. System Architecture & Diagnostics */}
        <div className="bg-[#FFFFFF] rounded-xl p-5 border border-[#E7E9ED] shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-[#111827]">
            Architecture Verification
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-[#F7F8FA] border border-[#E7E9ED] space-y-1">
              <div className="flex items-center gap-2 font-bold text-[#111827]">
                <Database className="w-4 h-4 text-[#1D4ED8]" />
                <span>PostgreSQL + Prisma</span>
              </div>
              <p className="text-[#6B7280] text-[11px]">
                UUIDs, DECIMAL(12,2), TIMESTAMPTZ, Unique (van_id, report_date)
              </p>
            </div>

            <div className="p-3 rounded-lg bg-[#F7F8FA] border border-[#E7E9ED] space-y-1">
              <div className="flex items-center gap-2 font-bold text-[#111827]">
                <Shield className="w-4 h-4 text-[#16A34A]" />
                <span>Firebase Auth & Admin</span>
              </div>
              <p className="text-[#6B7280] text-[11px]">
                Server-side ID token verification & RBAC enforcement
              </p>
            </div>

            <div className="p-3 rounded-lg bg-[#F7F8FA] border border-[#E7E9ED] space-y-1">
              <div className="flex items-center gap-2 font-bold text-[#111827]">
                <Smartphone className="w-4 h-4 text-[#7C3AED]" />
                <span>PWA & FCM Push</span>
              </div>
              <p className="text-[#6B7280] text-[11px]">
                Service worker background alerts & standalone manifest
              </p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
