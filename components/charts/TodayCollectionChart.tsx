'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { formatINR } from '@/lib/calculations/financial';

interface VanBarItem {
  van_number: string;
  collection: number;
  tests: number;
}

interface TodayCollectionChartProps {
  data: VanBarItem[];
}

const COLORS = ['#1D4ED8', '#2563EB', '#3B82F6'];

export function TodayCollectionChart({ data }: TodayCollectionChartProps) {
  const hasData = data && data.some((d) => d.collection > 0);

  if (!hasData) {
    return (
      <div className="bg-[#FFFFFF] rounded-xl p-5 border border-[#E7E9ED] flex flex-col items-center justify-center min-h-[160px] text-center">
        <p className="text-sm font-medium text-[#6B7280]">No report submitted yet today.</p>
        <p className="text-xs text-[#9CA3AF] mt-0.5">Van collection chart will appear when reports are submitted.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#FFFFFF] rounded-xl p-5 border border-[#E7E9ED] space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
            TODAY'S COLLECTION CHART
          </h2>
          <p className="text-xs text-[#6B7280]">Van-wise revenue distribution</p>
        </div>
      </div>

      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7E9ED" />
            <XAxis
              dataKey="van_number"
              axisLine={{ stroke: '#E7E9ED' }}
              tickLine={false}
              tick={{ fill: '#6B7280', fontSize: 12, fontWeight: 500 }}
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
                  const item = payload[0].payload as VanBarItem;
                  return (
                    <div className="bg-[#FFFFFF] border border-[#E7E9ED] p-2.5 rounded-lg shadow-md text-xs space-y-1">
                      <p className="font-semibold text-[#111827]">{item.van_number}</p>
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
            <Bar dataKey="collection" radius={[6, 6, 0, 0]} maxBarSize={48}>
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
