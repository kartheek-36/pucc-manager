import { NextRequest } from 'next/server';
import { authenticateRequest, requireAdmin } from '@/lib/auth/session';
import { getAuditLogs } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api/response';

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth || !requireAdmin(auth)) {
      return errorResponse('FORBIDDEN', 'Admin privileges required', 403);
    }

    const { searchParams } = new URL(req.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 100;

    const logs = await getAuditLogs(limit);
    return successResponse(logs);
  } catch (error: any) {
    return errorResponse('INTERNAL_ERROR', error.message, 500);
  }
}
