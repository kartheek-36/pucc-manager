import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/auth/session';
import { upsertDeviceToken } from '@/lib/db';
import { deviceTokenSchema } from '@/lib/validations/auth';
import { successResponse, errorResponse } from '@/lib/api/response';

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }

    const body = await req.json();
    const parseResult = deviceTokenSchema.safeParse(body);

    if (!parseResult.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid token payload', 400, parseResult.error.format());
    }

    const deviceToken = await upsertDeviceToken({
      user_id: auth.user.id,
      token: parseResult.data.token,
      platform: parseResult.data.platform,
    });

    return successResponse({
      message: 'Device token registered successfully',
      deviceToken,
    });
  } catch (error: any) {
    return errorResponse('INTERNAL_ERROR', error.message, 500);
  }
}
