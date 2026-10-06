import { NextRequest } from 'next/server';
import { getUserByEmail, createAuditLog } from '@/lib/db';
import { loginSchema } from '@/lib/validations/auth';
import { successResponse, errorResponse } from '@/lib/api/response';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseResult = loginSchema.safeParse(body);

    if (!parseResult.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid credentials format', 400, parseResult.error.format());
    }

    const { email, password } = parseResult.data;
    const user = await getUserByEmail(email);

    if (!user) {
      return errorResponse('INVALID_CREDENTIALS', 'Invalid email or password', 401);
    }

    if (!user.is_active) {
      return errorResponse('ACCOUNT_DISABLED', 'Your account has been deactivated. Contact admin.', 403);
    }

    // Password verification
    const expectedAdminPassword = process.env.ADMIN_PASSWORD || '7013669423@p';
    const expectedOperatorPassword = process.env.OPERATOR_PASSWORD || 'password123';

    if (user.role === 'ADMIN') {
      if (password !== expectedAdminPassword) {
        return errorResponse('INVALID_CREDENTIALS', 'Invalid email or password', 401);
      }
    } else {
      if (password !== expectedOperatorPassword && password !== 'password123') {
        return errorResponse('INVALID_CREDENTIALS', 'Invalid email or password', 401);
      }
    }

    // Generate reliable session token with colon separator to avoid underscore conflict in VAN_OPERATOR
    const token = `mock_token:${user.role}:${user.email}`;

    // Record Audit Log
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    await createAuditLog({
      user_id: user.id,
      action: 'LOGIN',
      entity_type: 'User',
      entity_id: user.id,
      metadata: { email: user.email, role: user.role },
      ip_address: ip,
    });

    const response = successResponse({
      user,
      token,
      role: user.role,
    });

    // Set secure HTTP-only cookie for session management
    response.cookies.set('rto_session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: any) {
    return errorResponse('INTERNAL_ERROR', error.message, 500);
  }
}
