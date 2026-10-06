import { NextRequest } from 'next/server';
import { authenticateRequest, requireAdmin, invalidateSessionCache } from '@/lib/auth/session';
import { getVans, getReports, updateVan, createAuditLog } from '@/lib/db';
import {
  getTodayISTDateString,
  getLast7DaysIST,
  getCurrentMonthISTRange,
  roundTo2Decimals,
} from '@/lib/calculations/financial';
import { updateVanSchema } from '@/lib/validations/auth';
import { successResponse, errorResponse } from '@/lib/api/response';

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth || !requireAdmin(auth)) {
      return errorResponse('FORBIDDEN', 'Admin privileges required', 403);
    }

    const todayStr = getTodayISTDateString();
    const last7Days = getLast7DaysIST();
    const monthRange = getCurrentMonthISTRange();

    const [vans, allReports] = await Promise.all([
      getVans(),
      getReports({ startDate: monthRange.start }),
    ]);

    const vanSummaries = vans.map((van) => {
      const vanReports = allReports.filter((r) => r.van_id === van.id);

      // Today's Report
      const todayReport = vanReports.find((r) => r.report_date === todayStr);

      // Weekly Collection
      const weekReports = vanReports.filter((r) => last7Days.includes(r.report_date));
      const weeklyCollection = weekReports.reduce((sum, r) => sum + r.total_collection, 0);

      // Monthly Collection
      const monthReports = vanReports.filter(
        (r) => r.report_date >= monthRange.start && r.report_date <= monthRange.end
      );
      const monthlyCollection = monthReports.reduce((sum, r) => sum + r.total_collection, 0);

      // Last submitted report
      const lastReport = vanReports[0] || null;

      return {
        id: van.id,
        van_number: van.van_number,
        registration_number: van.registration_number,
        status: van.status,
        operator: van.operator
          ? {
              id: van.operator.id,
              name: van.operator.name,
              email: van.operator.email,
              phone: van.operator.phone,
            }
          : null,
        today_collection: todayReport ? todayReport.total_collection : 0,
        today_tests: todayReport ? todayReport.total_tests : 0,
        today_status: todayReport ? todayReport.status : 'PENDING',
        weekly_collection: roundTo2Decimals(weeklyCollection),
        monthly_collection: roundTo2Decimals(monthlyCollection),
        last_report_date: lastReport ? lastReport.report_date : null,
      };
    });

    return successResponse(vanSummaries);
  } catch (error: any) {
    return errorResponse('INTERNAL_ERROR', error.message, 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth || !requireAdmin(auth)) {
      return errorResponse('FORBIDDEN', 'Admin privileges required', 403);
    }

    const body = await req.json();
    const { id, registration_number, status, operator_id } = body;

    if (!id) {
      return errorResponse('BAD_REQUEST', 'Van id is required', 400);
    }

    const parseResult = updateVanSchema.safeParse({ registration_number, status, operator_id });
    if (!parseResult.success) {
      return errorResponse('VALIDATION_ERROR', 'Validation failed', 400, parseResult.error.format());
    }

    const updated = await updateVan(id, parseResult.data);
    if (!updated) {
      return errorResponse('NOT_FOUND', 'Van not found', 404);
    }

    invalidateSessionCache();

    await createAuditLog({
      user_id: auth.user.id,
      action: 'VAN_UPDATED',
      entity_type: 'Van',
      entity_id: id,
      metadata: { registration_number, status, operator_id },
      ip_address: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return successResponse(updated);
  } catch (error: any) {
    return errorResponse('INTERNAL_ERROR', error.message, 500);
  }
}
