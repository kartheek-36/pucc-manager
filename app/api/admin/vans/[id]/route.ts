import { NextRequest } from 'next/server';
import { authenticateRequest, requireAdmin } from '@/lib/auth/session';
import { getVanById, getReports } from '@/lib/db';
import {
  getLast7DaysIST,
  getCurrentMonthISTRange,
  roundTo2Decimals,
} from '@/lib/calculations/financial';
import { successResponse, errorResponse } from '@/lib/api/response';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth || !requireAdmin(auth)) {
      return errorResponse('FORBIDDEN', 'Admin privileges required', 403);
    }

    const { id } = await params;
    const [van, reports] = await Promise.all([
      getVanById(id),
      getReports({ van_id: id }),
    ]);

    if (!van) {
      return errorResponse('NOT_FOUND', 'Van not found', 404);
    }
    const last7Days = getLast7DaysIST();
    const monthRange = getCurrentMonthISTRange();

    // 1. Weekly collection
    const weekReports = reports.filter((r) => last7Days.includes(r.report_date));
    const weeklyCollection = weekReports.reduce((sum, r) => sum + r.total_collection, 0);

    // 2. Monthly collection
    const monthReports = reports.filter(
      (r) => r.report_date >= monthRange.start && r.report_date <= monthRange.end
    );
    const monthlyCollection = monthReports.reduce((sum, r) => sum + r.total_collection, 0);

    // 3. Total tests all-time & in month
    const totalTestsAllTime = reports.reduce((sum, r) => sum + r.total_tests, 0);
    const totalTestsMonth = monthReports.reduce((sum, r) => sum + r.total_tests, 0);

    // 4. Average daily collection
    const activeWorkingDays = reports.length || 1;
    const totalAllTimeCollection = reports.reduce((sum, r) => sum + r.total_collection, 0);
    const averageDailyCollection = roundTo2Decimals(totalAllTimeCollection / activeWorkingDays);

    // 5. Daily collection chart data (Last 14 days)
    const dailyChart = reports.slice(0, 14).reverse().map((r) => ({
      date: r.report_date,
      collection: r.total_collection,
      expenses: r.expenses,
      net: r.net_collection,
      tests: r.total_tests,
    }));

    return successResponse({
      van,
      metrics: {
        weekly_collection: roundTo2Decimals(weeklyCollection),
        monthly_collection: roundTo2Decimals(monthlyCollection),
        total_tests_all_time: totalTestsAllTime,
        total_tests_month: totalTestsMonth,
        average_daily_collection: averageDailyCollection,
        total_reports: reports.length,
      },
      chart_data: dailyChart,
      history: reports.slice(0, 30),
    });
  } catch (error: any) {
    return errorResponse('INTERNAL_ERROR', error.message, 500);
  }
}
