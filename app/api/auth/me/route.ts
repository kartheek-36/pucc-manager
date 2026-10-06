import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/auth/session';
import { successResponse, errorResponse } from '@/lib/api/response';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
    }

    return successResponse({
      user: auth.user,
      role: auth.role,
    });
  } catch (error: any) {
    return errorResponse('INTERNAL_ERROR', error.message, 500);
  }
}
