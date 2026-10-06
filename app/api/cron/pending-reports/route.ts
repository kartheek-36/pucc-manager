import { NextRequest } from 'next/server';
import { checkAndNotifyPendingReports } from '@/lib/notifications/service';
import { isPastISTDeadline, getTodayISTDateString } from '@/lib/calculations/financial';
import { successResponse, errorResponse } from '@/lib/api/response';

export async function GET(req: NextRequest) {
  return handleCron(req);
}

export async function POST(req: NextRequest) {
  return handleCron(req);
}

async function handleCron(req: NextRequest) {
  try {
    // 1. Verify CRON_SECRET for security
    const authHeader = req.headers.get('authorization');
    const { searchParams } = new URL(req.url);
    const querySecret = searchParams.get('secret');
    const bearerSecret = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const providedSecret = querySecret || bearerSecret;

    const expectedSecret = process.env.CRON_SECRET || 'rto_cron_secret_key_2026';

    if (providedSecret !== expectedSecret) {
      return errorResponse('UNAUTHORIZED', 'Invalid or missing cron secret', 401);
    }

    // Force run flag for testing or manual triggers
    const force = searchParams.get('force') === 'true';

    // 2. Check if current time in IST is past deadline (8:00 PM IST = 20:00)
    // Unless force=true is supplied
    if (!force && !isPastISTDeadline(20, 0)) {
      return successResponse({
        message: 'Deadline has not passed yet. Deadline is 8:00 PM IST (20:00).',
        current_date: getTodayISTDateString(),
        deadline: '20:00 IST',
        executed: false,
      });
    }

    // 3. Execute pending report check with deduplication
    const result = await checkAndNotifyPendingReports();

    return successResponse({
      message: 'Pending reports checked successfully',
      ...result,
      executed: true,
    });
  } catch (error: any) {
    return errorResponse('INTERNAL_ERROR', error.message, 500);
  }
}
