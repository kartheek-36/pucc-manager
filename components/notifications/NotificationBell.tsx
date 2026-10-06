'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { getFirebaseMessagingClient } from '@/lib/firebase/client';
import { getToken } from 'firebase/messaging';
import { useToast } from '@/components/ui/Toast';
import { useSyncListener } from '@/lib/sync/client';

export function NotificationBell({ className = '' }: { className?: string }) {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isSupported, setIsSupported] = useState(false);
  const { toast } = useToast();

  const inFlightRef = React.useRef(false);

  const fetchUnreadCount = React.useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const res = await fetch('/api/notifications?unread=true', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setUnreadCount(data.data.unreadCount || 0);
      }
    } catch (e) {
      // Quiet fail
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  // Real-time synchronization on reports, mark-read, and active visibility
  useSyncListener(() => {
    fetchUnreadCount();
  }, { intervalMs: 6000 });

  // Check if browser notifications are supported
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setIsSupported(true);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast('Notifications are not supported in this browser.', 'info');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const messaging = await getFirebaseMessagingClient();
        if (messaging) {
          const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
          const token = await getToken(messaging, {
            vapidKey: vapidKey || undefined,
          });

          if (token) {
            // Save token to PostgreSQL backend
            await fetch('/api/device-token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token, platform: 'web' }),
            });
            toast('Push notifications enabled for this device!', 'success');
          }
        } else {
          toast('Notification permission granted.', 'success');
        }
      } else {
        toast('Push notifications were blocked or dismissed.', 'info');
      }
    } catch (error: any) {
      console.warn('FCM registration error:', error);
      toast('Could not register push notifications.', 'info');
    }
  };

  return (
    <div className={`relative flex items-center ${className}`}>
      <Link
        href="/admin/notifications"
        className="relative p-2 rounded-lg text-[#6B7280] hover:text-[#111827] hover:bg-[#F7F8FA] transition-colors"
        aria-label="View Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-4 h-4 px-1 text-[10px] font-bold text-white bg-[#DC2626] rounded-full border border-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Link>
    </div>
  );
}
