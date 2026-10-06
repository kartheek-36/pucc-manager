import { NextRequest } from 'next/server';
import { authenticateRequest, requireAdmin } from '@/lib/auth/session';
import { getReports, getVans } from '@/lib/db';
import { roundTo2Decimals, getTodayISTDateString } from '@/lib/calculations/financial';
import { successResponse, errorResponse } from '@/lib/api/response';

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth || !requireAdmin(auth)) {
      return errorResponse('FORBIDDEN', 'Admin privileges required', 403);
    }

    const { searchParams } = new URL(req.url);
    const todayStr = getTodayISTDateString();
    const [currentYear, currentMonth] = todayStr.split('-').map(Number);

    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!, 10) : currentYear;
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!, 10) : currentMonth;
    const vanId = searchParams.get('van_id') || undefined;

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDayOfMonth = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;

    const [vans, reports] = await Promise.all([
      getVans(),
      getReports({
        startDate,
        endDate,
        van_id: vanId,
      }),
    ]);

    let totalCollection = 0;
    let totalExpenses = 0;
    let totalTests = 0;

    const dailyAggregates = new Map<string, { collection: number; expenses: number; tests: number }>();

    for (let day = 1; day <= lastDayOfMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      dailyAggregates.set(dateStr, { collection: 0, expenses: 0, tests: 0 });
    }

    for (const r of reports) {
      totalCollection += r.total_collection;
      totalExpenses += r.expenses;
      totalTests += r.total_tests;

      const current = dailyAggregates.get(r.report_date) || { collection: 0, expenses: 0, tests: 0 };
      dailyAggregates.set(r.report_date, {
        collection: current.collection + r.total_collection,
        expenses: current.expenses + r.expenses,
        tests: current.tests + r.total_tests,
      });
    }

    const workingDays = Array.from(dailyAggregates.values()).filter((v) => v.collection > 0 || v.tests > 0).length || 1;
    const dailyAverage = roundTo2Decimals(totalCollection / workingDays);

    // Best van for the month
    const vanTotals: Record<string, number> = {};
    for (const r of reports) {
      const v = vans.find((x) => x.id === r.van_id);
      if (v) {
        vanTotals[v.van_number] = (vanTotals[v.van_number] || 0) + r.total_collection;
      }
    }
    let bestVan = vans[0]?.van_number || 'umamaheswara';
    let bestVanAmount = 0;
    for (const [vName, col] of Object.entries(vanTotals)) {
      if (col > bestVanAmount) {
        bestVanAmount = col;
        bestVan = vName;
      }
    }

    const monthDate = new Date(Date.UTC(year, month - 1, 1));
    const monthName = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(monthDate);

    const chartData = Array.from(dailyAggregates.entries()).map(([dateStr, val]) => ({
      date: dateStr,
      day: parseInt(dateStr.split('-')[2], 10),
      collection: roundTo2Decimals(val.collection),
      expenses: roundTo2Decimals(val.expenses),
      net: roundTo2Decimals(val.collection - val.expenses),
      tests: val.tests,
    }));

    return successResponse({
      year,
      month,
      month_name: monthName,
      total_collection: roundTo2Decimals(totalCollection),
      total_expenses: roundTo2Decimals(totalExpenses),
      net_collection: roundTo2Decimals(totalCollection - totalExpenses),
      total_tests: totalTests,
      working_days: workingDays,
      daily_average: dailyAverage,
      best_van: { van_number: bestVan, collection: roundTo2Decimals(bestVanAmount) },
      days: chartData,
      vans: vans.map((v) => ({ id: v.id, van_number: v.van_number })),
    });
  } catch (error: any) {
    return errorResponse('INTERNAL_ERROR', error.message, 500);
  }
}
