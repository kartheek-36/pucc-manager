import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/auth/session';
import { getNotifications } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api/response';

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get('unread') === 'true';

    const list = await getNotifications(auth.user.id, unreadOnly);
    const allNotifications = await getNotifications(auth.user.id, false);
    const unreadCount = allNotifications.filter((n) => !n.is_read).length;

    return successResponse({
      notifications: list,
      unreadCount,
    });
  } catch (error: any) {
    return errorResponse('INTERNAL_ERROR', error.message, 500);
  }
}
