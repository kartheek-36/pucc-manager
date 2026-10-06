import { NextRequest } from 'next/server';
import { authenticateRequest, requireAdmin } from '@/lib/auth/session';
import { getAdminDashboardMetrics, checkPrismaConnection, getLastDbError } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api/response';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const reqStart = Date.now();
  const requestId = req.headers.get('x-request-id') || `req_${reqStart}_${Math.random().toString(36).substring(2, 6)}`;
  const reason = req.headers.get('x-sync-trigger') || 'initial';

  try {
    const auth = await authenticateRequest(req);
    if (!auth) {
      console.warn(`[DIAGNOSTIC] ${requestId} 401 UNAUTHORIZED trigger=${reason}`);
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401, undefined, {
        'X-Request-Id': requestId,
      });
    }

    if (!requireAdmin(auth)) {
      console.warn(`[DIAGNOSTIC] ${requestId} 403 FORBIDDEN trigger=${reason} user=${auth.user.id}`);
      return errorResponse('FORBIDDEN', 'Admin privileges required', 403, undefined, {
        'X-Request-Id': requestId,
      });
    }

    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get('date') || undefined;

    const data = await getAdminDashboardMetrics(dateStr);
    const isDbConnected = await checkPrismaConnection();
    const lastDbErr = getLastDbError();
    const durationMs = Date.now() - reqStart;

    console.log(`[DIAGNOSTIC] ${requestId} 200 OK`, {
      timestamp: new Date().toISOString(),
      reason,
      businessDate: data.today.date,
      adminId: auth.user.id,
      databaseSource: isDbConnected ? 'PostgreSQL' : 'MemoryStoreFallback',
      databaseError: lastDbErr || 'none',
      todayCollection: data.today.total_collection,
      submittedReports: data.today.submitted_reports,
      pendingReports: data.today.pending_reports,
      vanReports: data.van_performance.map((v) => ({
        van: v.van_number,
        status: v.report_status,
        collection: v.collection,
        reportId: v.report_id,
      })),
      durationMs,
    });

    const sanitizedDbErr = (lastDbErr || 'none').replace(/[\r\n]+/g, ' ').substring(0, 100);

    return successResponse(data, 200, {
      'X-Request-Id': requestId,
      'X-DB-Source': isDbConnected ? 'PostgreSQL' : 'MemoryStoreFallback',
      'X-DB-Error': sanitizedDbErr,
    });
  } catch (error: any) {
    console.error(`[DIAGNOSTIC] ${requestId} 500 INTERNAL_ERROR`, error);
    return errorResponse('INTERNAL_ERROR', error.message, 500, undefined, {
      'X-Request-Id': requestId,
    });
  }
}
