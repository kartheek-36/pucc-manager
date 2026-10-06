import { NextRequest } from 'next/server';
import { authenticateRequest, requireAdmin } from '@/lib/auth/session';
import { getAdminDashboardMetrics } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api/response';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }

    if (!requireAdmin(auth)) {
      return errorResponse('FORBIDDEN', 'Admin privileges required', 403);
    }

    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get('date') || undefined;

    const data = await getAdminDashboardMetrics(dateStr);
    return successResponse(data);
  } catch (error: any) {
    return errorResponse('INTERNAL_ERROR', error.message, 500);
  }
}
