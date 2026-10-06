import { NextResponse } from 'next/server';

const NO_CACHE_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

export function successResponse<T>(
  data: T,
  status = 200,
  customHeaders?: Record<string, string>
) {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    {
      status,
      headers: {
        ...NO_CACHE_HEADERS,
        ...(customHeaders || {}),
      },
    }
  );
}

export function errorResponse(
  code: string,
  message: string,
  status = 400,
  details?: any,
  customHeaders?: Record<string, string>
) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
    },
    {
      status,
      headers: {
        ...NO_CACHE_HEADERS,
        ...(customHeaders || {}),
      },
    }
  );
}
