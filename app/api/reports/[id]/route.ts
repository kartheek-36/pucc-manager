import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/auth/session';
import { getDailyReport, updateDailyReport, getVanById, createAuditLog } from '@/lib/db';
import { calculateNetCollection, calculateTotalTests, getTodayISTDateString } from '@/lib/calculations/financial';
import { notifyAdminOnReportSubmission } from '@/lib/notifications/service';
import { successResponse, errorResponse } from '@/lib/api/response';
import { broadcastServerSync } from '@/lib/sync/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }

    const { id } = await params;
    const report = await getDailyReport(id);

    if (!report) {
      return errorResponse('NOT_FOUND', 'Report not found', 404);
    }

    // Role check
    if (auth.role === 'VAN_OPERATOR' && auth.user.van_id !== report.van_id) {
      return errorResponse('FORBIDDEN', 'Access denied to this report', 403);
    }

    return successResponse(report);
  } catch (error: any) {
    return errorResponse('INTERNAL_ERROR', error.message, 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }

    const { id } = await params;
    const existing = await getDailyReport(id);

    if (!existing) {
      return errorResponse('NOT_FOUND', 'Report not found', 404);
    }

    const body = await req.json();
    const todayStr = getTodayISTDateString();

    // Van Operator permissions:
    // Can only edit their own report for today, and only if not approved/locked!
    if (auth.role === 'VAN_OPERATOR') {
      if (auth.user.van_id !== existing.van_id) {
        return errorResponse('FORBIDDEN', 'Cannot modify another van\'s report', 403);
      }
      if (existing.status === 'APPROVED') {
        return errorResponse('LOCKED', 'This report has been approved and cannot be edited', 403);
      }
      if (existing.report_date !== todayStr) {
        return errorResponse('LOCKED', 'Only today\'s report can be edited by an operator', 403);
      }
    }

    const updatePayload: any = {};

    if (body.petrol_tests !== undefined || body.diesel_tests !== undefined || body.other_tests !== undefined) {
      const petrol = body.petrol_tests ?? existing.petrol_tests;
      const diesel = body.diesel_tests ?? existing.diesel_tests;
      const other = body.other_tests ?? existing.other_tests;
      updatePayload.petrol_tests = petrol;
      updatePayload.diesel_tests = diesel;
      updatePayload.other_tests = other;
      updatePayload.total_tests = calculateTotalTests(petrol, diesel, other);
    }

    if (body.total_collection !== undefined || body.expenses !== undefined) {
      const col = body.total_collection ?? existing.total_collection;
      const exp = body.expenses ?? existing.expenses;
      updatePayload.total_collection = col;
      updatePayload.expenses = exp;
      updatePayload.net_collection = calculateNetCollection(col, exp);
    }

    if (body.notes !== undefined) {
      updatePayload.notes = body.notes;
    }

    // Status can only be changed by Admin (APPROVED / REJECTED)
    if (body.status && auth.role === 'ADMIN') {
      updatePayload.status = body.status;
    }

    const updated = await updateDailyReport(id, updatePayload);

    // Audit logging
    const action = body.status === 'APPROVED'
      ? 'REPORT_APPROVED'
      : body.status === 'REJECTED'
      ? 'REPORT_REJECTED'
      : 'REPORT_UPDATED';

    await createAuditLog({
      user_id: auth.user.id,
      action,
      entity_type: 'DailyReport',
      entity_id: id,
      metadata: { changes: updatePayload },
      ip_address: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    if (action === 'REPORT_UPDATED' && updated) {
      try {
        const van = await getVanById(updated.van_id);
        if (van) {
          await notifyAdminOnReportSubmission({
            reportId: updated.id,
            vanId: van.id,
            vanNumber: van.van_number,
            operatorName: auth.user.name,
            totalCollection: updated.total_collection,
            totalTests: updated.total_tests,
            reportDate: updated.report_date,
          });
        }
      } catch (e) {
        console.warn('[Reports ID API] Non-fatal notification warning:', e);
      }
    }

    if (updated) {
      broadcastServerSync({
        type: 'REPORT_UPDATED',
        vanId: updated.van_id,
        reportId: updated.id,
        reportDate: updated.report_date,
      });
    }

    return successResponse(updated);
  } catch (error: any) {
    return errorResponse('INTERNAL_ERROR', error.message, 500);
  }
}

