import { NextRequest } from 'next/server';
import { authenticateRequest, canAccessVan } from '@/lib/auth/session';
import { getReports, createDailyReport, getVanById, createAuditLog } from '@/lib/db';
import { dailyReportSchema } from '@/lib/validations/report';
import { calculateNetCollection, calculateTotalTests } from '@/lib/calculations/financial';
import { notifyAdminOnReportSubmission } from '@/lib/notifications/service';
import { successResponse, errorResponse } from '@/lib/api/response';
import { broadcastServerSync } from '@/lib/sync/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const requestedVanId = searchParams.get('van_id') || undefined;
    const status = searchParams.get('status') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined;

    // Security: Van operators can NEVER access other vans' reports!
    let targetVanId = requestedVanId;
    if (auth.role === 'VAN_OPERATOR') {
      if (!auth.user.van_id) {
        return errorResponse('FORBIDDEN', 'No van assigned to this operator', 403);
      }
      if (requestedVanId && requestedVanId !== auth.user.van_id) {
        return errorResponse('FORBIDDEN', 'Cannot access reports for another van', 403);
      }
      targetVanId = auth.user.van_id; // Strictly lock to own van
    }

    const reports = await getReports({
      van_id: targetVanId,
      startDate,
      endDate,
      status,
      limit,
    });

    return successResponse(reports);
  } catch (error: any) {
    return errorResponse('INTERNAL_ERROR', error.message, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }

    const body = await req.json();
    const parseResult = dailyReportSchema.safeParse(body);

    if (!parseResult.success) {
      return errorResponse('VALIDATION_ERROR', 'Report validation failed', 400, parseResult.error.format());
    }

    const reportData = parseResult.data;

    // Role check: Van operators can only submit for their assigned van
    if (auth.role === 'VAN_OPERATOR') {
      if (auth.user.van_id !== reportData.van_id) {
        return errorResponse('FORBIDDEN', 'You cannot submit reports for another van', 403);
      }
    }

    const van = await getVanById(reportData.van_id);
    if (!van) {
      return errorResponse('NOT_FOUND', 'Van not found', 404);
    }

    // Server-side authoritative financial calculation
    const totalTests = calculateTotalTests(
      reportData.petrol_tests,
      reportData.diesel_tests,
      reportData.other_tests
    );
    const netCollection = calculateNetCollection(
      reportData.total_collection,
      reportData.expenses
    );

    // Save in Database
    const createdReport = await createDailyReport({
      report_date: reportData.report_date,
      van_id: reportData.van_id,
      operator_id: auth.user.id,
      petrol_tests: reportData.petrol_tests,
      diesel_tests: reportData.diesel_tests,
      other_tests: reportData.other_tests,
      total_tests: totalTests,
      total_collection: reportData.total_collection,
      expenses: reportData.expenses,
      net_collection: netCollection,
      notes: reportData.notes,
      status: 'SUBMITTED',
    });

    // 1. Authoritative notification creation & audit logging in PostgreSQL
    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    try {
      await Promise.allSettled([
        notifyAdminOnReportSubmission({
          reportId: createdReport.id,
          vanId: van.id,
          vanNumber: van.van_number,
          operatorName: auth.user.name,
          totalCollection: createdReport.total_collection,
          totalTests: createdReport.total_tests,
          reportDate: createdReport.report_date,
        }),
        createAuditLog({
          user_id: auth.user.id,
          action: 'REPORT_SUBMITTED',
          entity_type: 'DailyReport',
          entity_id: createdReport.id,
          metadata: {
            vanId: van.id,
            vanNumber: van.van_number,
            totalCollection: createdReport.total_collection,
            totalTests: createdReport.total_tests,
            date: createdReport.report_date,
          },
          ip_address: clientIp,
        }),
      ]);
    } catch (postErr) {
      console.warn('[Reports API] Non-fatal notification/audit warning:', postErr);
    }

    // 2. Broadcast real-time synchronization event to all connected screens
    broadcastServerSync({
      type: 'REPORT_SUBMITTED',
      vanId: van.id,
      reportId: createdReport.id,
      reportDate: createdReport.report_date,
    });

    return successResponse(createdReport, 201);
  } catch (error: any) {
    if (
      error.message?.includes('already been submitted') ||
      error.code === 'P2002' ||
      error.message?.includes('Unique constraint')
    ) {
      return errorResponse('DUPLICATE_REPORT', 'A report for this van has already been submitted for this date', 409);
    }
    return errorResponse('INTERNAL_ERROR', error.message, 500);
  }
}
