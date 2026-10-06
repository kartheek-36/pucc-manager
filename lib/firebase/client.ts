import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getMessaging, Messaging, isSupported as isMessagingSupported } from 'firebase/messaging';
import { getAnalytics, Analytics, isSupported as isAnalyticsSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyCl0rR2mQp5URc6msI90_NHP8SD9uZTQS4',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'stfi-network.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'stfi-network',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'stfi-network.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '666799009288',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:666799009288:web:5f6497289653170be12bbd',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-K7T1L258W6',
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let analytics: Analytics | undefined;

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    if (getApps().length > 0) {
      app = getApp();
    } else {
      app = initializeApp(firebaseConfig);
    }
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
  }
  return auth;
}

export async function getFirebaseMessagingClient(): Promise<Messaging | null> {
  if (typeof window === 'undefined') return null;
  try {
    const supported = await isMessagingSupported();
    if (!supported) {
      console.warn('Firebase Messaging is not supported in this browser environment.');
      return null;
    }
    return getMessaging(getFirebaseApp());
  } catch (err) {
    console.warn('Failed to initialize Firebase Messaging:', err);
    return null;
  }
}

export async function getFirebaseAnalyticsClient(): Promise<Analytics | null> {
  if (typeof window === 'undefined') return null;
  try {
    const supported = await isAnalyticsSupported();
    if (!supported) return null;
    if (!analytics) {
      analytics = getAnalytics(getFirebaseApp());
    }
    return analytics;
  } catch (err) {
    console.warn('Firebase Analytics not initialized:', err);
    return null;
  }
}

export { firebaseConfig };
