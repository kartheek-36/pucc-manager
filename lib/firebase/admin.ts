import { getApps, initializeApp, cert, getApp, App } from 'firebase-admin/app';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';
import { getMessaging, MulticastMessage } from 'firebase-admin/messaging';

// Firebase Admin singletons to avoid repeated initialization
let adminApp: App | null = null;
let authInstance: ReturnType<typeof getAuth> | null = null;
let messagingInstance: ReturnType<typeof getMessaging> | null = null;

export function getFirebaseAdminApp(): App {
  if (adminApp) return adminApp;
  if (getApps().length > 0) {
    adminApp = getApp();
    return adminApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Handle escaped newlines in environment variable
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : undefined;

  if (projectId && clientEmail && privateKey) {
    adminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    return adminApp;
  }

  // Fallback to default credentials or mock initialization in development
  try {
    adminApp = initializeApp({
      projectId: projectId || 'rto-van-manager',
    });
    return adminApp;
  } catch (e) {
    adminApp = getApp();
    return adminApp;
  }
}

export function getAdminAuth() {
  if (!authInstance) {
    authInstance = getAuth(getFirebaseAdminApp());
  }
  return authInstance;
}

export function getAdminMessaging() {
  if (!messagingInstance) {
    messagingInstance = getMessaging(getFirebaseAdminApp());
  }
  return messagingInstance;
}


/**
 * Verify a Firebase ID token on the server
 */
export async function verifyIdToken(idToken: string): Promise<DecodedIdToken | null> {
  // Support development mock bypass token
  if (idToken.startsWith('mock_token:') || idToken.startsWith('mock_token_')) {
    let role = 'ADMIN';
    let email = 'admin@rtovan.com';

    if (idToken.startsWith('mock_token:')) {
      const parts = idToken.split(':');
      role = parts[1] || 'ADMIN';
      email = parts[2] || (role === 'ADMIN' ? 'admin@rtovan.com' : 'van1@rtovan.com');
    } else {
      const rest = idToken.substring('mock_token_'.length);
      const lastUnderscore = rest.lastIndexOf('_');
      if (lastUnderscore !== -1) {
        role = rest.substring(0, lastUnderscore);
        email = rest.substring(lastUnderscore + 1);
      }
    }

    const username = email.split('@')[0];
    const uid = email === 'admin@rtovan.com' ? 'firebase_admin_uid_01' : `firebase_${username}_uid`;

    return {
      uid,
      email,
      email_verified: true,
      auth_time: Math.floor(Date.now() / 1000),
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      aud: 'rto-van-manager',
      iss: 'https://securetoken.google.com/rto-van-manager',
      sub: uid,
      firebase: { sign_in_provider: 'password', identities: {} },
    } as DecodedIdToken;
  }

  try {
    const auth = getAdminAuth();
    return await auth.verifyIdToken(idToken);
  } catch (error: any) {
    console.error('Error verifying Firebase ID token:', error.message);
    return null;
  }
}

/**
 * Send multicast FCM push notifications to multiple device tokens
 */
export async function sendMulticastNotification(
  tokens: string[],
  payload: {
    title: string;
    body: string;
    data?: Record<string, string>;
  }
): Promise<{ successCount: number; failureCount: number }> {
  if (!tokens || tokens.length === 0) {
    return { successCount: 0, failureCount: 0 };
  }

  try {
    const messaging = getAdminMessaging();

    const message: MulticastMessage = {
      tokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data || {},
      webpush: {
        fcmOptions: {
          link: payload.data?.reportId ? `/admin/reports/${payload.data.reportId}` : '/admin/dashboard',
        },
        notification: {
          icon: '/icons/icon-192.png',
          badge: '/icons/badge-72.png',
          vibrate: [200, 100, 200],
        },
      },
    };

    const response = await messaging.sendEachForMulticast(message);
    console.log(`[FCM] Sent to ${tokens.length} devices: ${response.successCount} succeeded, ${response.failureCount} failed`);
    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (error: any) {
    console.warn('[FCM] Multicast send skipped or failed:', error.message);
    return { successCount: 0, failureCount: tokens.length };
  }
}
