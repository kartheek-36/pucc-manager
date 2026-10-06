import { NextRequest } from 'next/server';
import { successResponse } from '@/lib/api/response';

export async function POST(req: NextRequest) {
  const response = successResponse({ message: 'Logged out successfully' });
  response.cookies.delete('rto_session_token');
  return response;
}
