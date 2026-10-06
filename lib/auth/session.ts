import { NextRequest } from 'next/server';
import { verifyIdToken } from '../firebase/admin';
import { getUserByEmail, getUserByFirebaseUid, getUserById } from '../db';
import { User, Role } from '../../types';

export interface AuthContext {
  user: User;
  role: Role;
}

/**
 * Authenticate a request on the server via Bearer token or Cookie
 * Determines user identity and role solely on the server side!
 */
export async function authenticateRequest(req: Request | NextRequest): Promise<AuthContext | null> {
  let token: string | null = null;

  // 1. Check Authorization header
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }

  // 2. Fallback to cookie
  if (!token && 'cookies' in req) {
    const cookieToken = (req as NextRequest).cookies.get('rto_session_token')?.value;
    if (cookieToken) token = cookieToken;
  } else if (!token) {
    // Standard Request headers cookie parse
    const cookieHeader = req.headers.get('cookie');
    if (cookieHeader) {
      const match = cookieHeader.match(/rto_session_token=([^;]+)/);
      if (match) token = match[1];
    }
  }

  if (!token) {
    return null;
  }

  // 3. Verify token with Firebase Admin
  const decodedToken = await verifyIdToken(token);
  if (!decodedToken) {
    return null;
  }

  // 4. Fetch authoritative user from database using firebase_uid or email
  let user: User | null = null;
  if (decodedToken.uid) {
    user = await getUserByFirebaseUid(decodedToken.uid);
  }
  if (!user && decodedToken.email) {
    user = await getUserByEmail(decodedToken.email);
  }

  if (!user || !user.is_active) {
    return null;
  }

  return {
    user,
    role: user.role,
  };
}

/**
 * Require ADMIN role
 */
export function requireAdmin(auth: AuthContext | null): boolean {
  return auth !== null && auth.role === 'ADMIN';
}

/**
 * Check if the user is authorized to access a specific van
 * Admins can access all vans. Van operators can ONLY access their own van!
 */
export function canAccessVan(auth: AuthContext | null, vanId: string): boolean {
  if (!auth) return false;
  if (auth.role === 'ADMIN') return true;
  return auth.user.van_id === vanId;
}
