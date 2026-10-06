import { NextRequest } from 'next/server';
import { authenticateRequest, requireAdmin } from '@/lib/auth/session';
import { getAllUsers, updateUser, createUser, createAuditLog } from '@/lib/db';
import { updateUserSchema, createUserSchema } from '@/lib/validations/auth';
import { successResponse, errorResponse } from '@/lib/api/response';

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth || !requireAdmin(auth)) {
      return errorResponse('FORBIDDEN', 'Admin privileges required', 403);
    }

    const users = await getAllUsers();
    return successResponse(users);
  } catch (error: any) {
    return errorResponse('INTERNAL_ERROR', error.message, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth || !requireAdmin(auth)) {
      return errorResponse('FORBIDDEN', 'Admin privileges required', 403);
    }

    const body = await req.json();
    const parseResult = createUserSchema.safeParse(body);
    if (!parseResult.success) {
      return errorResponse('VALIDATION_ERROR', 'Validation failed', 400, parseResult.error.format());
    }

    const created = await createUser(parseResult.data);

    await createAuditLog({
      user_id: auth.user.id,
      action: 'USER_CREATED',
      entity_type: 'User',
      entity_id: created.id,
      metadata: parseResult.data,
      ip_address: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return successResponse(created, 201);
  } catch (error: any) {
    return errorResponse('INTERNAL_ERROR', error.message, 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth || !requireAdmin(auth)) {
      return errorResponse('FORBIDDEN', 'Admin privileges required', 403);
    }

    const body = await req.json();
    const { id, name, phone, is_active, van_id } = body;

    if (!id) {
      return errorResponse('BAD_REQUEST', 'User id is required', 400);
    }

    const parseResult = updateUserSchema.safeParse({ name, phone, is_active, van_id });
    if (!parseResult.success) {
      return errorResponse('VALIDATION_ERROR', 'Validation failed', 400, parseResult.error.format());
    }

    const updated = await updateUser(id, parseResult.data);
    if (!updated) {
      return errorResponse('NOT_FOUND', 'User not found', 404);
    }

    await createAuditLog({
      user_id: auth.user.id,
      action: 'USER_UPDATED',
      entity_type: 'User',
      entity_id: id,
      metadata: parseResult.data,
      ip_address: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return successResponse(updated);
  } catch (error: any) {
    return errorResponse('INTERNAL_ERROR', error.message, 500);
  }
}

