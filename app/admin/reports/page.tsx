'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { ReportsTable } from '@/components/reports/ReportsTable';
import { DailyReport, Van } from '@/types';
import { formatINR, getTodayISTDateString, getLast7DaysIST, getCurrentMonthISTRange } from '@/lib/calculations/financial';
import { RefreshCw } from 'lucide-react';

export default function AdminReportsPage() {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [vans, setVans] = useState<Van[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterType, setFilterType] = useState<'today' | 'week' | 'month' | 'custom'>('month');
  const [selectedVanId, setSelectedVanId] = useState<string>('ALL');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  const fetchVans = async () => {
    try {
      const res = await fetch('/api/admin/vans');
      const json = await res.json();
      if (json.success) setVans(json.data);
    } catch {}
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      let start = '';
      let end = '';

      if (filterType === 'today') {
        const today = getTodayISTDateString();
        start = today;
        end = today;
      } else if (filterType === 'week') {
        const last7 = getLast7DaysIST();
        start = last7[last7.length - 1];
        end = last7[0];
      } else if (filterType === 'month') {
        const monthRange = getCurrentMonthISTRange();
        start = monthRange.start;
        end = monthRange.end;
      } else if (filterType === 'custom') {
        start = customStart;
        end = customEnd;
      }

      const params = new URLSearchParams();
      if (start) params.set('startDate', start);
      if (end) params.set('endDate', end);
      if (selectedVanId !== 'ALL') params.set('van_id', selectedVanId);

      const res = await fetch(`/api/reports?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setReports(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVans();
  }, []);

  useEffect(() => {
    fetchReports();
  }, [filterType, selectedVanId, customStart, customEnd]);

  // Aggregate Totals
  const totalCollection = reports.reduce((acc, r) => acc + r.total_collection, 0);
  const totalExpenses = reports.reduce((acc, r) => acc + r.expenses, 0);
  const netCollection = reports.reduce((acc, r) => acc + r.net_collection, 0);
  const totalTests = reports.reduce((acc, r) => acc + r.total_tests, 0);

  return (
    <AdminLayout adminName="Venkateswara Rao">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#111827]">
              Reports & History
            </h1>
            <p className="text-xs text-[#6B7280]">
              Filter, inspect, and export daily collections and certificates
            </p>
          </div>

          <button
            onClick={fetchReports}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FFFFFF] border border-[#E7E9ED] text-[#111827] hover:bg-[#F7F8FA]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* 4 Summary Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E7E9ED] shadow-xs">
            <span className="text-[11px] font-medium uppercase text-[#6B7280]">Total Collection</span>
            <p className="text-xl font-bold text-[#111827] mt-1">
              {formatINR(totalCollection)}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E7E9ED] shadow-xs">
            <span className="text-[11px] font-medium uppercase text-[#6B7280]">Total Expenses</span>
            <p className="text-xl font-bold text-[#DC2626] mt-1">
              {formatINR(totalExpenses)}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E7E9ED] shadow-xs">
            <span className="text-[11px] font-medium uppercase text-[#6B7280]">Net Collection</span>
            <p className="text-xl font-bold text-[#16A34A] mt-1">
              {formatINR(netCollection)}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E7E9ED] shadow-xs">
            <span className="text-[11px] font-medium uppercase text-[#6B7280]">Total Tests</span>
            <p className="text-xl font-bold text-[#1D4ED8] mt-1">
              {totalTests}
            </p>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#E7E9ED] shadow-xs flex flex-wrap items-center gap-2.5">
          {/* Preset Date Range Buttons */}
          <div className="flex items-center gap-1 bg-[#F7F8FA] p-1 rounded-lg border border-[#E7E9ED] text-xs font-medium">
            {(['today', 'week', 'month', 'custom'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  filterType === type
                    ? 'bg-[#FFFFFF] text-[#1D4ED8] font-semibold shadow-xs border border-[#E7E9ED]'
                    : 'text-[#6B7280] hover:text-[#111827]'
                }`}
              >
                {type === 'today'
                  ? 'Today'
                  : type === 'week'
                  ? 'This Week'
                  : type === 'month'
                  ? 'This Month'
                  : 'Custom'}
              </button>
            ))}
          </div>

          {/* Van Filter Dropdown */}
          <select
            value={selectedVanId}
            onChange={(e) => setSelectedVanId(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#FFFFFF] border border-[#E7E9ED] text-[#111827] outline-none"
          >
            <option value="ALL">All Vans</option>
            {vans.map((v) => (
              <option key={v.id} value={v.id}>
                {v.van_number} ({v.registration_number})
              </option>
            ))}
          </select>

          {/* Custom Date Range Pickers */}
          {filterType === 'custom' && (
            <div className="flex items-center gap-1.5 text-xs">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-[#E7E9ED] bg-[#FFFFFF] text-[#111827] text-xs"
              />
              <span className="text-[#6B7280]">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-[#E7E9ED] bg-[#FFFFFF] text-[#111827] text-xs"
              />
            </div>
          )}
        </div>

        {/* Table / Cards */}
        <ReportsTable reports={reports} loading={loading} />
      </div>
    </AdminLayout>
  );
}
