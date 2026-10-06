import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/auth/session';
import { getDailyReportByVanAndDate, getVanById } from '@/lib/db';
import { getTodayISTDateString } from '@/lib/calculations/financial';
import { successResponse, errorResponse } from '@/lib/api/response';

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }

    const { searchParams } = new URL(req.url);
    const todayStr = searchParams.get('date') || getTodayISTDateString();
    let vanId = searchParams.get('van_id');

    if (auth.role === 'VAN_OPERATOR') {
      if (!auth.user.van_id) {
        return errorResponse('FORBIDDEN', 'No van assigned', 403);
      }
      vanId = auth.user.van_id;
    }

    if (!vanId) {
      return errorResponse('BAD_REQUEST', 'van_id parameter is required', 400);
    }

    const [report, van] = await Promise.all([
      getDailyReportByVanAndDate(vanId, todayStr),
      getVanById(vanId),
    ]);

    return successResponse({
      today_date: todayStr,
      van,
      report,
      has_submitted: !!report,
    });
  } catch (error: any) {
    return errorResponse('INTERNAL_ERROR', error.message, 500);
  }
}
