'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { formatINR } from '@/lib/calculations/financial';
import { ArrowLeft, Truck, User } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ReportsTable } from '@/components/reports/ReportsTable';

export default function AdminVanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchVanDetail = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/vans/${id}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVanDetail();
  }, [id]);

  if (loading || !data) {
    return (
      <AdminLayout>
        <div className="space-y-4 max-w-4xl mx-auto">
          <div className="h-6 w-32 bg-[#F3F4F6] rounded-md animate-pulse" />
          <div className="h-40 bg-[#FFFFFF] rounded-xl border border-[#E7E9ED] animate-pulse" />
        </div>
      </AdminLayout>
    );
  }

  const { van, metrics, chart_data, history } = data;

  return (
    <AdminLayout adminName="Venkateswara Rao">
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Navigation */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#6B7280] hover:text-[#111827] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Fleet List
        </button>

        {/* Van Profile Header */}
        <div className="bg-[#FFFFFF] rounded-xl p-5 border border-[#E7E9ED] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8] flex items-center justify-center font-bold text-xl">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-[#111827]">
                  {van.van_number}
                </h1>
                <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-md bg-[#F7F8FA] text-[#6B7280] border border-[#E7E9ED]">
                  {van.registration_number}
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-[#16A34A] border border-emerald-200">
                  {van.status}
                </span>
              </div>
              <p className="text-xs text-[#6B7280] mt-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                <span>Assigned Operator: <strong className="text-[#111827]">{van.operator?.name || 'Unassigned'}</strong></span>
              </p>
            </div>
          </div>
        </div>

        {/* 4 Van Specific Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E7E9ED] shadow-xs">
            <span className="text-[11px] font-medium uppercase text-[#6B7280]">Weekly Collection</span>
            <p className="text-xl font-bold text-[#111827] mt-1">
              {formatINR(metrics.weekly_collection)}
            </p>
            <p className="text-[11px] text-[#6B7280]">Last 7 days</p>
          </div>

          <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E7E9ED] shadow-xs">
            <span className="text-[11px] font-medium uppercase text-[#6B7280]">Monthly Collection</span>
            <p className="text-xl font-bold text-[#111827] mt-1">
              {formatINR(metrics.monthly_collection)}
            </p>
            <p className="text-[11px] text-[#6B7280]">Current month</p>
          </div>

          <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E7E9ED] shadow-xs">
            <span className="text-[11px] font-medium uppercase text-[#6B7280]">Total Tests</span>
            <p className="text-xl font-bold text-[#1D4ED8] mt-1">
              {metrics.total_tests_all_time} Tests
            </p>
            <p className="text-[11px] text-[#6B7280]">{metrics.total_tests_month} this month</p>
          </div>

          <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E7E9ED] shadow-xs">
            <span className="text-[11px] font-medium uppercase text-[#6B7280]">Daily Average</span>
            <p className="text-xl font-bold text-[#16A34A] mt-1">
              {formatINR(metrics.average_daily_collection)}
            </p>
            <p className="text-[11px] text-[#6B7280]">Across {metrics.total_reports} reports</p>
          </div>
        </div>

        {/* Daily Collection Chart */}
        <div className="bg-[#FFFFFF] rounded-xl p-5 border border-[#E7E9ED] shadow-xs space-y-3">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
              {van.van_number} Daily Collection Trend
            </h2>
            <p className="text-xs text-[#6B7280]">Daily revenue curve over past reporting periods</p>
          </div>

          <div className="h-56 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart_data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="singleVanGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1D4ED8" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#1D4ED8" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7E9ED" />
                <XAxis
                  dataKey="date"
                  axisLine={{ stroke: '#E7E9ED' }}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 11 }}
                  tickFormatter={(val) => val.slice(5)}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 11 }}
                  tickFormatter={(val) => `₹${val >= 1000 ? `${Math.round(val / 1000)}k` : val}`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div className="bg-[#FFFFFF] border border-[#E7E9ED] p-2.5 rounded-lg shadow-md text-xs space-y-1">
                          <p className="font-semibold text-[#111827]">{item.date}</p>
                          <p className="font-bold text-[#1D4ED8]">
                            Collection: {formatINR(item.collection)}
                          </p>
                          <p className="text-[#6B7280]">Tests: {item.tests} vehicles</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="collection"
                  stroke="#1D4ED8"
                  strokeWidth={2}
                  fill="url(#singleVanGrad)"
                  dot={{ r: 3, fill: '#1D4ED8', stroke: '#FFFFFF', strokeWidth: 1.5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Report History */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-[#111827]">
            {van.van_number} Report History
          </h2>
          <ReportsTable reports={history} />
        </div>
      </div>
    </AdminLayout>
  );
}
