import { NextRequest } from 'next/server';
import { successResponse } from '@/lib/api/response';
import { authenticateRequest, invalidateSessionCache } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (auth?.user?.id) {
      invalidateSessionCache(auth.user.id);
    }
  } catch {
    // Non-fatal, proceed with cookie deletion
  }

  const response = successResponse({ message: 'Logged out successfully' });
  response.cookies.delete('rto_session_token');
  return response;
}
