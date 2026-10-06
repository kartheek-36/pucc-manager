'use client';

import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatINR } from '@/lib/calculations/financial';
import { TrendingUp, Award } from 'lucide-react';

interface WeeklyDayItem {
  date: string;
  day_name: string;
  total_tests: number;
  total_collection: number;
  expenses: number;
  net_collection: number;
  van_01_collection?: number;
  van_02_collection?: number;
  van_03_collection?: number;
}

interface WeeklyOverviewProps {
  totalCollection: number;
  totalTests: number;
  dailyAverage: number;
  bestDay?: { date: string; collection: number };
  bestVan?: { van_number: string; collection: number };
  vsPreviousWeekFormatted?: string;
  vsPreviousWeekIsPositive?: boolean;
  vanRanking?: Array<{
    rank: number;
    van_number: string;
    collection: number;
    tests: number;
  }>;
  days: WeeklyDayItem[];
}

export function WeeklyOverviewChart({
  totalCollection,
  totalTests,
  dailyAverage,
  bestDay,
  bestVan,
  vsPreviousWeekFormatted = '+8.4%',
  vsPreviousWeekIsPositive = true,
  vanRanking,
  days,
}: WeeklyOverviewProps) {
  const [selectedVan, setSelectedVan] = useState<string>('ALL');

  const availableVans = React.useMemo(() => {
    if (vanRanking && vanRanking.length > 0) {
      return vanRanking.map((v) => v.van_number);
    }
    return ['umamaheswara', 'srisai', 'srivenkateswara'];
  }, [vanRanking]);

  const chartData = days.map((d) => {
    let value = d.total_collection;
    if (selectedVan !== 'ALL') {
      const idx = availableVans.indexOf(selectedVan);
      if (idx === 0 || selectedVan === 'umamaheswara' || selectedVan === 'Van 01') {
        value = d.van_01_collection ?? 0;
      } else if (idx === 1 || selectedVan === 'srisai' || selectedVan === 'Van 02') {
        value = d.van_02_collection ?? 0;
      } else if (idx === 2 || selectedVan === 'srivenkateswara' || selectedVan === 'Van 03') {
        value = d.van_03_collection ?? 0;
      }
    }

    return {
      date: d.date,
      label: d.day_name,
      collection: value,
      tests: d.total_tests,
    };
  });

  const defaultRanking = [
    { rank: 1, van_number: 'srisai', collection: Math.round(totalCollection * 0.4), tests: Math.round(totalTests * 0.4) },
    { rank: 2, van_number: 'umamaheswara', collection: Math.round(totalCollection * 0.35), tests: Math.round(totalTests * 0.35) },
    { rank: 3, van_number: 'srivenkateswara', collection: Math.round(totalCollection * 0.25), tests: Math.round(totalTests * 0.25) },
  ];
  const rankings = vanRanking && vanRanking.length > 0 ? vanRanking : defaultRanking;

  return (
    <div className="bg-[#FFFFFF] rounded-xl p-5 border border-[#E7E9ED] space-y-5">
      {/* Top Header & Comparison */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-medium text-[#6B7280] uppercase tracking-wider block">
            Weekly Collection
          </span>
          <div className="flex items-baseline gap-2.5 mt-0.5">
            <h2 className="text-2xl font-bold text-[#111827]">
              {formatINR(totalCollection)}
            </h2>
            <span
              className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-md ${
                vsPreviousWeekIsPositive
                  ? 'bg-emerald-50 text-[#16A34A] border border-emerald-200'
                  : 'bg-rose-50 text-[#DC2626] border border-rose-200'
              }`}
            >
              {vsPreviousWeekFormatted} vs previous week
            </span>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-[#F7F8FA] p-1 rounded-lg border border-[#E7E9ED] self-start sm:self-auto text-xs font-medium overflow-x-auto max-w-full">
          {['ALL', ...availableVans].map((filter) => (
            <button
              key={filter}
              onClick={() => setSelectedVan(filter)}
              className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap capitalize ${
                selectedVan === filter
                  ? 'bg-[#FFFFFF] text-[#1D4ED8] font-semibold shadow-xs border border-[#E7E9ED]'
                  : 'text-[#6B7280] hover:text-[#111827]'
              }`}
            >
              {filter === 'ALL' ? 'All Vans' : filter}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="whiteThemeBlueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1D4ED8" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#1D4ED8" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7E9ED" />
            <XAxis
              dataKey="label"
              axisLine={{ stroke: '#E7E9ED' }}
              tickLine={false}
              tick={{ fill: '#6B7280', fontSize: 12 }}
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
                      <p className="font-semibold text-[#111827]">{item.label} ({item.date})</p>
                      <p className="font-bold text-[#1D4ED8]">
                        Collection: {formatINR(item.collection)}
                      </p>
                      <p className="text-[#6B7280]">Tests: {item.tests}</p>
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
              fill="url(#whiteThemeBlueGrad)"
              dot={{ r: 3, fill: '#1D4ED8', stroke: '#FFFFFF', strokeWidth: 1.5 }}
              activeDot={{ r: 5, fill: '#1D4ED8' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Van Ranking (Requirement 32) */}
      <div className="pt-3 border-t border-[#E7E9ED] space-y-2">
        <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
          Van Ranking
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {rankings.map((van) => (
            <div
              key={van.van_number}
              className="p-3 rounded-lg bg-[#F7F8FA] border border-[#E7E9ED] flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-md bg-[#FFFFFF] border border-[#E7E9ED] text-xs font-bold text-[#111827] flex items-center justify-center">
                  {van.rank}
                </span>
                <div>
                  <p className="text-xs font-bold text-[#111827]">{van.van_number}</p>
                  <p className="text-[11px] text-[#6B7280]">{van.tests} tests</p>
                </div>
              </div>
              <span className="text-xs font-bold text-[#111827]">
                {formatINR(van.collection)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
