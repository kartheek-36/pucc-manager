import { NextRequest } from 'next/server';
import { verifyIdToken } from '../firebase/admin';
import { getUserByEmail, getUserByFirebaseUid, getUserById } from '../db';
import { User, Role } from '../../types';

export interface AuthContext {
  user: User;
  role: Role;
}

interface CachedSession {
  auth: AuthContext;
  expiresAt: number;
}

// In-memory fast cache for active sessions (60-second TTL)
// Drastically speeds up repeated API polling by eliminating redundant cryptographic verification & DB queries
const sessionCache = new Map<string, CachedSession>();
const CACHE_TTL_MS = 60 * 1000;

export function invalidateSessionCache(userId?: string) {
  if (!userId) {
    sessionCache.clear();
    return;
  }
  for (const [token, cached] of sessionCache.entries()) {
    if (cached.auth.user.id === userId) {
      sessionCache.delete(token);
    }
  }
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

  // Fast-path: Check memory session cache
  const now = Date.now();
  const cached = sessionCache.get(token);
  if (cached && cached.expiresAt > now) {
    return cached.auth;
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

  const authContext: AuthContext = {
    user,
    role: user.role,
  };

  // Cache valid session
  const tokenExpMs = decodedToken.exp ? decodedToken.exp * 1000 : now + CACHE_TTL_MS;
  const ttlMs = Math.min(CACHE_TTL_MS, Math.max(1000, tokenExpMs - now));
  sessionCache.set(token, {
    auth: authContext,
    expiresAt: now + ttlMs,
  });

  // Limit cache size to avoid unbounded memory usage
  if (sessionCache.size > 200) {
    const firstKey = sessionCache.keys().next().value;
    if (firstKey) sessionCache.delete(firstKey);
  }

  return authContext;
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
