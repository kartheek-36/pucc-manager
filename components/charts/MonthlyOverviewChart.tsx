'use client';

import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatINR } from '@/lib/calculations/financial';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MonthlyOverviewChartProps {
  initialData?: {
    month_name: string;
    total_collection: number;
    total_expenses: number;
    net_collection: number;
    total_tests: number;
    working_days: number;
    daily_average: number;
    best_van?: { van_number: string; collection: number };
    chart_data: Array<{ date: string; day: number; collection: number; tests: number }>;
  };
}

export function MonthlyOverviewChart({ initialData }: MonthlyOverviewChartProps) {
  const currentDate = new Date();
  const [year, setYear] = useState(currentDate.getFullYear());
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);

  const fetchMonthData = async (y: number, m: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/monthly?year=${y}&month=${m}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch {
      // quiet fail
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => {
    let nextM = month - 1;
    let nextY = year;
    if (nextM < 1) {
      nextM = 12;
      nextY -= 1;
    }
    setMonth(nextM);
    setYear(nextY);
    fetchMonthData(nextY, nextM);
  };

  const handleNextMonth = () => {
    let nextM = month + 1;
    let nextY = year;
    if (nextM > 12) {
      nextM = 1;
      nextY += 1;
    }
    setMonth(nextM);
    setYear(nextY);
    fetchMonthData(nextY, nextM);
  };

  const displayData = data || initialData;
  const chartItems = displayData?.chart_data || (displayData as any)?.days || [];

  return (
    <div className="bg-[#FFFFFF] rounded-xl p-5 border border-[#E7E9ED] space-y-5">
      {/* Header & Month Navigator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#6B7280]">
            MONTHLY REPORT
          </h2>
          <p className="text-xs text-[#6B7280]">Cumulative business performance & daily trend</p>
        </div>

        <div className="flex items-center gap-1 bg-[#F7F8FA] p-1 rounded-lg border border-[#E7E9ED] self-start sm:self-auto">
          <button
            onClick={handlePrevMonth}
            disabled={loading}
            className="p-1 rounded-md text-[#6B7280] hover:text-[#111827] hover:bg-[#FFFFFF] transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold text-[#111827] px-2 min-w-[120px] text-center">
            {displayData?.month_name || `${month}/${year}`}
          </span>
          <button
            onClick={handleNextMonth}
            disabled={loading}
            className="p-1 rounded-md text-[#6B7280] hover:text-[#111827] hover:bg-[#FFFFFF] transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Top 5 Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-lg bg-[#F7F8FA] border border-[#E7E9ED]">
          <span className="text-[11px] font-medium text-[#6B7280] block uppercase tracking-wider">
            Collection
          </span>
          <p className="text-xl font-bold text-[#111827] mt-1">
            {formatINR(displayData?.total_collection ?? 0)}
          </p>
        </div>

        <div className="p-3.5 rounded-lg bg-[#F7F8FA] border border-[#E7E9ED]">
          <span className="text-[11px] font-medium text-[#6B7280] block uppercase tracking-wider">
            Tests
          </span>
          <p className="text-xl font-bold text-[#111827] mt-1">
            {displayData?.total_tests ?? 0}
          </p>
        </div>

        <div className="p-3.5 rounded-lg bg-[#F7F8FA] border border-[#E7E9ED]">
          <span className="text-[11px] font-medium text-[#6B7280] block uppercase tracking-wider">
            Expenses
          </span>
          <p className="text-xl font-bold text-[#111827] mt-1">
            {formatINR(displayData?.total_expenses ?? 0)}
          </p>
        </div>

        <div className="p-3.5 rounded-lg bg-[#F7F8FA] border border-[#E7E9ED]">
          <span className="text-[11px] font-medium text-[#6B7280] block uppercase tracking-wider">
            Net
          </span>
          <p className="text-xl font-bold text-[#16A34A] mt-1">
            {formatINR(displayData?.net_collection ?? 0)}
          </p>
        </div>

        <div className="col-span-2 sm:col-span-1 p-3.5 rounded-lg bg-[#F7F8FA] border border-[#E7E9ED]">
          <span className="text-[11px] font-medium text-[#6B7280] block uppercase tracking-wider">
            Average / Day
          </span>
          <p className="text-xl font-bold text-[#1D4ED8] mt-1">
            {formatINR(displayData?.daily_average ?? 0)}
          </p>
        </div>
      </div>

      {/* Monthly Daily Bar Chart */}
      <div className="h-56 w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartItems} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7E9ED" />
            <XAxis
              dataKey="day"
              axisLine={{ stroke: '#E7E9ED' }}
              tickLine={false}
              tick={{ fill: '#6B7280', fontSize: 11 }}
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
                    <div className="bg-[#FFFFFF] border border-[#E7E9ED] p-3 rounded-lg shadow-md text-xs space-y-1">
                      <p className="font-semibold text-[#111827]">Day {item.day} ({item.date})</p>
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
            <Bar dataKey="collection" fill="#1D4ED8" radius={[4, 4, 0, 0]} maxBarSize={16} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Van Comparison */}
      <div className="pt-3 border-t border-[#E7E9ED] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider block">
            Best Performing Van
          </span>
          <p className="text-sm font-bold text-[#111827] mt-0.5">
            {displayData?.best_van?.van_number || 'Van 02'} — {formatINR(displayData?.best_van?.collection ?? 0)}
          </p>
        </div>
        <p className="text-xs text-[#6B7280]">
          Total Active Days: <strong className="text-[#111827]">{displayData?.working_days ?? 0} days</strong>
        </p>
      </div>
    </div>
  );
}
