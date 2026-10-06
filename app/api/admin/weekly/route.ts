import { NextRequest } from 'next/server';
import { authenticateRequest, requireAdmin } from '@/lib/auth/session';
import { getReports, getVans } from '@/lib/db';
import { getLast7DaysIST, roundTo2Decimals } from '@/lib/calculations/financial';
import { successResponse, errorResponse } from '@/lib/api/response';

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth || !requireAdmin(auth)) {
      return errorResponse('FORBIDDEN', 'Admin privileges required', 403);
    }

    const { searchParams } = new URL(req.url);
    const vanId = searchParams.get('van_id'); // Optional filter by van

    const last7Days = getLast7DaysIST();
    const startDate = last7Days[last7Days.length - 1];
    const endDate = last7Days[0];

    const [vans, reports] = await Promise.all([
      getVans(),
      getReports({
        startDate,
        endDate,
        van_id: vanId || undefined,
      }),
    ]);

    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const daysData = last7Days.map((dateStr) => {
      const dayReports = reports.filter((r) => r.report_date === dateStr);
      const dayDate = new Date(`${dateStr}T12:00:00Z`);
      const dayName = daysOfWeek[dayDate.getUTCDay()];

      let collection = 0;
      let expenses = 0;
      let tests = 0;
      let petrolTests = 0;
      let dieselTests = 0;
      let otherTests = 0;

      for (const r of dayReports) {
        collection += r.total_collection;
        expenses += r.expenses;
        tests += r.total_tests;
        petrolTests += r.petrol_tests;
        dieselTests += r.diesel_tests;
        otherTests += r.other_tests;
      }

      return {
        date: dateStr,
        day_name: dayName,
        total_collection: roundTo2Decimals(collection),
        expenses: roundTo2Decimals(expenses),
        net_collection: roundTo2Decimals(collection - expenses),
        total_tests: tests,
        petrol_tests: petrolTests,
        diesel_tests: dieselTests,
        other_tests: otherTests,
      };
    });

    const totalCollection = daysData.reduce((acc, d) => acc + d.total_collection, 0);
    const totalTests = daysData.reduce((acc, d) => acc + d.total_tests, 0);
    const dailyAverage = roundTo2Decimals(totalCollection / (daysData.length || 1));

    // Best Day
    let bestDay = daysData[0];
    for (const d of daysData) {
      if (d.total_collection > (bestDay?.total_collection || 0)) {
        bestDay = d;
      }
    }

    // Best Van
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

    return successResponse({
      total_collection: roundTo2Decimals(totalCollection),
      total_tests: totalTests,
      daily_average: dailyAverage,
      best_day: bestDay,
      best_van: { van_number: bestVan, collection: roundTo2Decimals(bestVanAmount) },
      days: daysData,
      vans: vans.map((v) => ({ id: v.id, van_number: v.van_number })),
    });
  } catch (error: any) {
    return errorResponse('INTERNAL_ERROR', error.message, 500);
  }
}
