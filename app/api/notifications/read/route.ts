import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/auth/session';
import { markNotificationRead, markAllNotificationsRead } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api/response';

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }

    const body = await req.json();

    if (body.markAll) {
      const count = await markAllNotificationsRead(auth.user.id);
      return successResponse({ count, message: 'All notifications marked as read' });
    }

    if (!body.id) {
      return errorResponse('BAD_REQUEST', 'Notification id is required', 400);
    }

    const success = await markNotificationRead(body.id, auth.user.id);
    return successResponse({ success });
  } catch (error: any) {
    return errorResponse('INTERNAL_ERROR', error.message, 500);
  }
}
