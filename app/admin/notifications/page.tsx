'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { NotificationItem } from '@/types';
import { formatISTDateTime } from '@/lib/calculations/financial';
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  FileCheck2,
  ArrowRight,
  Smartphone,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { getFirebaseMessagingClient } from '@/lib/firebase/client';
import { getToken } from 'firebase/messaging';

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(true);
  const [enablingPush, setEnablingPush] = useState(false);
  const { toast } = useToast();

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/notifications?unread=${tab === 'unread'}`);
      const json = await res.json();
      if (json.success) {
        setNotifications(json.data.notifications);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [tab]);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (json.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        );
        toast('Marked as read', 'info');
      }
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
      const json = await res.json();
      if (json.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        toast('All notifications marked as read', 'success');
      }
    } catch {}
  };

  const handleEnablePush = async () => {
    setEnablingPush(true);
    try {
      if (typeof window === 'undefined' || !('Notification' in window)) {
        toast('Browser notifications not supported on this browser', 'info');
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const messaging = await getFirebaseMessagingClient();
        if (messaging) {
          const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
          const token = await getToken(messaging, { vapidKey: vapidKey || undefined });
          if (token) {
            await fetch('/api/device-token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token, platform: 'web' }),
            });
            toast('Push notifications enabled and registered with PostgreSQL!', 'success');
          } else {
            toast('Notification permission enabled!', 'success');
          }
        } else {
          toast('Notification permission granted!', 'success');
        }
      } else {
        toast('Notification permission was denied in browser settings', 'error');
      }
    } catch (err: any) {
      toast('Could not configure push notifications: ' + err.message, 'info');
    } finally {
      setEnablingPush(false);
    }
  };

  return (
    <AdminLayout adminName="Venkateswara Rao">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#111827]">
              Alerts & Notifications
            </h1>
            <p className="text-xs text-[#6B7280]">
              Real-time submission reports, deadlines, and pending van notices
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleEnablePush}
              disabled={enablingPush}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8] font-semibold text-xs hover:bg-blue-100 transition-colors"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Enable Browser Push</span>
            </button>

            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFFFFF] border border-[#E7E9ED] text-[#111827] font-semibold text-xs hover:bg-[#F7F8FA] transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5 text-[#16A34A]" />
              <span>Mark All Read</span>
            </button>
          </div>
        </div>

        {/* Tab Filter */}
        <div className="flex items-center gap-1 bg-[#F7F8FA] p-1 rounded-lg border border-[#E7E9ED] w-fit text-xs font-medium">
          <button
            onClick={() => setTab('all')}
            className={`px-3 py-1 rounded-md transition-colors ${
              tab === 'all'
                ? 'bg-[#FFFFFF] text-[#1D4ED8] font-semibold shadow-xs border border-[#E7E9ED]'
                : 'text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            All Notifications
          </button>
          <button
            onClick={() => setTab('unread')}
            className={`px-3 py-1 rounded-md transition-colors ${
              tab === 'unread'
                ? 'bg-[#FFFFFF] text-[#1D4ED8] font-semibold shadow-xs border border-[#E7E9ED]'
                : 'text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            Unread
          </button>
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-[#F3F4F6] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-[#FFFFFF] rounded-xl p-8 border border-[#E7E9ED] text-center">
            <Bell className="w-8 h-8 text-[#6B7280] mx-auto mb-2" />
            <p className="text-sm font-semibold text-[#111827]">
              No notifications
            </p>
            <p className="text-xs text-[#6B7280] mt-0.5">
              New alerts will appear here when vans submit reports.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {notifications.map((item) => {
              const isPending = item.type === 'DAILY_REPORT_PENDING';
              const reportId = item.metadata?.reportId;

              return (
                <div
                  key={item.id}
                  className={`bg-[#FFFFFF] rounded-xl p-4 border transition-colors shadow-xs ${
                    !item.is_read
                      ? 'border-[#BFDBFE] bg-[#EFF6FF]/40'
                      : 'border-[#E7E9ED]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-lg shrink-0 flex items-center justify-center ${
                        isPending
                          ? 'bg-amber-50 text-[#F59E0B] border border-amber-200'
                          : 'bg-emerald-50 text-[#16A34A] border border-emerald-200'
                      }`}
                    >
                      {isPending ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : (
                        <FileCheck2 className="w-4 h-4" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold text-sm text-[#111827]">
                          {item.title}
                        </h3>
                        <span className="text-[10px] text-[#6B7280] whitespace-nowrap">
                          {formatISTDateTime(item.created_at)}
                        </span>
                      </div>

                      <p className="text-xs text-[#6B7280] mt-1 whitespace-pre-line">
                        {item.message}
                      </p>

                      <div className="flex items-center gap-3 mt-3 pt-2 border-t border-[#E7E9ED]">
                        {reportId && (
                          <Link
                            href={`/admin/reports/${reportId}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#1D4ED8] hover:underline"
                          >
                            <span>Inspect Report</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        )}

                        {!item.is_read && (
                          <button
                            onClick={(e) => handleMarkAsRead(item.id, e)}
                            className="text-xs font-medium text-[#6B7280] hover:text-[#111827] ml-auto"
                          >
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
